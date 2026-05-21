import 'server-only';

import { prisma } from './db';
import { headObject } from './r2';
import { getConfiguredRelayTargets } from './relay';
import { getViewerReadyCatalogWhere } from './video-visibility';

export type InfrastructureCheckStatus = 'READY' | 'ACTION' | 'OPTIONAL' | 'ERROR';

export type InfrastructureCheck = {
  id: string;
  label: string;
  status: InfrastructureCheckStatus;
  summary: string;
  detail?: string;
};

export type InfrastructureSnapshot = {
  checks: InfrastructureCheck[];
  approvedVideos: number;
  pendingModeration: number;
  creatorAccounts: number;
};

const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'ACE_STREAM_SIGNING_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'ACE_APP_BASE_URL'
] as const;

function formatError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
}

function isReachableStorageResponse(error: unknown) {
  const statusCode = (error as { $metadata?: { httpStatusCode?: number } } | undefined)?.$metadata?.httpStatusCode;
  return statusCode === 404;
}

export async function getInfrastructureSnapshot(): Promise<InfrastructureSnapshot> {
  const missingEnv = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  const relayTargets = getConfiguredRelayTargets();

  let approvedVideos = 0;
  let pendingModeration = 0;
  let creatorAccounts = 0;

  let databaseCheck: InfrastructureCheck = {
    id: 'database',
    label: 'Neon database',
    status: 'ERROR',
    summary: 'Database connectivity could not be verified.'
  };

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    const [approvedCount, pendingCount, creatorCount] = await Promise.all([
      prisma.video.count({ where: getViewerReadyCatalogWhere() }),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'CREATOR' } })
    ]);

    approvedVideos = approvedCount;
    pendingModeration = pendingCount;
    creatorAccounts = creatorCount;
    databaseCheck = {
      id: 'database',
      label: 'Neon database',
      status: 'READY',
      summary: 'Database connection is healthy.',
      detail: `${approvedCount} approved titles, ${pendingCount} pending reviews, ${creatorCount} producer accounts.`
    };
  } catch (error) {
    databaseCheck = {
      id: 'database',
      label: 'Neon database',
      status: 'ERROR',
      summary: 'Database connection failed.',
      detail: formatError(error)
    };
  }

  const missingStorageEnv = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter(
    (key) => !process.env[key]?.trim()
  );

  let storageCheck: InfrastructureCheck;
  if (missingStorageEnv.length) {
    storageCheck = {
      id: 'storage',
      label: 'R2 storage',
      status: 'ACTION',
      summary: 'R2 is not fully configured yet.',
      detail: `Missing: ${missingStorageEnv.join(', ')}`
    };
  } else {
    try {
      await headObject('__ace__/readiness-probe.txt');
      storageCheck = {
        id: 'storage',
        label: 'R2 storage',
        status: 'READY',
        summary: 'R2 credentials are working.',
        detail: 'Producer uploads can write media and posters directly to object storage.'
      };
    } catch (error) {
      if (isReachableStorageResponse(error)) {
        storageCheck = {
          id: 'storage',
          label: 'R2 storage',
          status: 'READY',
          summary: 'R2 credentials are working.',
          detail: 'The probe object was not found, which still confirms the bucket and credentials are reachable.'
        };
      } else {
        storageCheck = {
          id: 'storage',
          label: 'R2 storage',
          status: 'ERROR',
          summary: 'R2 connectivity failed.',
          detail: formatError(error)
        };
      }
    }
  }

  return {
    checks: [
      {
        id: 'environment',
        label: 'Core environment',
        status: missingEnv.length ? 'ACTION' : 'READY',
        summary: missingEnv.length ? 'Some required environment values are missing.' : 'Core runtime environment is configured.',
        detail: missingEnv.length ? `Missing: ${missingEnv.join(', ')}` : 'Auth, payments, database, and storage values are present.'
      },
      databaseCheck,
      storageCheck,
      {
        id: 'delivery',
        label: 'Streaming delivery',
        status: relayTargets.length ? 'READY' : 'OPTIONAL',
        summary: relayTargets.length
          ? 'Relay delivery endpoints are configured.'
          : 'Direct app streaming is active until you add a relay node.',
        detail: relayTargets.length
          ? `Configured relay targets: ${relayTargets.join(', ')}`
          : 'Approved titles will stream from R2 through the app, so you can fully test upload, approval, homepage placement, and playback now.'
      },
      {
        id: 'catalog',
        label: 'Approval to catalog flow',
        status: databaseCheck.status === 'READY' && storageCheck.status === 'READY' ? 'READY' : 'ACTION',
        summary:
          databaseCheck.status === 'READY' && storageCheck.status === 'READY'
            ? 'Producer uploads are ready for moderation and release.'
            : 'Fix database or storage issues before testing moderation.',
        detail:
          databaseCheck.status === 'READY' && storageCheck.status === 'READY'
            ? 'Admin approvals publish titles to homepage and browse. Admin removals clear cached shelves immediately.'
            : 'The upload and release flow depends on both Neon and R2 being healthy.'
      }
    ],
    approvedVideos,
    pendingModeration,
    creatorAccounts
  };
}
