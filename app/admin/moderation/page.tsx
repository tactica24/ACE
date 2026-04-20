import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import ModerationQueue, { type ModerationQueueItem } from '@/components/ModerationQueue';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  await requireAdminUser('/admin/moderation');

  let queueItems: ModerationQueueItem[] = [];
  try {
    const [items, orphanApprovedVideos] = await Promise.all([
      prisma.moderationItem.findMany({
        where: { status: { in: ['PENDING', 'APPROVED'] } },
        include: {
          video: {
            include: {
              creator: { include: { creator: true } },
              technicalMetadata: {
                select: {
                  trailerKey: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.video.findMany({
        where: {
          status: 'APPROVED',
          moderation: { is: null }
        },
        include: {
          creator: {
            include: { creator: true }
          },
          technicalMetadata: {
            select: {
              trailerKey: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    queueItems = [
      ...items.map((item) => ({
        id: item.id,
        hasModerationRecord: true,
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
          originalLanguage: item.video.originalLanguage,
          genres: item.video.genres,
          contentWarnings: item.video.contentWarnings,
          posterKey: item.video.posterKey,
          trailerDownloadHref: item.video.technicalMetadata?.trailerKey
            ? `/api/admin/videos/${item.video.id}/trailer`
            : null,
          createdAt: item.video.createdAt.toISOString(),
          creatorName: item.video.creator.creator?.displayName ?? item.video.creator.email
        }
      })),
      ...orphanApprovedVideos.map((video) => ({
        id: `video-${video.id}`,
        hasModerationRecord: false,
        status: 'APPROVED',
        notes: 'Approved title without moderation record. Remove it from catalog here if it is only sample data.',
        video: {
          id: video.id,
          title: video.title,
          description: video.description,
          category: video.category,
          status: video.status,
          videoType: video.videoType,
          ageRating: video.ageRating,
          rightsTier: video.rightsTier,
          priceTier: video.priceTier,
          originalLanguage: video.originalLanguage,
          genres: video.genres,
          contentWarnings: video.contentWarnings,
          posterKey: video.posterKey,
          trailerDownloadHref: video.technicalMetadata?.trailerKey
            ? `/api/admin/videos/${video.id}/trailer`
            : null,
          createdAt: video.createdAt.toISOString(),
          creatorName: video.creator.creator?.displayName ?? video.creator.email
        }
      }))
    ];
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
          items={getAdminNavItems({ pendingModeration: queueItems.length })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#moderation-queue">Review titles</a>
          <a className="btn btn-ghost" href="/admin/settings">Pricing controls</a>
          <a className="btn btn-ghost" href="/admin/users">Producer accounts</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Queue size</span>
          <strong>{queueItems.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending review</span>
          <strong>{queueItems.filter((item) => item.status === 'PENDING').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Already approved</span>
          <strong>{queueItems.filter((item) => item.status === 'APPROVED').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Orphan approved titles</span>
          <strong>{queueItems.filter((item) => !item.hasModerationRecord).length}</strong>
        </div>
      </div>
      <div id="moderation-queue">
        <ModerationQueue initial={queueItems} />
      </div>
    </DashboardShell>
  );
}
