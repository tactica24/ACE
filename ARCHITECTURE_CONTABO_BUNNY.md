# Ace Studio Contabo + Bunny HLS Architecture

Current media path:

`Admin upload -> Bunny master -> Contabo worker -> FFmpeg HLS -> Bunny Storage -> Bunny CDN signed playback`

## Storage model

Bunny Storage is the durable media store used by the app.

Recommended prefixes:

- `uploads/{userId}/movies/{folderId}/masters/` for private source masters
- `uploads/{userId}/movies/{folderId}/posters/` for poster artwork
- `uploads/{userId}/movies/{folderId}/trailers/` for trailers
- `uploads/{userId}/movies/{folderId}/subtitles/` for VTT subtitles
- `streams/{videoId}/hls/` for HLS output

Bunny folders are path prefixes. Uploading `streams/movie-123/hls/index.m3u8` creates that folder path for practical listing and CDN delivery.

## Processing flow

1. Producers/admin upload masters, posters, trailers, and subtitles into movie folders in Bunny.
2. Admin opens the processing panel and clicks `Start Contabo HLS` for one uploaded movie.
3. The app POSTs a job to `CONTABO_TRANSCODE_API_URL/jobs`.
4. The Contabo worker accepts one active movie at a time.
5. The worker downloads a working copy of the Bunny master, transcodes with FFmpeg, and writes HLS files to Bunny.
6. The worker calls `ACE_APP_BASE_URL/api/internal/video-pipeline/callback`.
7. The app verifies the Bunny HLS manifest and first referenced asset.
8. Admin reviews playback, publishes, then deletes the Bunny master and Contabo local artifacts.

The app also blocks a second active Contabo job while one is queued or encoding.

## Contabo worker API contract

All requests use:

`x-ace-pipeline-secret: CONTABO_PIPELINE_SECRET`

### Create job

`POST /jobs`

```json
{
  "jobId": "job-id",
  "videoId": "video-id",
  "title": "Movie title",
  "masterKey": "masters/admin-id/file.mp4",
  "hlsOutputPath": "streams/video-id/hls",
  "callbackUrl": "https://app.example.com/api/internal/video-pipeline/callback"
}
```

Response:

```json
{
  "id": "job-id",
  "status": "queued",
  "hlsOutputPath": "streams/video-id/hls",
  "hlsManifestKey": "streams/video-id/hls/index.m3u8"
}
```

### Sync job

`GET /jobs/{jobId}`

Response status values: `queued`, `processing`, `completed`, `ready`, `failed`, `error`, or `timeout`.

### Cleanup local artifacts

`DELETE /jobs/{jobId}/artifacts`

The worker should delete the Contabo local master copy, HLS working directory, logs that are no longer needed, and any temp files for that job. It must not delete Bunny HLS output.

## Callback contract

The worker posts:

```json
{
  "stage": "completed",
  "videoId": "video-id",
  "jobId": "job-id",
  "hlsOutputPath": "streams/video-id/hls",
  "hlsManifestKey": "streams/video-id/hls/index.m3u8"
}
```

Supported stages:

- `submitted`
- `completed`
- `failed`
- `timeout`

On failure, include `error` or `message`.

## Migration from R2

Existing R2 assets can be migrated into Bunny with:

```bash
npm run storage:backfill:legacy -- --dry-run
npm run storage:backfill:legacy
```

The script can pull from a public legacy base URL, a manifest file, or private R2 credentials. It preserves the keys stored in the database, so posters, trailers, subtitles, and masters continue to resolve after Bunny is configured.
