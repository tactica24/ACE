# ACE Deployment Runbook

This is the current production path for the app:

- `Next.js app/API`: deploy on `Vercel` or `Railway`
- `Database`: `Neon Postgres`
- `Auth`: `Firebase`
- `Storage + delivery`: `Bunny Storage` + `Bunny CDN`
- `Orchestration`: `Akash`
- `Transcoding`: `Livepeer`
- `Viewer playback`: signed `HLS` from Bunny

## 1. What runs where

### App host
Use either:

- `Vercel` if you want the easiest Next.js hosting path
- `Railway` if you want the app server outside Vercel

The current codebase supports either one. The app host is responsible for:

- admin uploads and metadata writes
- auth, wallet, catalog, and moderation APIs
- Akash job creation
- receiving Akash pipeline callbacks
- issuing signed Bunny playback URLs

### Akash
Akash runs the worker deployment created by the app. The worker:

1. receives the Bunny master key and target HLS path
2. submits the master to Livepeer
3. polls Livepeer until completion or failure
4. calls back into the app with pipeline status

### Livepeer
Livepeer transcodes the uploaded master into HLS and writes the output to Bunny through Bunny's S3-compatible endpoint.

### Bunny
Bunny is the only storage and delivery layer for:

- posters
- master uploads
- trailers
- subtitles
- HLS manifests
- HLS segments
- APK downloads when configured

## 2. Required environment

Set the full production environment from `.env.production.example`.

The most important media pipeline values are:

```bash
BUNNY_STORAGE_API_KEY=
BUNNY_STORAGE_ZONE=
BUNNY_STORAGE_ENDPOINT=https://storage.bunnycdn.com
BUNNY_STORAGE_S3_ENDPOINT=
BUNNY_CDN_HOSTNAME=
BUNNY_TOKEN_KEY=

AKASH_API_BASE_URL=https://console-api.akash.network
AKASH_API_KEY=
AKASH_DEFAULT_DEPOSIT_USD=0.5
AKASH_TRANSCODE_IMAGE=python:3.12-alpine
AKASH_CALLBACK_SECRET=

LIVEPEER_API_BASE_URL=https://livepeer.studio/api
LIVEPEER_API_KEY=

ACE_APP_BASE_URL=
ACE_STREAM_SIGNING_SECRET=
DATABASE_URL=
```

Notes:

- `ACE_APP_BASE_URL` must be the public URL of the deployed app because Akash workers call back into `/api/internal/video-pipeline/callback`.
- `AKASH_CALLBACK_SECRET` must be a long random shared secret.
- `BUNNY_STORAGE_S3_ENDPOINT` must point to Bunny's S3-compatible endpoint for the storage zone you want Livepeer to write into.

## 3. Database rollout

Before first production use:

```bash
npx prisma generate
npx prisma migrate deploy
```

The HLS pipeline requires the schema that tracks:

- Akash deployment/job IDs
- Livepeer task IDs
- HLS manifest and output paths
- transcode failures
- master deletion eligibility

## 4. Deploy the app

### Vercel

1. Add the production env values.
2. Deploy the Next.js app.
3. Confirm `/api/health` responds.
4. Confirm the admin can sign in.

### Railway

1. Add the same production env values.
2. Deploy the Next.js app as a Node service.
3. Confirm `/api/health` responds.
4. Confirm the admin can sign in.

The app no longer depends on R2. Do not set R2 variables.

## 5. Bunny setup

You need:

1. a Bunny Storage zone
2. a Bunny pull/CDN hostname for signed delivery
3. token authentication configured with `BUNNY_TOKEN_KEY`

The app uses:

- direct Bunny uploads for admin assets
- signed Bunny CDN URLs for posters and protected playback
- directory-style token signing for HLS playback

## 6. Legacy asset migration into Bunny

If old posters, trailers, subtitles, or masters still live on legacy storage, use the backfill script:

```bash
npm run storage:backfill:legacy -- --source-base-url=https://legacy-media.example.com --dry-run
```

Then run the real copy:

```bash
npm run storage:backfill:legacy -- --source-base-url=https://legacy-media.example.com
```

Optional manifest format:

```json
[
  {
    "key": "posters/my-movie.jpg",
    "url": "https://legacy.example.com/custom/path/poster.jpg"
  },
  {
    "key": "uploads/admin-id/master.mp4",
    "url": "https://legacy.example.com/custom/path/master.mp4"
  }
]
```

Run with:

```bash
npm run storage:backfill:legacy -- --manifest=./scripts/legacy-media-manifest.example.json
```

The script scans the database for video-related keys and copies them into Bunny under the same key names, so the existing database records continue working after the copy.

## 7. New upload flow

For new titles:

1. admin uploads poster/trailer/subtitles/master to Bunny
2. app saves metadata and attaches the Bunny keys
3. app queues the Akash worker automatically after master attachment
4. Akash worker submits the master to Livepeer
5. Livepeer writes HLS output to Bunny
6. app verifies the HLS manifest and marks the title `READY`
7. admin publishes the title
8. admin may delete the master after HLS is verified

## 8. Immediate go-live checklist

1. Set all production env values.
2. Run `npx prisma migrate deploy`.
3. Deploy the app to `Vercel` or `Railway`.
4. Verify Bunny signed asset delivery works.
5. Backfill legacy posters and masters into Bunny.
6. Upload one fresh master in admin and confirm:
   - Akash deployment is created
   - Livepeer task is linked
   - HLS manifest appears in Bunny
   - playback opens from signed HLS
7. Publish the title.
8. Delete the master only after the admin panel shows it is eligible.

## 9. Truthful current caveat

The code path is now aligned to `Akash + Livepeer + Bunny + HLS`, but you should still run:

```bash
npm install
npm run typecheck
npm run build
npm run test
```

before calling the deployment finished. In this workspace, dependency installation was blocked by disk space, so those final verification steps still need to be rerun on a machine with enough free space.
