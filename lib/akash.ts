import { env } from './env';
import { getDefaultHlsOutputPath } from './hls';

type AkashBid = {
  bid?: {
    id?: {
      dseq?: string;
      gseq?: number;
      oseq?: number;
      provider?: string;
    };
  };
};

type AkashCreateDeploymentResponse = {
  data?: {
    dseq?: string;
    manifest?: string;
  };
};

function getAkashApiBaseUrl() {
  return (env.AKASH_API_BASE_URL || 'https://console-api.akash.network').replace(/\/+$/, '');
}

function getAkashHeaders() {
  if (!env.AKASH_API_KEY) {
    throw new Error('AKASH_API_KEY is required for job orchestration.');
  }

  return {
    'x-api-key': env.AKASH_API_KEY,
    'Content-Type': 'application/json'
  };
}

function buildWorkerPythonScript() {
  return [
    'import json, os, time, urllib.request, urllib.error, threading, http.server',
    'def http_ping():',
    '    try:',
    '        server = http.server.ThreadingHTTPServer(("0.0.0.0", 8080), http.server.SimpleHTTPRequestHandler)',
    '        server.serve_forever()',
    '    except Exception:',
    '        pass',
    'threading.Thread(target=http_ping, daemon=True).start()',
    'def request_json(url, method="GET", data=None, headers=None):',
    '    body = None if data is None else json.dumps(data).encode("utf-8")',
    '    req = urllib.request.Request(url, data=body, headers=headers or {}, method=method)',
    '    with urllib.request.urlopen(req, timeout=60) as res:',
    '        payload = res.read().decode("utf-8")',
    '        return json.loads(payload) if payload else {}',
    'def callback(payload):',
    '    request_json(os.environ["CALLBACK_URL"], method="POST", data=payload, headers={"Content-Type": "application/json", "x-ace-pipeline-secret": os.environ["CALLBACK_SECRET"]})',
    'video_id = os.environ["VIDEO_ID"]',
    'master_key = os.environ["MASTER_KEY"]',
    'hls_output_path = os.environ["HLS_OUTPUT_PATH"]',
    'storage_endpoint = os.environ["BUNNY_STORAGE_S3_ENDPOINT"].rstrip("/")',
    'storage_zone = os.environ["BUNNY_STORAGE_ZONE"]',
    'storage_password = os.environ["BUNNY_STORAGE_API_KEY"]',
    'livepeer_base = os.environ.get("LIVEPEER_API_BASE_URL", "https://livepeer.studio/api").rstrip("/")',
    "livepeer_headers = {'Authorization': f\"Bearer {os.environ['LIVEPEER_API_KEY']}\", 'Content-Type': 'application/json'}",
    'payload = {"input": {"type": "s3", "endpoint": storage_endpoint, "credentials": {"accessKeyId": storage_zone, "secretAccessKey": storage_password}, "bucket": storage_zone, "path": f"/{master_key}"}, "storage": {"type": "s3", "endpoint": storage_endpoint, "credentials": {"accessKeyId": storage_zone, "secretAccessKey": storage_password}, "bucket": storage_zone}, "outputs": {"hls": {"path": f"/{hls_output_path}"}}, "targetSegmentSizeSecs": 4, "profiles": [{"name": "360p", "width": 640, "height": 360, "bitrate": 800000, "fps": 30, "fpsDen": 1, "gop": "2", "encoder": "H.264", "profile": "H264Baseline"}, {"name": "720p", "width": 1280, "height": 720, "bitrate": 3000000, "fps": 30, "fpsDen": 1, "gop": "2", "encoder": "H.264", "profile": "H264High"}, {"name": "1080p", "width": 1920, "height": 1080, "bitrate": 5500000, "fps": 30, "fpsDen": 1, "gop": "2", "encoder": "H.264", "profile": "H264High"}]}',
    'task = request_json(f"{livepeer_base}/transcode", method="POST", data=payload, headers=livepeer_headers)',
    'task_id = task.get("id")',
    'callback({"stage": "submitted", "videoId": video_id, "taskId": task_id, "task": task, "hlsOutputPath": hls_output_path})',
    'def get_task(task_id):',
    '    for path in (f"/task/{task_id}", f"/tasks/{task_id}"):',
    '        try:',
    "            return request_json(f\"{livepeer_base}{path}\", method=\"GET\", headers={'Authorization': f\"Bearer {os.environ['LIVEPEER_API_KEY']}\"})",
    '        except urllib.error.HTTPError as error:',
    '            if error.code != 404:',
    '                raise',
    '    raise RuntimeError(f"Livepeer task not found: {task_id}")',
    'for _ in range(240):',
    '    current = get_task(task_id)',
    '    phase = str(((current.get("status") or {}).get("phase") or "")).lower()',
    '    if phase in ("completed", "success", "ready"):',
    '        callback({"stage": "completed", "videoId": video_id, "taskId": task_id, "task": current, "hlsOutputPath": hls_output_path})',
    '        raise SystemExit(0)',
    '    if phase in ("failed", "error"):',
    '        callback({"stage": "failed", "videoId": video_id, "taskId": task_id, "task": current, "hlsOutputPath": hls_output_path})',
    '        raise SystemExit(1)',
    '    time.sleep(15)',
    'callback({"stage": "timeout", "videoId": video_id, "taskId": task_id, "task": {"status": {"phase": "timeout"}}, "hlsOutputPath": hls_output_path})',
    'raise SystemExit(1)'
  ].join('\n');
}

