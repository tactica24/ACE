import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorIntakeAdmin, { type CreatorIntentRow } from '@/components/CreatorIntakeAdmin';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function CreatorIntakePage() {
  await requireAdminUser('/admin/intake');

  const users = await prisma.user.findMany({
    where: { signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED', role: 'USER' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      creatorAccessStatus: true,
      createdAt: true,
      creator: {
        select: {
          address: true,
          idCardNumber: true,
          idCardUrl: true,
          bankName: true,
          bankAccountNumber: true,
          emailVerified: true
        }
      }
    }
  });

  const initialUsers: CreatorIntentRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    creatorAccessStatus: user.creatorAccessStatus,
    joinedAt: user.createdAt.toISOString().slice(0, 10),
    emailVerified: user.creator?.emailVerified ?? false,
    creatorProfile: user.creator
      ? {
          address: user.creator.address,
          idCardNumber: user.creator.idCardNumber,
          idCardUrl: user.creator.idCardUrl,
          bankName: user.creator.bankName,
          bankAccountNumber: user.creator.bankAccountNumber
        }
      : null
  }));

  return (
    <DashboardShell
      title="Producer intake"
      description="Review completed producer onboarding profiles, correct any mistakes, and approve studio access once."
      sideNav={
        <SideNav
          active="/admin/intake"
          items={getAdminNavItems({ creatorRequests: initialUsers.length })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#producer-intake">Review applicants</a>
          <a className="btn btn-ghost" href="/admin/users">All accounts</a>
          <a className="btn btn-ghost" href="/admin/support">Support inbox</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Pending applicants</span>
          <strong>{initialUsers.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Email verified</span>
          <strong>{initialUsers.filter((user) => user.emailVerified).length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Missing bank details</span>
          <strong>{initialUsers.filter((user) => !user.creatorProfile?.bankAccountNumber).length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Missing ID record</span>
          <strong>{initialUsers.filter((user) => !user.creatorProfile?.idCardNumber).length}</strong>
        </div>
      </div>
      <div id="producer-intake">
        <CreatorIntakeAdmin initialUsers={initialUsers} />
      </div>
    </DashboardShell>
  );
}
