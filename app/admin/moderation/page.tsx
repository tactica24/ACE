import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import ModerationQueue, { type ModerationQueueItem } from '@/components/ModerationQueue';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  let queueItems: ModerationQueueItem[] = [];
  try {
    const items = await prisma.moderationItem.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { video: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    queueItems = items.map((item) => ({
      id: item.id,
      status: item.status,
      notes: item.notes,
      video: {
        id: item.video.id,
        title: item.video.title,
        description: item.video.description,
        category: item.video.category,
        status: item.video.status
      }
    }));
  } catch {
    queueItems = [];
  }

  return (
    <DashboardShell
      title="Moderation Queue"
      description="Review uploads, approve releases, and remove films from production with audit reasons."
      sideNav={
        <SideNav
          active="/admin/moderation"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation', count: `${queueItems.length}` },
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
