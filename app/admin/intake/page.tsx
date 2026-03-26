import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorIntakeAdmin, { type CreatorIntentRow } from '@/components/CreatorIntakeAdmin';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function CreatorIntakePage() {
  await requireAdminUser('/admin/intake');

  const baseUrl = env.ACE_APP_BASE_URL;
  const users = await prisma.user.findMany({
    where: { signupIntent: 'CREATOR' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      creatorAccessStatus: true,
      createdAt: true
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
    onboardingLink: `${baseUrl}/studio/onboarding`
  }));

  return (
    <DashboardShell
      title="Creator intake"
      description="Review film creator signups, unlock onboarding when ready, and email the creator directly with the next step."
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
