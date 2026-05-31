import 'server-only';

import { prisma } from './db';
import { headObject } from './bunny-storage';
import { getConfiguredRelayTargets } from './relay';
import { getViewerReadyCatalogWhere } from './video-visibility';
import { env } from './env';

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
  'API_BASE_URL',
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
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'ACE_APP_BASE_URL'
] as const;

function formatError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown error';
}

function isReachableStorageResponse(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message);
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

  const missingBunnyEnv = ['BUNNY_STORAGE_API_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_STORAGE_ENDPOINT', 'BUNNY_CDN_HOSTNAME', 'BUNNY_TOKEN_KEY'].filter(
    (key) => !process.env[key]?.trim()
  );

  let bunnyStorageCheck: InfrastructureCheck;
  if (missingBunnyEnv.length) {
    bunnyStorageCheck = {
      id: 'bunny-storage',
      label: 'Bunny Storage',
      status: 'ACTION',
      summary: 'Bunny Storage is not fully configured yet.',
      detail: `Missing: ${missingBunnyEnv.join(', ')}`
    };
  } else {
    try {
      await headObject('__ace__/readiness-probe.txt');
      bunnyStorageCheck = {
        id: 'bunny-storage',
        label: 'Bunny Storage',
        status: 'READY',
        summary: 'Bunny Storage credentials are working.',
        detail: `Storage zone: ${env.BUNNY_STORAGE_ZONE || 'ace-studio'}. Uploads and signed CDN delivery are available.`
      };
    } catch (error) {
      if (isReachableStorageResponse(error)) {
        bunnyStorageCheck = {
          id: 'bunny-storage',
          label: 'Bunny Storage',
          status: 'READY',
          summary: 'Bunny Storage credentials are working.',
          detail: 'The probe object was not found, which still confirms the storage zone and credentials are reachable.'
        };
      } else {
        bunnyStorageCheck = {
          id: 'bunny-storage',
          label: 'Bunny Storage',
          status: 'ERROR',
          summary: 'Bunny Storage connectivity failed.',
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
      bunnyStorageCheck,
      {
        id: 'delivery',
        label: 'Streaming delivery',
        status: relayTargets.length ? 'READY' : 'OPTIONAL',
        summary: relayTargets.length
          ? 'Relay endpoints are configured as optional acceleration targets.'
          : 'Bunny CDN delivery is active without relay nodes.',
        detail: relayTargets.length
          ? `Configured relay targets: ${relayTargets.join(', ')}`
          : 'Approved titles stream from Bunny with signed HLS and signed asset URLs. Relay nodes are optional, not required.'
      },
      {
        id: 'catalog',
        label: 'Approval to catalog flow',
        status: databaseCheck.status === 'READY' && bunnyStorageCheck.status === 'READY' ? 'READY' : 'ACTION',
        summary:
          databaseCheck.status === 'READY' && bunnyStorageCheck.status === 'READY'
            ? 'Producer uploads are ready for moderation and release.'
            : 'Fix database or storage issues before testing moderation.',
        detail:
          databaseCheck.status === 'READY' && bunnyStorageCheck.status === 'READY'
            ? 'Admin approvals publish titles to homepage and browse. Admin removals clear cached shelves immediately.'
            : 'The upload and release flow depends on both Neon and storage being healthy.'
      }
    ],
    approvedVideos,
    pendingModeration,
    creatorAccounts
  };
}
