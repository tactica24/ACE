import { env } from './env';
import { normalizeMediaKey } from './media';

export type ContaboJobStatus = 'queued' | 'processing' | 'completed' | 'ready' | 'failed' | 'error' | 'timeout';

export type ContaboTranscodeJob = {
  id: string;
  status?: ContaboJobStatus | string | null;
  message?: string | null;
  error?: string | null;
  hlsOutputPath?: string | null;
  hlsManifestKey?: string | null;
};

const DEFAULT_CONTABO_TIMEOUT_MS = 20_000;

function getContaboApiBaseUrl() {
  if (!env.CONTABO_TRANSCODE_API_URL) {
    throw new Error('CONTABO_TRANSCODE_API_URL is required for Contabo transcoding.');
  }

  return env.CONTABO_TRANSCODE_API_URL.replace(/\/+$/, '');
}

function getContaboHeaders() {
  if (!env.CONTABO_PIPELINE_SECRET) {
    throw new Error('CONTABO_PIPELINE_SECRET is required for Contabo pipeline requests.');
  }

  return {
    'Content-Type': 'application/json',
    'x-ace-pipeline-secret': env.CONTABO_PIPELINE_SECRET
  };
}

async function parseJsonResponse(response: Response, action: string) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;

  const baseUrl = getContaboApiBaseUrl();
  const message =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : response.statusText;

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Contabo worker ${action} was rejected by ${baseUrl} (${response.status}). ` +
      `Check that CONTABO_PIPELINE_SECRET in this app matches the worker's x-ace-pipeline-secret expectation. ` +
      `Worker response: ${message}`
    );
  }

  throw new Error(`Contabo worker ${action} failed (${response.status}): ${message}`);
}

async function fetchContabo(
  path: string,
  init: RequestInit,
  action: string,
  timeoutMs = DEFAULT_CONTABO_TIMEOUT_MS
) {
  const baseUrl = getContaboApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Contabo worker ${action} timed out after ${Math.round(timeoutMs / 1000)}s. ` +
        `Check ${baseUrl} and confirm the worker is online.`
      );
    }

    throw new Error(
      `Contabo worker ${action} could not be reached at ${baseUrl}. ` +
      `${error instanceof Error ? error.message : 'Unknown network error.'}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function createContaboTranscodeJob(input: {
  jobId: string;
  callbackUrl: string;
  videoId: string;
  title: string;
  masterKey?: string | null;
  masterUrl?: string | null;
  hlsOutputPath: string;
}) {
  const masterKey = normalizeMediaKey(input.masterKey ?? null);
  const masterUrl = typeof input.masterUrl === 'string' ? input.masterUrl.trim() : '';
  if (!masterKey && !masterUrl) {
    throw new Error('A Bunny master key or source master URL is required before sending the video to Contabo.');
  }

  const response = await fetchContabo('/jobs', {
    method: 'POST',
    headers: getContaboHeaders(),
    body: JSON.stringify({
      jobId: input.jobId,
      videoId: input.videoId,
      title: input.title,
      ...(masterKey ? { masterKey } : {}),
      ...(masterUrl ? { masterUrl } : {}),
      hlsOutputPath: input.hlsOutputPath,
      callbackUrl: input.callbackUrl
    })
  }, 'job creation');

  const payload = (await parseJsonResponse(response, 'job creation')) as ContaboTranscodeJob;
  if (!payload.id) {
    throw new Error('Contabo worker did not return a job id.');
  }

  return payload;
}

export async function getContaboTranscodeJob(jobId: string) {
  if (!jobId) {
    throw new Error('A Contabo job id is required.');
  }

  const response = await fetchContabo(`/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: getContaboHeaders()
  }, 'status sync', 12_000);

  return parseJsonResponse(response, 'status sync') as Promise<ContaboTranscodeJob>;
}

export async function deleteContaboJobArtifacts(jobId: string) {
  if (!jobId) return;

  const response = await fetchContabo(`/jobs/${encodeURIComponent(jobId)}/artifacts`, {
    method: 'DELETE',
    headers: getContaboHeaders()
  }, 'artifact cleanup', 12_000);

  await parseJsonResponse(response, 'local artifact cleanup');
}
