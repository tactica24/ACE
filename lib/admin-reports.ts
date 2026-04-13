import { prisma } from './db';
import { calculateProducerVideoInsights, formatSecondsLabel } from './studio-insights';

type ReportParams = {
  monthKey?: string | string[];
  requestedVideoIds?: string[];
};

type StoredStatementData = {
  id: string;
  reportCode: string;
  status: string;
  monthKey: string;
  notes: string | null;
  preparedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  issuedBy: string | null;
  issuedAt: Date | null;
  paidBy: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  statementData: unknown;
};

type VideoOptionRow = {
  id: string;
  title: string;
  status: string;
  category: string;
  releaseYear: number | null;
  rightsTier: string;
  priceTier: string;
  createdAt: Date;
  creator: {
    email: string;
    creator: {
      id: string;
      displayName: string;
      creatorNumber: string | null;
      verified: boolean;
      bankName: string | null;
      bankAccountName: string | null;
      bankAccountNumber: string | null;
      earningsBalanceNaira: number;
    } | null;
  };
};

type ReportVideoRow = {
  id: string;
  title: string;
  status: string;
  category: string;
  releaseYear: number | null;
  rightsTier: string;
  priceTier: string;
  durationSec: number;
  teaserSec: number;
  createdAt: Date;
  creator: {
    email: string;
    creator: {
      id: string;
      displayName: string;
      creatorNumber: string | null;
      verified: boolean;
      bankName: string | null;
      bankAccountName: string | null;
      bankAccountNumber: string | null;
      earningsBalanceNaira: number;
    } | null;
  };
  contracts: Array<{
    rightsTier: string;
    producerAccepted: boolean;
    effectiveDate: Date | null;
    producerSignedAt: Date | null;
    producerLegalName: string | null;
    producerSignedName: string | null;
  }>;
  unlocks: Array<{
    userId: string;
    createdAt: Date;
    amountNaira: number;
    amountMinor: number | null;
    currency: string;
    source: string;
  }>;
  settlements: Array<{
    createdAt: Date;
    grossNaira: number;
    creatorNaira: number;
    platformNaira: number;
    gatewayFeeNaira: number;
    taxNaira: number;
    referralNaira: number;
    platformNetNaira: number;
  }>;
};

type WatchHistoryRow = {
  videoId: string;
  userId: string;
  progressSec: number;
  durationSec: number | null;
  completedAt: Date | null;
  updatedAt: Date;
};

type PreviousPeriodRow = {
  videoId: string;
  _count: {
    _all: number;
  };
  _sum: {
    grossNaira: number | null;
  };
};

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function normalizeReportMonthKey(input?: string | string[]) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  return currentMonthKey();
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function buildMonthRange(monthKey: string) {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const previousStart = new Date(Date.UTC(year, monthIndex - 1, 1));

  return {
    start,
    end,
    previousStart,
    label: formatMonthLabel(start),
    previousLabel: formatMonthLabel(previousStart)
  };
}

function uniqueIds(values: string[]) {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(normalized));
}

