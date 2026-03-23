import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import ModerationQueue, { type ModerationQueueItem } from '@/components/ModerationQueue';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  let queueItems: ModerationQueueItem[] = [];
  try {
    const items = await prisma.moderationItem.findMany({
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: { video: { include: { creator: { include: { creator: true } } } } },
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
        status: item.video.status,
        videoType: item.video.videoType,
        ageRating: item.video.ageRating,
        rightsTier: item.video.rightsTier,
        priceTier: item.video.priceTier,
        posterKey: item.video.posterKey,
        createdAt: item.video.createdAt.toISOString(),
        creatorName: item.video.creator.creator?.displayName ?? item.video.creator.email
      }
    }));
  } catch {
    queueItems = [];
  }

  return (
    <DashboardShell
      title="Moderation queue"
      description="Review titles with the same poster, pricing, and metadata that viewers will see after approval."
      sideNav={
        <SideNav
          active="/admin/moderation"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation', count: `${queueItems.length}` },
            { href: '/admin/node', label: 'Node monitor' },
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
