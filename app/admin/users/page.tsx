import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorVerificationAdmin, { type CreatorRow } from '@/components/CreatorVerificationAdmin';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type UserWithCreator = {
  id: string;
  email: string;
  phone: string;
  role: string;
  createdAt: Date;
  creator: CreatorRow['creator'];
};

export default async function UsersPage() {
  let users: UserWithCreator[] = [];
  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { creator: true }
    });
  } catch {
    users = [];
  }

  const initialUsers: CreatorRow[] = users.map((user: UserWithCreator) => ({
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    joinedAt: user.createdAt.toISOString().slice(0, 10),
    creator: user.creator
      ? {
          displayName: user.creator.displayName,
          phoneVerified: user.creator.phoneVerified,
          emailVerified: user.creator.emailVerified,
          ninVerified: user.creator.ninVerified,
          idVerified: user.creator.idVerified,
          bankVerified: user.creator.bankVerified,
          verified: user.creator.verified,
          ninNumber: user.creator.ninNumber,
          idCardUrl: user.creator.idCardUrl,
          bankName: user.creator.bankName,
          bankAccountName: user.creator.bankAccountName,
          bankAccountNumber: user.creator.bankAccountNumber,
          reliabilityNotes: user.creator.reliabilityNotes
        }
      : null
  }));

  return (
    <DashboardShell
      title="User directory"
      description="Manage roles, creator verification readiness, and account access across Ace Studio."
      sideNav={
        <SideNav
          active="/admin/users"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/node', label: 'Node monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <CreatorVerificationAdmin initialUsers={initialUsers} />
    </DashboardShell>
  );
}
