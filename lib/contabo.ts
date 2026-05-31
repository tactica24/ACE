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

  const message =
    typeof payload?.error === 'string'
      ? payload.error
      : typeof payload?.message === 'string'
        ? payload.message
        : response.statusText;

  throw new Error(`Contabo worker ${action} failed (${response.status}): ${message}`);
}

export async function createContaboTranscodeJob(input: {
  jobId: string;
  callbackUrl: string;
  videoId: string;
  title: string;
  masterKey: string;
  hlsOutputPath: string;
}) {
  const masterKey = normalizeMediaKey(input.masterKey);
  if (!masterKey) {
    throw new Error('A Bunny master key is required before sending the video to Contabo.');
  }

  const response = await fetch(`${getContaboApiBaseUrl()}/jobs`, {
    method: 'POST',
    headers: getContaboHeaders(),
    body: JSON.stringify({
      jobId: input.jobId,
      videoId: input.videoId,
      title: input.title,
      masterKey,
      hlsOutputPath: input.hlsOutputPath,
      callbackUrl: input.callbackUrl
    })
  });

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

  const response = await fetch(`${getContaboApiBaseUrl()}/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: getContaboHeaders()
  });

  return parseJsonResponse(response, 'status sync') as Promise<ContaboTranscodeJob>;
}

export async function deleteContaboJobArtifacts(jobId: string) {
  if (!jobId) return;

  const response = await fetch(`${getContaboApiBaseUrl()}/jobs/${encodeURIComponent(jobId)}/artifacts`, {
    method: 'DELETE',
    headers: getContaboHeaders()
  });

  await parseJsonResponse(response, 'local artifact cleanup');
}
