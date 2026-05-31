import { env } from './env';
import { getDefaultHlsOutputPath, getHlsManifestKeyFromOutputPath } from './hls';
import { normalizeMediaKey } from './media';

type LivepeerTaskStatus = {
  phase?: string;
  progress?: number;
  error?: string | null;
  message?: string | null;
};

export type LivepeerTask = {
  id: string;
  status?: LivepeerTaskStatus;
  output?: Record<string, unknown> | null;
  params?: {
    outputs?: {
      hls?: {
        path?: string;
      };
    };
  };
};

type LivepeerTranscodePayload = {
  videoId: string;
  masterKey: string;
  hlsOutputPath?: string | null;
};

function getLivepeerApiBaseUrl() {
  return (env.LIVEPEER_API_BASE_URL || 'https://livepeer.studio/api').replace(/\/+$/, '');
}

function getAuthorizationHeaders() {
  if (!env.LIVEPEER_API_KEY) {
    throw new Error('LIVEPEER_API_KEY is required for transcoding.');
  }

  return {
    Authorization: `Bearer ${env.LIVEPEER_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

function getBunnyS3Endpoint() {
  if (!env.BUNNY_STORAGE_S3_ENDPOINT) {
    throw new Error('BUNNY_STORAGE_S3_ENDPOINT is required for Livepeer -> Bunny S3 output.');
  }

  return env.BUNNY_STORAGE_S3_ENDPOINT.replace(/\/+$/, '');
}

function getStorageConfig() {
  if (!env.BUNNY_STORAGE_ZONE || !env.BUNNY_STORAGE_API_KEY) {
    throw new Error('BUNNY_STORAGE_ZONE and BUNNY_STORAGE_API_KEY are required for Livepeer storage.');
  }

  return {
    type: 's3',
    endpoint: getBunnyS3Endpoint(),
    credentials: {
      accessKeyId: env.BUNNY_STORAGE_ZONE,
      secretAccessKey: env.BUNNY_STORAGE_API_KEY
    },
    bucket: env.BUNNY_STORAGE_ZONE
  };
}

async function parseJsonResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) {
    return payload;
  }

  const message =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : response.statusText;

  throw new Error(`Livepeer request failed (${response.status}): ${message}`);
}

export async function submitLivepeerTranscode(payload: LivepeerTranscodePayload) {
  const masterKey = normalizeMediaKey(payload.masterKey);
  if (!masterKey) {
    throw new Error('A Bunny master key is required before sending the video to Livepeer.');
  }

  const hlsOutputPath = payload.hlsOutputPath ?? getDefaultHlsOutputPath(payload.videoId);
  const storage = getStorageConfig();
  const response = await fetch(`${getLivepeerApiBaseUrl()}/transcode`, {
    method: 'POST',
    headers: getAuthorizationHeaders(),
    body: JSON.stringify({
      input: {
        type: 's3',
        endpoint: storage.endpoint,
        credentials: storage.credentials,
        bucket: storage.bucket,
        path: `/${masterKey}`
      },
      storage,
      outputs: {
        hls: {
          path: `/${hlsOutputPath.replace(/^\/+/, '')}`
        }
      },
      targetSegmentSizeSecs: 4,
      profiles: [
        {
          name: '360p',
          width: 640,
          height: 360,
          bitrate: 800000,
          fps: 30,
          fpsDen: 1,
          gop: '2',
          encoder: 'H.264',
          profile: 'H264Baseline'
        },
        {
          name: '720p',
          width: 1280,
          height: 720,
          bitrate: 3000000,
          fps: 30,
          fpsDen: 1,
          gop: '2',
          encoder: 'H.264',
          profile: 'H264High'
        },
        {
          name: '1080p',
          width: 1920,
          height: 1080,
          bitrate: 5500000,
          fps: 30,
          fpsDen: 1,
          gop: '2',
          encoder: 'H.264',
          profile: 'H264High'
        }
      ]
    })
  });

  return parseJsonResponse(response) as Promise<LivepeerTask>;
}

async function fetchTaskFromPath(taskId: string, path: string) {
  const response = await fetch(`${getLivepeerApiBaseUrl()}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.LIVEPEER_API_KEY}`
    }
  });

  if (response.status === 404) {
    return null;
  }

  return parseJsonResponse(response) as Promise<LivepeerTask>;
}

export async function getLivepeerTask(taskId: string) {
  if (!taskId) {
    throw new Error('A Livepeer task id is required.');
  }

  const bySingularPath = await fetchTaskFromPath(taskId, `/task/${encodeURIComponent(taskId)}`);
  if (bySingularPath) {
    return bySingularPath;
  }

  const byPluralPath = await fetchTaskFromPath(taskId, `/tasks/${encodeURIComponent(taskId)}`);
  if (byPluralPath) {
    return byPluralPath;
  }

  throw new Error(`Livepeer task ${taskId} was not found.`);
}

export function getLivepeerTaskPhase(task: LivepeerTask) {
  return task.status?.phase?.toLowerCase() ?? 'unknown';
}

export function getLivepeerHlsOutputPath(task: LivepeerTask, fallbackVideoId?: string) {
  const taskPath = task.params?.outputs?.hls?.path;
  if (typeof taskPath === 'string' && taskPath.trim()) {
    return taskPath.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  return fallbackVideoId ? getDefaultHlsOutputPath(fallbackVideoId) : null;
}

export function getLivepeerManifestKey(task: LivepeerTask, fallbackVideoId?: string) {
  return getHlsManifestKeyFromOutputPath(getLivepeerHlsOutputPath(task, fallbackVideoId));
}