export function buildAkashWorkerSdl(input: {
  callbackUrl: string;
  videoId: string;
  masterKey: string;
  hlsOutputPath?: string | null;
}) {
  if (!env.AKASH_CALLBACK_SECRET) {
    throw new Error('AKASH_CALLBACK_SECRET is required before starting Akash workers.');
  }
  if (!env.LIVEPEER_API_KEY) {
    throw new Error('LIVEPEER_API_KEY is required before starting Akash workers.');
  }
  if (!env.BUNNY_STORAGE_S3_ENDPOINT) {
    throw new Error('BUNNY_STORAGE_S3_ENDPOINT is required before starting Akash workers.');
  }

  const hlsOutputPath = input.hlsOutputPath ?? getDefaultHlsOutputPath(input.videoId);
  const script = buildWorkerPythonScript();
  const envLines = [
    `VIDEO_ID=${input.videoId}`,
    `MASTER_KEY=${input.masterKey}`,
    `HLS_OUTPUT_PATH=${hlsOutputPath}`,
    `CALLBACK_URL=${input.callbackUrl}`,
    `CALLBACK_SECRET=${env.AKASH_CALLBACK_SECRET}`,
    `LIVEPEER_API_KEY=${env.LIVEPEER_API_KEY}`,
    `LIVEPEER_API_BASE_URL=${env.LIVEPEER_API_BASE_URL}`,
    `BUNNY_STORAGE_ZONE=${env.BUNNY_STORAGE_ZONE}`,
    `BUNNY_STORAGE_API_KEY=${env.BUNNY_STORAGE_API_KEY}`,
    `BUNNY_STORAGE_S3_ENDPOINT=${env.BUNNY_STORAGE_S3_ENDPOINT}`
  ];

  return [
    'version: "2.0"',
    'services:',
    '  transcode:',
    `    image: ${env.AKASH_TRANSCODE_IMAGE}`,
    '    command:',
    '      - python',
    '      - -c',
    '    args:',
    '      - |',
    ...script.split('\n').map((line) => `          ${line}`),
    '    env:',
    ...envLines.map((line) => `      - ${line}`),
    '    expose:',
    '      - port: 8080',
    '        as: 80',
    '        to:',
    '          - global: true',
    'profiles:',
    '  compute:',
    '    transcode:',
    '      resources:',
    '        cpu:',
    '          units: 0.5',
    '        memory:',
    '          size: 1Gi',
    '        storage:',
    '          size: 1Gi',
    '  placement:',
    '    akash:',
    '      pricing:',
    '        transcode:',
    '          denom: uakt',
    '          amount: 1000',
    'deployment:',
    '  transcode:',
    '    akash:',
    '      profile: transcode',
    '      count: 1'
  ].join('\n');
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

  throw new Error(`Akash request failed (${response.status}): ${message}`);
}

export async function createAkashDeployment(sdl: string) {
  const deposit = Number.parseFloat(env.AKASH_DEFAULT_DEPOSIT_USD || '0.5');
  const response = await fetch(`${getAkashApiBaseUrl()}/v1/deployments`, {
    method: 'POST',
    headers: getAkashHeaders(),
    body: JSON.stringify({
      data: {
        sdl,
        deposit: Number.isFinite(deposit) && deposit > 0 ? deposit : 0.5
      }
    })
  });

  const payload = await parseJsonResponse(response) as AkashCreateDeploymentResponse;
  const dseq = payload.data?.dseq;
  const manifest = payload.data?.manifest;
  if (!dseq || !manifest) {
    throw new Error('Akash did not return a deployment sequence or manifest.');
  }

  return { dseq, manifest };
}

export async function listAkashBids(dseq: string) {
  const response = await fetch(`${getAkashApiBaseUrl()}/v1/bids?dseq=${encodeURIComponent(dseq)}`, {
    method: 'GET',
    headers: {
      'x-api-key': env.AKASH_API_KEY
    }
  });

  const payload = await parseJsonResponse(response) as { data?: AkashBid[] };
  return payload.data ?? [];
}

export async function waitForAkashBid(dseq: string, attempts = 12, delayMs = 5000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const bids = await listAkashBids(dseq);
    const chosen = bids.find((entry) => entry.bid?.id?.provider && entry.bid.id?.gseq && entry.bid.id?.oseq);
    if (chosen?.bid?.id?.provider && chosen.bid.id.gseq && chosen.bid.id.oseq) {
      return {
        dseq,
        gseq: chosen.bid.id.gseq,
        oseq: chosen.bid.id.oseq,
        provider: chosen.bid.id.provider
      };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Akash did not return a bid for deployment ${dseq} in time.`);
}

export async function createAkashLease(input: {
  manifest: string;
  dseq: string;
  gseq: number;
  oseq: number;
  provider: string;
}) {
  const response = await fetch(`${getAkashApiBaseUrl()}/v1/leases`, {
    method: 'POST',
    headers: getAkashHeaders(),
    body: JSON.stringify({
      manifest: input.manifest,
      leases: [
        {
          dseq: input.dseq,
          gseq: input.gseq,
          oseq: input.oseq,
          provider: input.provider
        }
      ]
    })
  });

  await parseJsonResponse(response);
}

export async function closeAkashDeployment(dseq: string) {
  if (!dseq) return;
  const response = await fetch(`${getAkashApiBaseUrl()}/v1/deployments/${encodeURIComponent(dseq)}`, {
    method: 'DELETE',
    headers: {
      'x-api-key': env.AKASH_API_KEY
    }
  });

  await parseJsonResponse(response);
}
