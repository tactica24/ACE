import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorIntakeAdmin, { type CreatorIntentRow } from '@/components/CreatorIntakeAdmin';
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
      phone: true,
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
    phone: user.phone,
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
      title="Creator intake"
      description="Review completed creator onboarding profiles, correct any mistakes, and approve studio access once."
      sideNav={
        <SideNav
          active="/admin/intake"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <CreatorIntakeAdmin initialUsers={initialUsers} />
    </DashboardShell>
  );
}
