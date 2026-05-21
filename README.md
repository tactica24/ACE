# Ace Studio

Ace Studio is a production-ready, Africa-first video marketplace with Firebase Auth identity, Neon-backed relational data, Cloudflare R2 media delivery, wallet unlocks, creator analytics, and admin moderation.

## Stack
- Next.js App Router on Vercel
- Firebase Authentication
- Prisma + Neon PostgreSQL
- Cloudflare R2 (S3 compatible)
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
For the recommended production stack (`Vercel + Firebase Auth + Neon + Cloudflare R2`), use:

- `.env.production.example`
- `DEPLOY_VERCEL_NEON_R2.md`
- `vercel.json` for automatic production migrations during deploy

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
Streaming requests first check `storage/cache`. Cache misses pull from R2 and persist locally for future playback.
You can launch without a dedicated relay node first. In that mode, approved titles stream directly through the app from R2 until you add regional relay nodes later.

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

For public downloads, upload the APK to your own storage. The app checks `ACE_ANDROID_APK_URL` first, then `public/downloads/ace-studio-android.apk`, then `ACE_ANDROID_APK_R2_KEY` in Cloudflare R2. The default R2 key is `downloads/ace-studio-android.apk`.

To build in GitHub instead of on a local machine, install GitHub CLI, run `gh auth login`, then sync the Android signing and storage secrets:

```bash
npm run sync:github-android-secrets
```

If the storage secrets already live in Vercel, install and log in to both CLIs, then pull Vercel production env and sync it into GitHub in one command:

```bash
npm run sync:vercel-android-secrets
```

The Android app loads Firebase public config from `/api/mobile/firebase-config` at startup, so GitHub does not need Firebase secrets to build the APK. After syncing signing/storage secrets, run the `Flutter Mobile` workflow manually from GitHub Actions with `publish_release=true`. If R2 secrets are configured, the workflow uploads `ace-studio-android.apk` to `downloads/ace-studio-android.apk` in your R2 bucket, and the website serves users from storage without requiring GitHub access.

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
- `ffmpeg` and `ffprobe` availability for HLS processing (warning-only when this host is not your transcoder)
- lint and production build gates
- app health smoke check (`/api/health`)
