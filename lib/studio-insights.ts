export type ProducerVideoInsightInput = {
  durationSec: number;
  teaserSec: number;
  watchHistory: Array<{
    userId: string;
    progressSec: number;
    durationSec: number | null;
    completedAt: Date | null;
    updatedAt: Date;
  }>;
  unlocks: Array<{
    userId: string;
    createdAt: Date;
  }>;
};

export type ProducerVideoInsights = {
  trackedViewers: number;
  teaserOnlyViewers: number;
  teaserEndDropoffs: number;
  unlockCount: number;
  unlockConversionRate: number;
  unlockedButNotStartedCount: number;
  fullMovieStarters: number;
  completionCount: number;
  completionRate: number;
  averageWatchPercent: number;
  reached25Count: number;
  reached50Count: number;
  reached75Count: number;
  reached100Count: number;
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function toWatchPercent(progressSec: number, durationSec: number, completedAt: Date | null) {
  if (completedAt) {
    return 100;
  }

  if (durationSec <= 0) {
    return 0;
  }

  return clampPercent((progressSec / durationSec) * 100);
}

export function calculateProducerVideoInsights(input: ProducerVideoInsightInput): ProducerVideoInsights {
  const safeDurationSec = Math.max(0, input.durationSec);
  const safeTeaserSec = Math.max(0, input.teaserSec);
  const viewerIds = new Set<string>([
    ...input.watchHistory.map((entry) => entry.userId),
    ...input.unlocks.map((entry) => entry.userId)
  ]);

  let teaserOnlyViewers = 0;
  let teaserEndDropoffs = 0;
  let fullMovieStarters = 0;
  let unlockedButNotStartedCount = 0;
  let completionCount = 0;
  let watchPercentSum = 0;
  let reached25Count = 0;
  let reached50Count = 0;
  let reached75Count = 0;
  let reached100Count = 0;

  const unlockByUser = new Map(input.unlocks.map((entry) => [entry.userId, entry]));
  const historyByUser = new Map(input.watchHistory.map((entry) => [entry.userId, entry]));
  const teaserEndThreshold = safeTeaserSec > 0 ? Math.max(safeTeaserSec - 5, safeTeaserSec * 0.9) : 0;

  for (const userId of viewerIds) {
    const unlock = unlockByUser.get(userId);
    const history = historyByUser.get(userId);
    const hasUnlock = Boolean(unlock);

    const effectiveDurationSec = Math.max(
      safeDurationSec,
      history?.durationSec ?? 0,
      safeTeaserSec
    );
    const effectiveProgressSec = history?.completedAt
      ? effectiveDurationSec
      : Math.max(0, history?.progressSec ?? 0);
    const watchPercent = toWatchPercent(effectiveProgressSec, effectiveDurationSec, history?.completedAt ?? null);
    const startedBeyondTeaser = hasUnlock && (history?.completedAt || effectiveProgressSec > safeTeaserSec);
    const hasTrackedProgress = effectiveProgressSec > 0 || Boolean(history?.completedAt);

    if (!hasUnlock && hasTrackedProgress) {
      teaserOnlyViewers += 1;
      if (effectiveProgressSec >= teaserEndThreshold) {
        teaserEndDropoffs += 1;
      }
    }

    if (hasUnlock) {
      if (startedBeyondTeaser) {
        fullMovieStarters += 1;
      } else {
        unlockedButNotStartedCount += 1;
      }

      watchPercentSum += watchPercent;
      if (watchPercent >= 25) reached25Count += 1;
      if (watchPercent >= 50) reached50Count += 1;
      if (watchPercent >= 75) reached75Count += 1;
      if (watchPercent >= 99.5) reached100Count += 1;
      if (history?.completedAt) {
        completionCount += 1;
      }
    }
  }

  const unlockCount = input.unlocks.length;
  const trackedViewers = viewerIds.size;

  return {
    trackedViewers,
    teaserOnlyViewers,
    teaserEndDropoffs,
    unlockCount,
    unlockConversionRate: trackedViewers > 0 ? Math.round((unlockCount / trackedViewers) * 100) : 0,
    unlockedButNotStartedCount,
    fullMovieStarters,
    completionCount,
    completionRate: unlockCount > 0 ? Math.round((completionCount / unlockCount) * 100) : 0,
    averageWatchPercent: unlockCount > 0 ? Math.round(watchPercentSum / unlockCount) : 0,
    reached25Count,
    reached50Count,
    reached75Count,
    reached100Count
  };
}

export function formatSecondsLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds === 0) {
    return '0m';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(1, minutes)}m`;
}
