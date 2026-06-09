import AdminDisclosureSection from '@/components/AdminDisclosureSection';
import AdminCreateProducerForm from '@/components/AdminCreateProducerForm';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AdminUploadWorkspace from '@/components/AdminUploadWorkspace';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminUploadPage({
  searchParams
}: {
  searchParams?: {
    producerId?: string | string[];
  };
}) {
  await requireAdminUser('/admin/upload');
  const requestedProducerId =
    typeof searchParams?.producerId === 'string'
      ? searchParams.producerId.trim()
      : Array.isArray(searchParams?.producerId)
        ? searchParams.producerId[0]?.trim() ?? ''
        : '';

  const [producers] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { role: 'CREATOR' },
          { signupIntent: 'CREATOR' },
          { creator: { isNot: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 120,
      select: {
        id: true,
        email: true,
        creator: {
          select: {
            displayName: true,
            creatorNumber: true,
            verified: true
          }
        }
      }
    })
  ]);

  return (
    <DashboardShell
      title="Admin title desk"
      description="Create titles on behalf of producers with one Bunny-first intake flow: posters and SRT files go to Bunny Storage, while trailers and full movies go directly to Bunny Stream."
      sideNav={
        <SideNav
          active="/admin/upload"
          items={getAdminNavItems()}
        />
      }
    >
      <div id="create-producer">
        <AdminDisclosureSection
          title="Create approved producer"
          description="Create a producer record directly from admin when the rights holder has not signed up yet, then go straight into upload under that producer ID."
          badge="Producer setup"
          defaultOpen={!producers.length}
        >
          <AdminCreateProducerForm />
        </AdminDisclosureSection>
      </div>

      <AdminDisclosureSection
        title="Title workspace"
        description="Choose a producer, enter the basic movie details, and upload the poster, trailer, movie, and subtitle files from one page."
        badge="Create"
        defaultOpen
      >
        <AdminUploadWorkspace
          producers={producers.map((producer) => ({
            id: producer.id,
            email: producer.email,
            displayName: producer.creator?.displayName ?? producer.email,
            creatorNumber: producer.creator?.creatorNumber ?? null,
            verified: producer.creator?.verified ?? false
          }))}
          initialProducerId={requestedProducerId || null}
        />
      </AdminDisclosureSection>
    </DashboardShell>
  );
}