function sumValues(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function percentDelta(currentValue: number, previousValue: number) {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}

function sourceLabel(source: string) {
  if (source === 'PAYSTACK') return 'Card checkout';
  if (source === 'WALLET') return 'Wallet';
  if (source === 'PASS') return 'Pass credits';
  if (source === 'ADMIN') return 'Admin unlock';
  return source;
}

function statusLabel(status: string) {
  if (status === 'APPROVED') return 'Live';
  if (status === 'PENDING') return 'In review';
  if (status === 'REJECTED') return 'Rejected';
  return 'Draft';
}

function rightsLabel(rightsTier: string) {
  return rightsTier === 'EXCLUSIVE' ? 'Exclusive license' : 'Shared license';
}

function priceTierLabel(priceTier: string) {
  if (priceTier === 'SNACK') return 'Snack tier';
  if (priceTier === 'PREMIERE') return 'Premiere tier';
  return 'Standard tier';
}

function territoryLabelFromCurrency(currency: string) {
  if (currency === 'NGN') return 'Nigeria';
  if (currency === 'GBP') return 'United Kingdom';
  if (currency === 'EUR') return 'Eurozone';
  if (currency === 'CAD') return 'Canada';
  if (currency === 'USD') return 'USD diaspora markets';
  return `${currency} markets`;
}

function buildAvailabilityNote(video: ReportVideoRow) {
  const latestContract = video.contracts[0] ?? null;

  if (!latestContract) {
    return 'No signed license document is attached yet. Sales data is live, but investor review should confirm legal paperwork before external circulation.';
  }

  if (!latestContract.producerAccepted) {
    return 'A contract draft exists, but the producer has not accepted it yet. Treat this title as commercially active and legally pending.';
  }

  const effectiveLabel = latestContract.effectiveDate
    ? formatMonthLabel(latestContract.effectiveDate)
    : 'an undated term';

  return `${rightsLabel(video.rightsTier)} is supported by an accepted contract effective ${effectiveLabel}. This title is ready for investor or licensing review.`;
}

function serializeSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildStatementCode(monthKey: string) {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ACE-SVOD-${monthKey.replace('-', '')}-${suffix}`;
}

export function createReportStatementCode(monthKey: string) {
  return buildStatementCode(monthKey);
}

export async function getRecentReportStatements(limit = 8) {
  return prisma.reportStatement.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      reportCode: true,
      status: true,
      monthKey: true,
      rightsHolder: true,
      titleCount: true,
      currentAmountDueNaira: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function getStoredReportStatement(statementId: string) {
  const statement = await prisma.reportStatement.findUnique({
    where: { id: statementId },
    select: {
      id: true,
      reportCode: true,
      status: true,
      monthKey: true,
      notes: true,
      preparedBy: true,
      reviewedBy: true,
      reviewedAt: true,
      approvedBy: true,
      approvedAt: true,
      issuedBy: true,
      issuedAt: true,
      paidBy: true,
      paidAt: true,
      createdAt: true,
      updatedAt: true,
      statementData: true
    }
  });

  if (!statement) {
    return null;
  }

  return statement as StoredStatementData;
}

export async function getAdminMonthlyReportData({ monthKey, requestedVideoIds = [] }: ReportParams) {
  const selectedMonthKey = normalizeReportMonthKey(monthKey);
  const range = buildMonthRange(selectedMonthKey);

  const [pendingPayouts, financeConfig, videos] = await Promise.all([
    prisma.creatorPayoutRequest.count({
      where: { status: 'PENDING' }
    }),
    prisma.financeConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', creatorSharePercent: 60, platformSharePercent: 29.5, gatewayFeePercent: 3, taxPercent: 7.5 }
    }),
    prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        releaseYear: true,
        rightsTier: true,
        priceTier: true,
        createdAt: true,
        creator: {
          select: {
            email: true,
            creator: {
              select: {
                id: true,
                displayName: true,
                creatorNumber: true,
                verified: true,
                bankName: true,
                bankAccountName: true,
                bankAccountNumber: true,
                earningsBalanceNaira: true
              }
            }
          }
        }
      }
    })
  ]);

  const availableVideos = [...videos]
    .sort((left, right) => {
      if (left.status === right.status) {
        return right.createdAt.getTime() - left.createdAt.getTime();
      }

      if (left.status === 'APPROVED') return -1;
      if (right.status === 'APPROVED') return 1;
      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .map((video: VideoOptionRow) => ({
      id: video.id,
      title: video.title,
      status: video.status,
      statusLabel: statusLabel(video.status),
      category: video.category,
      releaseYear: video.releaseYear,
      rightsTier: video.rightsTier,
      rightsLabel: rightsLabel(video.rightsTier),
      priceTier: video.priceTier,
      priceLabel: priceTierLabel(video.priceTier),
      creatorName: video.creator.creator?.displayName ?? video.creator.email,
      creatorNumber: video.creator.creator?.creatorNumber ?? null,
      creatorVerified: video.creator.creator?.verified ?? false
    }));

  const availableVideoIds = new Set(availableVideos.map((video) => video.id));
  const requestedIds = uniqueIds(requestedVideoIds).filter((videoId) => availableVideoIds.has(videoId));
  const fallbackIds = availableVideos
    .filter((video) => video.status === 'APPROVED')
    .slice(0, 3)
    .map((video) => video.id);
  const selectedVideoIds = requestedIds.length
    ? requestedIds
    : fallbackIds.length
      ? fallbackIds
      : availableVideos.slice(0, 3).map((video) => video.id);

  if (!selectedVideoIds.length) {
    return {
      monthKey: selectedMonthKey,
      monthLabel: range.label,
      previousMonthLabel: range.previousLabel,
      periodStart: range.start,
      periodEnd: range.end,
      generatedAt: new Date(),
      pendingPayouts,
      availableVideos,
      selectedVideoIds,
      videos: [],
      summary: {
        reportId: `ACE-SVOD-${selectedMonthKey.replace('-', '')}-00`,
        reportingEntity: 'ACE Naija Distribution Limited',
        rightsHolder: 'No titles selected',
        preparedBy: 'ACE Studio Admin Reporting Desk',
        statementVersion: 'v1.0',
        currency: 'NGN',
        titleCount: 0,
        unlockCount: 0,
        uniqueAccounts: 0,
        watchHours: 0,
        grossNaira: 0,
        approvedDeductionsNaira: 0,
        netRevenueNaira: 0,
        creatorNaira: 0,
        platformNaira: 0,
        platformNetNaira: 0,
        completionRate: 0,
        averageRevenuePerUnlockNaira: 0,
        previousGrossNaira: 0,
        grossDeltaPercent: 0,
        licensorSharePercent: financeConfig.creatorSharePercent,
        platformSharePercent: financeConfig.platformSharePercent,
        openingBalanceNaira: 0,
        amountPreviouslyPaidNaira: 0,
        currentPeriodPaidNaira: 0,
        currentAmountDueNaira: 0,
        closingBalanceNaira: 0,
        exchangeRateLabel: 'System ledger normalized to NGN at transaction time',
        paymentDueLabel: 'Per signed commercial cycle after finance approval',
        activeTerritories: 0,
        topTerritory: 'No billing-territory activity recorded',
        topDeviceType: 'Playback device segmentation not yet recorded in the settlement ledger',
        promotionalAdjustmentsLabel: 'No manual promotional adjustment has been recorded for this statement',
        contentStatus: 'No titles selected',
        contractReadyCount: 0,
        exclusiveCount: 0,
        paymentDetails: {
          beneficiary: null,
          bankName: null,
          accountName: null,
          accountNumber: null,
          swiftOrRouting: null,
          paymentReference: `ACE/SVOD/${selectedMonthKey.replace('-', '')}`,
          remittanceDate: null,
          amountRemittedNaira: 0
        },
        topTitle: null as null | { title: string; grossNaira: number }
      }
    };
  }

  const selectedVideos = await prisma.video.findMany({
    where: {
      id: { in: selectedVideoIds }
    },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      releaseYear: true,
      rightsTier: true,
      priceTier: true,
      durationSec: true,
      teaserSec: true,
      createdAt: true,
      creator: {
        select: {
          email: true,
          creator: {
            select: {
              id: true,
              displayName: true,
              creatorNumber: true,
              verified: true,
              bankName: true,
              bankAccountName: true,
              bankAccountNumber: true,
              earningsBalanceNaira: true
            }
          }
        }
      },
      contracts: {
        orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
        take: 1,
        select: {
          rightsTier: true,
          producerAccepted: true,
          effectiveDate: true,
          producerSignedAt: true,
          producerLegalName: true,
          producerSignedName: true
        }
      },
      unlocks: {
        where: {
          createdAt: {
            gte: range.start,
            lt: range.end
          }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          userId: true,
          createdAt: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          source: true
        }
      },
      settlements: {
        where: {
          createdAt: {
            gte: range.start,
            lt: range.end
          }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          grossNaira: true,
          creatorNaira: true,
          platformNaira: true,
          gatewayFeeNaira: true,
          taxNaira: true,
          referralNaira: true,
          platformNetNaira: true
        }
      }
    }
  });

  const videoMap = new Map(selectedVideos.map((video) => [video.id, video]));
  const orderedVideos = selectedVideoIds
    .map((videoId) => videoMap.get(videoId))
    .filter(Boolean) as ReportVideoRow[];
  const unlockUserIds = Array.from(new Set(orderedVideos.flatMap((video) => video.unlocks.map((unlock) => unlock.userId))));
  const creatorProfileIds = Array.from(
    new Set(
      orderedVideos
        .map((video) => video.creator.creator?.id ?? null)
        .filter(Boolean)
    )
  ) as string[];

  const [previousPeriodRows, watchHistoryRows, priorCreatorSettlements, priorPaidPayouts, currentPaidPayouts] = await Promise.all([
    prisma.unlockSettlement.groupBy({
      by: ['videoId'],
      where: {
        videoId: { in: selectedVideoIds },
        createdAt: {
          gte: range.previousStart,
          lt: range.start
        }
      },
      _count: { _all: true },
      _sum: { grossNaira: true }
    }),
    unlockUserIds.length
      ? prisma.watchHistory.findMany({
          where: {
            videoId: { in: selectedVideoIds },
            userId: { in: unlockUserIds }
          },
          select: {
            videoId: true,
            userId: true,
            progressSec: true,
            durationSec: true,
            completedAt: true,
            updatedAt: true
          }
        })
      : Promise.resolve([])
    ,
    prisma.unlockSettlement.aggregate({
      where: {
        videoId: { in: selectedVideoIds },
        createdAt: { lt: range.start }
      },
      _sum: {
        creatorNaira: true
      }
    }),
    creatorProfileIds.length
      ? prisma.creatorPayoutRequest.aggregate({
          where: {
            creatorProfileId: { in: creatorProfileIds },
            status: 'PAID',
            paidAt: { lt: range.start }
          },
          _sum: {
            amountNaira: true
          }
        })
      : Promise.resolve({ _sum: { amountNaira: 0 } }),
    creatorProfileIds.length
      ? prisma.creatorPayoutRequest.findMany({
          where: {
            creatorProfileId: { in: creatorProfileIds },
            status: 'PAID',
            paidAt: {
              gte: range.start,
              lt: range.end
            }
          },
          orderBy: { paidAt: 'desc' },
          select: {
            id: true,
            amountNaira: true,
            paidAt: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true
          }
        })
      : Promise.resolve([])
  ]);

  const previousByVideo = new Map(
    (previousPeriodRows as PreviousPeriodRow[]).map((row) => [
      row.videoId,
      {
        unlockCount: row._count._all,
        grossNaira: row._sum.grossNaira ?? 0
      }
    ])
  );

  const watchHistoryByVideo = new Map<string, WatchHistoryRow[]>();
  for (const row of watchHistoryRows as WatchHistoryRow[]) {
    const existing = watchHistoryByVideo.get(row.videoId) ?? [];
    existing.push(row);
    watchHistoryByVideo.set(row.videoId, existing);
  }

  const reportVideos = orderedVideos.map((video) => {
    const creatorName = video.creator.creator?.displayName ?? video.creator.email;
    const creatorNumber = video.creator.creator?.creatorNumber ?? null;
    const creatorVerified = video.creator.creator?.verified ?? false;
    const watchHistory = watchHistoryByVideo.get(video.id) ?? [];
    const insights = calculateProducerVideoInsights({
      durationSec: video.durationSec,
      teaserSec: video.teaserSec,
      watchHistory,
      unlocks: video.unlocks.map((unlock) => ({
        userId: unlock.userId,
        createdAt: unlock.createdAt
      }))
    });
    const grossNaira = sumValues(video.settlements.map((entry) => entry.grossNaira));
    const creatorNaira = sumValues(video.settlements.map((entry) => entry.creatorNaira));
    const platformNaira = sumValues(video.settlements.map((entry) => entry.platformNaira));
    const platformNetNaira = sumValues(video.settlements.map((entry) => entry.platformNetNaira));
    const gatewayFeeNaira = sumValues(video.settlements.map((entry) => entry.gatewayFeeNaira));
    const taxNaira = sumValues(video.settlements.map((entry) => entry.taxNaira));
    const referralNaira = sumValues(video.settlements.map((entry) => entry.referralNaira));
    const netRevenueNaira = creatorNaira + platformNetNaira;
    const approvedDeductionsNaira = Math.max(grossNaira - netRevenueNaira, 0);
    const previousPeriod = previousByVideo.get(video.id) ?? { unlockCount: 0, grossNaira: 0 };
    const dailyPerformanceMap = new Map<string, { label: string; unlockCount: number; grossNaira: number }>();
    const territoryCounts = new Map<string, number>();

    for (const entry of video.settlements) {
      const key = entry.createdAt.toISOString().slice(0, 10);
      const existing = dailyPerformanceMap.get(key) ?? {
        label: formatDayLabel(entry.createdAt),
        unlockCount: 0,
        grossNaira: 0
      };
      existing.unlockCount += 1;
      existing.grossNaira += entry.grossNaira;
      dailyPerformanceMap.set(key, existing);
    }

    const sourceCounts = new Map<string, number>();
    for (const unlock of video.unlocks) {
      sourceCounts.set(unlock.source, (sourceCounts.get(unlock.source) ?? 0) + 1);
      const territoryLabel = territoryLabelFromCurrency(unlock.currency);
      territoryCounts.set(territoryLabel, (territoryCounts.get(territoryLabel) ?? 0) + 1);
    }

    const latestContract = video.contracts[0] ?? null;
    const cohortWatchRate = insights.unlockCount > 0 ? Math.round((insights.fullMovieStarters / insights.unlockCount) * 100) : 0;
    const totalWatchSeconds = watchHistory.reduce((total, row) => {
      if (row.completedAt) {
        return total + Math.max(video.durationSec, row.durationSec ?? 0, video.teaserSec);
      }

      return total + Math.max(0, row.progressSec);
    }, 0);
    const territoryRows = Array.from(territoryCounts.entries())
      .map(([territory, count]) => ({
        territory,
        views: count
      }))
      .sort((left, right) => right.views - left.views);
    const topTerritory = territoryRows[0]?.territory ?? 'No billing-territory activity recorded';
    const licensorSharePercent = grossNaira > 0 ? Math.round((creatorNaira / grossNaira) * 1000) / 10 : financeConfig.creatorSharePercent;
    const platformSharePercent = grossNaira > 0 ? Math.round((platformNaira / grossNaira) * 1000) / 10 : financeConfig.platformSharePercent;

    return {
      id: video.id,
      title: video.title,
      status: video.status,
      statusLabel: statusLabel(video.status),
      category: video.category,
      releaseYear: video.releaseYear,
      rightsTier: video.rightsTier,
      rightsLabel: rightsLabel(video.rightsTier),
      priceTier: video.priceTier,
      priceLabel: priceTierLabel(video.priceTier),
      runtimeLabel: formatSecondsLabel(video.durationSec),
      teaserLabel: formatSecondsLabel(video.teaserSec),
      creatorName,
      creatorNumber,
      creatorVerified,
      unlockCount: insights.unlockCount,
      trackedPurchasers: insights.trackedViewers,
      uniqueAccounts: insights.trackedViewers,
      fullMovieStarters: insights.fullMovieStarters,
      completionCount: insights.completionCount,
      completionRate: insights.completionRate,
      cohortWatchRate,
      averageWatchPercent: insights.averageWatchPercent,
      watchHours: Math.round((totalWatchSeconds / 3600) * 10) / 10,
      activeTerritories: territoryRows.length,
      topTerritory,
      territoryRows,
      grossNaira,
      creatorNaira,
      platformNaira,
      platformNetNaira,
      gatewayFeeNaira,
      taxNaira,
      referralNaira,
      netRevenueNaira,
      approvedDeductionsNaira,
      licensorSharePercent,
      platformSharePercent,
      averageRevenuePerUnlockNaira: insights.unlockCount > 0 ? Math.round(grossNaira / insights.unlockCount) : 0,
      previousUnlockCount: previousPeriod.unlockCount,
      previousGrossNaira: previousPeriod.grossNaira,
      unlockDeltaPercent: percentDelta(insights.unlockCount, previousPeriod.unlockCount),
      grossDeltaPercent: percentDelta(grossNaira, previousPeriod.grossNaira),
      sourceBreakdown: Array.from(sourceCounts.entries()).map(([source, count]) => ({
        source,
        label: sourceLabel(source),
        count
      })),
      dailyPerformance: Array.from(dailyPerformanceMap.values()).sort((left, right) => right.grossNaira - left.grossNaira),
      latestContract: latestContract
        ? {
            rightsLabel: rightsLabel(latestContract.rightsTier),
            producerAccepted: latestContract.producerAccepted,
            effectiveDate: latestContract.effectiveDate,
            producerSignedAt: latestContract.producerSignedAt,
            signedBy: latestContract.producerSignedName ?? latestContract.producerLegalName ?? creatorName
          }
        : null,
      availabilityNote: buildAvailabilityNote(video)
    };
  });

  const totalUnlocks = sumValues(reportVideos.map((video) => video.unlockCount));
  const totalGross = sumValues(reportVideos.map((video) => video.grossNaira));
  const totalCreator = sumValues(reportVideos.map((video) => video.creatorNaira));
  const totalPlatformNet = sumValues(reportVideos.map((video) => video.platformNetNaira));
  const totalPlatform = sumValues(reportVideos.map((video) => video.platformNaira));
  const totalApprovedDeductions = sumValues(reportVideos.map((video) => video.approvedDeductionsNaira));
  const totalNetRevenue = sumValues(reportVideos.map((video) => video.netRevenueNaira));
  const totalPreviousGross = sumValues(reportVideos.map((video) => video.previousGrossNaira));
  const totalCompletions = sumValues(reportVideos.map((video) => video.completionCount));
  const totalUniqueAccounts = sumValues(reportVideos.map((video) => video.uniqueAccounts));
  const totalWatchHours = Math.round(sumValues(reportVideos.map((video) => video.watchHours)) * 10) / 10;
  const topVideo = [...reportVideos].sort((left, right) => right.grossNaira - left.grossNaira)[0] ?? null;
  const uniqueCreatorRecords = Array.from(
    new Map(
      orderedVideos
        .map((video) => video.creator.creator)
        .filter(Boolean)
        .map((creator) => [creator!.id, creator!])
    ).values()
  );
  const currentPeriodPaidAmount = sumValues(
    (currentPaidPayouts as Array<{ amountNaira: number }>).map((entry) => entry.amountNaira)
  );
  const priorPaidAmount = priorPaidPayouts._sum.amountNaira ?? 0;
  const openingBalanceNaira = Math.max((priorCreatorSettlements._sum.creatorNaira ?? 0) - priorPaidAmount, 0);
  const currentAmountDueNaira = Math.max(openingBalanceNaira + totalCreator - currentPeriodPaidAmount, 0);
  const closingBalanceNaira = currentAmountDueNaira;
  const weightedLicensorSharePercent = totalGross > 0
    ? Math.round((totalCreator / totalGross) * 1000) / 10
    : financeConfig.creatorSharePercent;
  const weightedPlatformSharePercent = totalGross > 0
    ? Math.round((totalPlatform / totalGross) * 1000) / 10
    : financeConfig.platformSharePercent;
  const allTerritories = Array.from(
    new Set(reportVideos.flatMap((video) => video.territoryRows.map((territory) => territory.territory)))
  );
  const topTerritoryCounts = new Map<string, number>();
  for (const video of reportVideos) {
    for (const row of video.territoryRows) {
      topTerritoryCounts.set(row.territory, (topTerritoryCounts.get(row.territory) ?? 0) + row.views);
    }
  }
  const topTerritory = Array.from(topTerritoryCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'No billing-territory activity recorded';
  const reportId = `ACE-SVOD-${selectedMonthKey.replace('-', '')}-${selectedVideoIds.length.toString().padStart(2, '0')}`;
  const primaryBeneficiary = uniqueCreatorRecords.length === 1 ? uniqueCreatorRecords[0] : null;
  const latestPaidPayout = (currentPaidPayouts as Array<{
    id: string;
    amountNaira: number;
    paidAt: Date | null;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
  }>)[0] ?? null;

  return {
    monthKey: selectedMonthKey,
    monthLabel: range.label,
    previousMonthLabel: range.previousLabel,
    periodStart: range.start,
    periodEnd: range.end,
    generatedAt: new Date(),
    pendingPayouts,
    availableVideos,
    selectedVideoIds,
    videos: reportVideos,
    summary: {
      reportId,
      reportingEntity: 'ACE Naija Distribution Limited',
      rightsHolder: uniqueCreatorRecords.length === 1
        ? uniqueCreatorRecords[0].displayName
        : `${uniqueCreatorRecords.length} licensors / producers`,
      preparedBy: 'ACE Studio Admin Reporting Desk',
      statementVersion: 'v1.0',
      currency: 'NGN',
      titleCount: reportVideos.length,
      unlockCount: totalUnlocks,
      uniqueAccounts: totalUniqueAccounts,
      watchHours: totalWatchHours,
      grossNaira: totalGross,
      approvedDeductionsNaira: totalApprovedDeductions,
      netRevenueNaira: totalNetRevenue,
      creatorNaira: totalCreator,
      platformNaira: totalPlatform,
      platformNetNaira: totalPlatformNet,
      completionRate: totalUnlocks > 0 ? Math.round((totalCompletions / totalUnlocks) * 100) : 0,
      averageRevenuePerUnlockNaira: totalUnlocks > 0 ? Math.round(totalGross / totalUnlocks) : 0,
      previousGrossNaira: totalPreviousGross,
      grossDeltaPercent: percentDelta(totalGross, totalPreviousGross),
      licensorSharePercent: weightedLicensorSharePercent,
      platformSharePercent: weightedPlatformSharePercent,
      openingBalanceNaira,
      amountPreviouslyPaidNaira: priorPaidAmount + currentPeriodPaidAmount,
      currentPeriodPaidNaira: currentPeriodPaidAmount,
      currentAmountDueNaira,
      closingBalanceNaira,
      exchangeRateLabel: 'System ledger normalized to NGN at transaction time',
      paymentDueLabel: 'Per signed commercial cycle after finance approval',
      activeTerritories: allTerritories.length,
      topTerritory,
      topDeviceType: null,
      topDeviceTypeStatus: 'UNAVAILABLE_IN_CURRENT_TELEMETRY',
      promotionalAdjustmentsLabel: 'No manual promotional adjustment recorded',
      contentStatus: reportVideos.every((video) => video.status === 'APPROVED') ? 'Live in catalog' : 'Mixed release status',
      contractReadyCount: reportVideos.filter((video) => video.latestContract?.producerAccepted).length,
      exclusiveCount: reportVideos.filter((video) => video.rightsTier === 'EXCLUSIVE').length,
      paymentDetails: {
        beneficiary: primaryBeneficiary?.displayName ?? 'Multiple licensors; see title-level statement',
        bankName: latestPaidPayout?.bankName ?? primaryBeneficiary?.bankName ?? null,
        accountName: latestPaidPayout?.bankAccountName ?? primaryBeneficiary?.bankAccountName ?? null,
        accountNumber: latestPaidPayout?.bankAccountNumber ?? primaryBeneficiary?.bankAccountNumber ?? null,
        swiftOrRouting: null,
        paymentReference: latestPaidPayout?.id ?? `ACE/SVOD/${selectedMonthKey.replace('-', '')}`,
        remittanceDate: latestPaidPayout?.paidAt ?? null,
        amountRemittedNaira: currentPeriodPaidAmount
      },
      topTitle: topVideo
        ? {
            title: topVideo.title,
            grossNaira: topVideo.grossNaira
          }
        : null
    }
  };
}

export async function createStoredReportStatement({
  monthKey,
  selectedVideoIds,
  preparedBy,
  notes
}: {
  monthKey?: string | string[];
  selectedVideoIds: string[];
  preparedBy: string;
  notes?: string;
}) {
  const report = await getAdminMonthlyReportData({ monthKey, requestedVideoIds: selectedVideoIds });
  const statementData = serializeSnapshot({
    ...report,
    summary: {
      ...report.summary,
      preparedBy
    }
  });
  const reportCode = createReportStatementCode(report.monthKey);

  const statement = await prisma.reportStatement.create({
    data: {
      reportCode,
      monthKey: report.monthKey,
      reportingEntity: report.summary.reportingEntity,
      rightsHolder: report.summary.rightsHolder,
      currency: report.summary.currency,
      status: 'DRAFT',
      titleCount: report.summary.titleCount,
      unlockCount: report.summary.unlockCount,
      uniqueAccounts: report.summary.uniqueAccounts,
      watchHours: report.summary.watchHours,
      grossNaira: report.summary.grossNaira,
      approvedDeductionsNaira: report.summary.approvedDeductionsNaira,
      netRevenueNaira: report.summary.netRevenueNaira,
      licensorSharePercent: report.summary.licensorSharePercent,
      platformSharePercent: report.summary.platformSharePercent,
      creatorNaira: report.summary.creatorNaira,
      platformNaira: report.summary.platformNaira,
      platformNetNaira: report.summary.platformNetNaira,
      openingBalanceNaira: report.summary.openingBalanceNaira,
      amountPreviouslyPaidNaira: report.summary.amountPreviouslyPaidNaira,
      currentAmountDueNaira: report.summary.currentAmountDueNaira,
      closingBalanceNaira: report.summary.closingBalanceNaira,
      exchangeRateLabel: report.summary.exchangeRateLabel,
      paymentDueLabel: report.summary.paymentDueLabel,
      activeTerritories: report.summary.activeTerritories,
      topTerritory: report.summary.topTerritory,
      topDeviceType: report.summary.topDeviceType,
      topDeviceTypeStatus: report.summary.topDeviceTypeStatus,
      promotionalAdjustmentsNote: report.summary.promotionalAdjustmentsLabel,
      contentStatus: report.summary.contentStatus,
      preparedBy,
      notes: notes?.trim() || null,
      statementData,
      items: {
        create: report.videos.map((video) => ({
          videoId: video.id,
          title: video.title,
          territoryLabel: video.topTerritory,
          periodLabel: report.monthLabel,
          views: video.uniqueAccounts,
          watchHours: video.watchHours,
          revenueBaseNaira: video.netRevenueNaira,
          sharePercent: video.licensorSharePercent,
          amountDueNaira: video.creatorNaira,
          itemData: serializeSnapshot(video)
        }))
      }
    }
  });

  return { statement, report };
}

export async function updateStoredReportStatementStatus({
  statementId,
  status,
  actor,
  notes
}: {
  statementId: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'ISSUED' | 'PAID' | 'SUPERSEDED';
  actor: string;
  notes?: string;
}) {
  const now = new Date();

  return prisma.reportStatement.update({
    where: { id: statementId },
    data: {
      status,
      notes: notes?.trim() || undefined,
      reviewedBy: status === 'REVIEWED' ? actor : undefined,
      reviewedAt: status === 'REVIEWED' ? now : undefined,
      approvedBy: status === 'APPROVED' ? actor : undefined,
      approvedAt: status === 'APPROVED' ? now : undefined,
      issuedBy: status === 'ISSUED' ? actor : undefined,
      issuedAt: status === 'ISSUED' ? now : undefined,
      paidBy: status === 'PAID' ? actor : undefined,
      paidAt: status === 'PAID' ? now : undefined
    }
  });
}
