import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import ModerationQueue from '@/components/ModerationQueue';

export default async function ModerationPage() {
  const items = await prisma.moderationItem.findMany({
    where: { status: 'PENDING' },
    include: { video: true }
  });
  const queueItems = items.map((item) => ({
    id: item.id,
    status: item.status,
    video: {
      id: item.video.id,
      title: item.video.title,
      description: item.video.description
    }
  }));

  return (
    <DashboardShell
      title="Moderation Queue"
      description="Review uploads for rights, quality, and copyright integrity."
      sideNav={
        <SideNav
          active="/admin/moderation"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation', count: `${items.length}` },
            { href: '/admin/node', label: 'Node Monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <ModerationQueue initial={queueItems} />
    </DashboardShell>
  );
}




