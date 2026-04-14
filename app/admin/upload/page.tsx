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

  const [producers, seriesOptions] = await Promise.all([
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
    }),
    prisma.video.findMany({
      where: {
        videoType: 'SERIES',
        seriesId: null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { episodes: true }
        }
      }
    })
  ]);

  return (
    <DashboardShell
      title="Admin upload desk"
      description="Upload titles on behalf of producers, attach the correct rights holder, and keep catalog reporting tied to the proper producer record."
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
        title="Upload workspace"
        description="Choose a producer and expand the full upload form only when you are ready to create or add titles."
        badge="Upload"
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
          seriesOptions={seriesOptions.map((series) => ({
            id: series.id,
            creatorId: series.creatorId,
            title: series.title,
            status: series.status,
            priceTier: series.priceTier,
            rightsTier: series.rightsTier,
            category: series.category,
            ageRating: series.ageRating,
            originalLanguage: series.originalLanguage,
            audioLanguages: series.audioLanguages,
            releaseYear: series.releaseYear,
            episodeCount: series._count.episodes
          }))}
          initialProducerId={requestedProducerId || null}
        />
      </AdminDisclosureSection>
    </DashboardShell>
  );
}
