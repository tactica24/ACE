# Deploy Contabo + Bunny HLS

## Required services

- App host: Vercel or Railway
- Database: Neon PostgreSQL
- Auth: Firebase
- Durable media: Bunny Storage
- CDN: Bunny CDN with token authentication
- Transcode worker: Contabo VPS with FFmpeg

## App environment

```bash
BUNNY_STORAGE_API_KEY=
BUNNY_STORAGE_ZONE=ace-studio
BUNNY_STORAGE_ENDPOINT=https://storage.bunnycdn.com
BUNNY_STORAGE_S3_ENDPOINT=https://your-region-s3.storage.bunnycdn.com
BUNNY_CDN_HOSTNAME=cdn.acestudio.ng
BUNNY_TOKEN_KEY=

CONTABO_TRANSCODE_API_URL=https://transcode.example.com
CONTABO_PIPELINE_SECRET=
ACE_APP_BASE_URL=https://your-production-domain.com
```

`CONTABO_PIPELINE_SECRET` must match the secret configured on the VPS worker.

Contabo account API credentials such as client ID/client secret are not needed by the movie pipeline unless you later automate VPS provisioning or server management. Keep those credentials outside git and set them only in the secure environment where that automation runs.

## Contabo worker requirements

Install:

- Node.js or your preferred API runtime
- FFmpeg
- Enough local disk for one source master plus one HLS working copy
- A process manager such as systemd or PM2

This repo includes a reference worker:

```bash
npm run worker:contabo
```

The worker should keep this directory layout:

```text
/srv/ace-transcode/
  queue/
  work/{jobId}/master/
  work/{jobId}/hls/
  logs/
```

Only one job should run at a time. If a second job is requested while one is active, the worker should return HTTP `409` with a clear error message.

## FFmpeg output

Use a deterministic output path:

```text
streams/{videoId}/hls/index.m3u8
```

Suggested variants:

- 360p around 800k
- 720p around 3000k
- 1080p around 5500k

Segment length should be about 4 seconds.

## Bunny upload

Upload every generated HLS file to Bunny Storage using the storage API key. A nested key such as `streams/{videoId}/hls/720p/segment_000.ts` is enough; Bunny treats the path as the folder structure.

The app now also creates marker files on first upload prep so movie folders are visible in Bunny under:

```text
uploads/{userId}/movies/{folderId}/masters
uploads/{userId}/movies/{folderId}/posters
uploads/{userId}/movies/{folderId}/trailers
uploads/{userId}/movies/{folderId}/subtitles
```

Set content types where possible:

- `.m3u8`: `application/vnd.apple.mpegurl`
- `.ts`: `video/mp2t`
- `.m4s`: `video/iso.segment`

## Completion checks

Before callback, the worker should confirm:

1. `index.m3u8` exists in Bunny.
2. The manifest contains `#EXTM3U`.
3. At least one referenced segment or variant playlist exists in Bunny.

Then POST the `completed` callback to the app.

## Cleanup

After admin confirms and presses delete in the app, the app calls:

```http
DELETE /jobs/{jobId}/artifacts
```

The worker should delete only local Contabo files for that job. Bunny HLS output remains the streaming source.
