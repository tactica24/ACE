import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getStudioNavItems } from '@/lib/studio-nav';
import { calculateProducerVideoInsights, formatSecondsLabel } from '@/lib/studio-insights';

function ratioLabel(value: number, total: number) {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

function formatList(values: string[] | null | undefined, fallback = 'Not recorded') {
  const safeValues = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return safeValues.length ? safeValues.join(', ') : fallback;
}

function extractStringRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function RetentionBar({
  label,
  value,
  total
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="insight-bar">
      <div className="insight-bar-header">
        <strong>{label}</strong>
        <span className="muted">{value} viewers | {percent}%</span>
      </div>
      <div className="insight-bar-track" aria-hidden="true">
        <div className="insight-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default async function ProducerVideoInsightsPage({
  params
}: {
  params: { id: string };
}) {
  const user = await requireCreatorUser(`/studio/library/${params.id}`);
  const video = await prisma.video.findFirst({
    where: {
      id: params.id,
      creatorId: user.sub
    },
    include: {
      technicalMetadata: true,
      unlocks: {
        select: {
          userId: true,
          createdAt: true
        }
      },
      watchHistory: {
        select: {
          userId: true,
          progressSec: true,
          durationSec: true,
          completedAt: true,
          updatedAt: true
        }
      }
    }
  });

  if (!video) {
    notFound();
  }

  const insights = calculateProducerVideoInsights({
    durationSec: video.durationSec,
    teaserSec: video.teaserSec,
    watchHistory: video.watchHistory,
    unlocks: video.unlocks
  });

  return (
    <DashboardShell
      title={`${video.title} insights`}
      description="See whether viewers stop at the teaser, unlock the title, and how deep they go into the full movie."
      sideNav={
        <SideNav
          active="/studio/library"
          items={getStudioNavItems()}
        />
      }
      actions={
        <div className="action-list">
          <Link className="btn btn-primary" href="/studio/library">Back to library</Link>
          <Link className="btn btn-ghost" href={`/v/${video.id}`}>Open movie page</Link>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Tracked viewers</span>
          <strong>{insights.trackedViewers}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Trailer only</span>
          <strong>{insights.teaserOnlyViewers}</strong>
          <span className="muted">{ratioLabel(insights.teaserOnlyViewers, insights.trackedViewers)} of tracked viewers</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Unlocked</span>
          <strong>{insights.unlockCount}</strong>
          <span className="muted">{insights.unlockConversionRate}% conversion</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Finished movie</span>
          <strong>{insights.completionCount}</strong>
          <span className="muted">{insights.completionRate}% of unlocks</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Average watch-through</span>
          <strong>{insights.averageWatchPercent}%</strong>
          <span className="muted">Across unlocked viewers</span>
        </div>
        <div className="detail-card">
          <span className="detail-label">Teaser length</span>
          <strong>{formatSecondsLabel(video.teaserSec)}</strong>
          <span className="muted">Full movie: {formatSecondsLabel(video.durationSec)}</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Delivery metadata</h3>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Vendor ID</span>
              <strong>{video.technicalMetadata?.vendorId ?? 'Not recorded'}</strong>
              <span className="muted">{video.technicalMetadata?.studioReleaseTitle ?? 'No studio release title'}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Origin</span>
              <strong>{formatList(video.technicalMetadata?.countriesOfOrigin)}</strong>
              <span className="muted">Production: {formatList(video.technicalMetadata?.productionCountries)}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Licensed territories</span>
              <strong>{formatList(video.technicalMetadata?.licensedTerritories)}</strong>
              <span className="muted">{video.technicalMetadata?.copyrightLine ?? 'No copyright line recorded'}</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Package</span>
              <strong>{video.technicalMetadata?.deliveryFormat ?? 'Not recorded'}</strong>
              <span className="muted">{video.technicalMetadata?.englishSubtitlesProvided ? 'English subtitles provided' : 'English subtitles not marked'}</span>
            </div>
          </div>
          <div className="detail-grid" style={{ marginTop: 14 }}>
            <div className="detail-card">
              <span className="detail-label">Availability notes</span>
              <p className="muted" style={{ marginBottom: 0 }}>
                {extractStringRows(video.technicalMetadata?.productAvailability).slice(0, 5).join(' / ') || 'Not recorded'}
              </p>
            </div>
            <div className="detail-card">
              <span className="detail-label">Localizations</span>
              <p className="muted" style={{ marginBottom: 0 }}>
                {extractStringRows(video.technicalMetadata?.localizations).slice(0, 5).join(' / ') || 'Not recorded'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Conversion snapshot</h3>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Stopped before unlocking</span>
              <strong>{insights.teaserOnlyViewers}</strong>
              <span className="muted">Viewers who showed watch activity but never unlocked the full movie.</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Reached teaser end and left</span>
              <strong>{insights.teaserEndDropoffs}</strong>
              <span className="muted">These viewers got close to the teaser boundary but still did not unlock.</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Unlocked but did not continue</span>
              <strong>{insights.unlockedButNotStartedCount}</strong>
              <span className="muted">Unlocked viewers whose watch history did not move beyond the teaser line yet.</span>
            </div>
            <div className="detail-card">
              <span className="detail-label">Started full movie</span>
              <strong>{insights.fullMovieStarters}</strong>
              <span className="muted">Unlocked viewers who moved past the teaser into the full title.</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Retention after unlock</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            This shows how many unlocked viewers reached each part of the movie.
          </p>
          <div className="insight-bar-list">
            <RetentionBar label="Reached 25%" value={insights.reached25Count} total={insights.unlockCount} />
            <RetentionBar label="Reached 50%" value={insights.reached50Count} total={insights.unlockCount} />
            <RetentionBar label="Reached 75%" value={insights.reached75Count} total={insights.unlockCount} />
            <RetentionBar label="Reached 100%" value={insights.reached100Count} total={insights.unlockCount} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
