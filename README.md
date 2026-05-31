# Ace Studio

Ace Studio is an Africa-first video marketplace with Firebase Auth identity, Neon-backed relational data, Bunny Storage delivery, wallet unlocks, creator analytics, admin moderation, and an Akash + Livepeer HLS pipeline for full movies.

## Stack
- Next.js App Router on Vercel
- Railway-compatible Next.js deployment
- Firebase Authentication
- Prisma + Neon PostgreSQL
- Bunny Storage + Bunny CDN token authentication
- Akash orchestration for video pipeline jobs
- Livepeer transcoding into Bunny HLS output
- Paystack payments (NG)
- Stripe Checkout (Diaspora)

## Quick start
1. Copy `.env.example` to `.env` and fill values.
2. Start Postgres (example `docker-compose` below).
3. Run migrations and seed data.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Production deployment
For the current production media stack (`Vercel or Railway + Neon + Firebase + Bunny + Akash + Livepeer`), use:

- `.env.production.example`
- [`DEPLOY_AKASH_LIVEPEER_BUNNY.md`](DEPLOY_AKASH_LIVEPEER_BUNNY.md)
- `vercel.json` if deploying on Vercel and you want production migrations during deploy

## Demo accounts (seed)
- Admin: `admin@acestudio.local` / `AdminPass123!`
- Creator: `creator@acestudio.local` / `CreatorPass123!`
- Viewer: `viewer@acestudio.local` / `ViewerPass123!`

Seeded demo credentials are also provisioned in Firebase Auth when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are configured.

## Paystack callback
Set Paystack callback URL to:
- `ACE_APP_BASE_URL/wallet/verify`

## Stripe webhook
Point Stripe webhook to:
- `ACE_APP_BASE_URL/api/stripe/webhook`
Listen for `checkout.session.completed`.

## Docker compose (Postgres)
```yaml
version: '3.9'
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: ace
      POSTGRES_PASSWORD: ace
      POSTGRES_DB: ace
    ports:
      - '5432:5432'
    volumes:
      - dbdata:/var/lib/postgresql/data
volumes:
  dbdata:
```

## Streaming cache
Approved titles stream through signed playback URLs. Posters and public media assets redirect to signed Bunny CDN URLs. Full protected playback prefers signed Bunny HLS manifests, while the app keeps wallet and access control in front of playback authorization.

## Media pipeline

For a full movie:

1. Admin uploads poster, trailer, subtitles, and master to Bunny.
2. The app stores Bunny keys in the database.
3. The app queues an Akash worker after the master is attached.
4. The Akash worker submits the master to Livepeer.
5. Livepeer writes HLS output to Bunny using Bunny's S3-compatible endpoint.
6. The app verifies the HLS manifest and marks the title ready to stream.
7. Admin can publish the title, then optionally delete the original master once HLS is verified.

Subscription pass purchases also credit the wallet immediately in the current backend flow.

## Legacy asset backfill

If older posters, trailers, subtitles, or masters still live on legacy storage, copy them into Bunny before cutover:

```bash
npm run storage:backfill:legacy -- --source-base-url=https://legacy-media.example.com --dry-run
npm run storage:backfill:legacy -- --source-base-url=https://legacy-media.example.com
```

You can also use a manifest file when the old URLs do not match the stored Bunny key paths:

```bash
npm run storage:backfill:legacy -- --manifest=./scripts/legacy-media-manifest.example.json
```

## Success targets
- Latency: < 20ms in Nigeria
- Wallet unlock to play: < 2 seconds
- Cost per 90-minute view: < N5

## Native Android APK
The Flutter app in `ace_flutter/` is the current native Android path. To publish a direct website download before Play Store release, build the APK and place it at `public/downloads/ace-studio-android.apk`:

```bash
npm run build:android-apk
```

The script reads Firebase values from `.env.local`, `.env.production`, or `.env`, using the existing `NEXT_PUBLIC_FIREBASE_*` keys when matching `ACE_FIREBASE_*` keys are not set. For production release signing, set `ACE_ANDROID_KEYSTORE_PATH`, `ACE_ANDROID_KEYSTORE_PASSWORD`, `ACE_ANDROID_KEY_ALIAS`, and `ACE_ANDROID_KEY_PASSWORD`.

For public downloads, upload the APK to Bunny Storage. The app checks `ACE_ANDROID_APK_URL` first, then `public/downloads/ace-studio-android.apk`, then `ACE_ANDROID_APK_STORAGE_KEY` in Bunny Storage. The default storage key is `downloads/ace-studio-android.apk`.

To build in GitHub instead of on a local machine, install GitHub CLI, run `gh auth login`, then sync the Android signing and storage secrets:

```bash
npm run sync:github-android-secrets
```

If the storage secrets already live in Vercel, install and log in to both CLIs, then pull Vercel production env and sync it into GitHub in one command:

```bash
npm run sync:vercel-android-secrets
```

The Android app loads Firebase public config from `/api/mobile/firebase-config` at startup, so GitHub does not need Firebase secrets to build the APK. After syncing signing/storage secrets, run the `Flutter Mobile` workflow manually from GitHub Actions with `publish_release=true`. If Bunny Storage secrets are configured, the website serves users from storage without requiring GitHub access.

## Archived Expo prototype
The older Expo app remains in `mobile/` for reference only. It is not part of the current production release path, CI release gates, or website download flow.

## Family Pass (Diaspora)
Diaspora users can purchase a Home Bundle that adds wallet credits to a linked Nigerian phone number. Configure credits with `ACE_FAMILY_PASS_CREDITS`.

## Strict launch checklist
Run a pre-launch gate before production cutover:

```bash
npm run launch:check
```

This checks:
- required environment keys and placeholder/test value detection
- optional `ffmpeg` and `ffprobe` availability for hosts that normalize uploaded MP4 masters
- lint and production build gates
- app health smoke check (`/api/health`)
