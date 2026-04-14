import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorVerificationAdmin, { type CreatorRow } from '@/components/CreatorVerificationAdmin';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type UserWithCreator = {
  id: string;
  name: string | null;
  email: string;
  phone: string;
  role: string;
  signupIntent: string;
  creatorAccessStatus: string;
  createdAt: Date;
  creator: CreatorRow['creator'];
};

export default async function UsersPage() {
  await requireAdminUser('/admin/users');

  let users: UserWithCreator[] = [];
  let openSupport = 0;
  let creatorRequests = 0;
  try {
    [users, openSupport, creatorRequests] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 80,
        include: { creator: true }
      }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED', role: 'USER' } })
    ]);
  } catch {
    users = [];
    openSupport = 0;
    creatorRequests = 0;
  }

  const initialUsers: CreatorRow[] = users.map((user: UserWithCreator) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    signupIntent: user.signupIntent,
    creatorAccessStatus: user.creatorAccessStatus,
    joinedAt: user.createdAt.toISOString().slice(0, 10),
    creator: user.creator
      ? {
          displayName: user.creator.displayName,
          creatorNumber: user.creator.creatorNumber,
          earningsBalanceNaira: user.creator.earningsBalanceNaira,
          phoneVerified: user.creator.phoneVerified,
          emailVerified: user.creator.emailVerified,
          ninVerified: user.creator.ninVerified,
          idVerified: user.creator.idVerified,
          bankVerified: user.creator.bankVerified,
          verified: user.creator.verified,
          address: user.creator.address,
          idCardNumber: user.creator.idCardNumber,
          idCardUrl: user.creator.idCardUrl,
          bankName: user.creator.bankName,
          bankAccountName: user.creator.bankAccountName,
          bankAccountNumber: user.creator.bankAccountNumber
        }
      : null
  }));

  return (
    <DashboardShell
      title="User directory"
      description="Manage roles, producer approvals, and account corrections across Ace Studio."
      sideNav={
        <SideNav
          active="/admin/users"
          items={getAdminNavItems({ creatorRequests, openSupport })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="/admin/upload#create-producer">Create producer</a>
          <a className="btn btn-ghost" href="#account-directory">Account directory</a>
          <a className="btn btn-ghost" href="/admin/intake">Producer approvals</a>
          <a className="btn btn-ghost" href="/admin/support">Support inbox</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Accounts loaded</span>
          <strong>{initialUsers.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Producer profiles</span>
          <strong>{initialUsers.filter((user) => user.creator).length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending producer approvals</span>
          <strong>{creatorRequests}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Open support cases</span>
          <strong>{openSupport}</strong>
        </div>
      </div>

      <div id="account-directory">
        <CreatorVerificationAdmin initialUsers={initialUsers} />
      </div>
    </DashboardShell>
  );
}
