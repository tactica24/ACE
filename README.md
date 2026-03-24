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

## Lagos Relay cache
Streaming requests first check `storage/cache`. Cache misses pull from R2 and persist locally for future low-latency playback.

## P2P `.ace` flow
1. Sender creates encrypted `.ace` file via `/api/p2p/create`.
2. Recipient unlocks via `/api/p2p/unlock` using wallet.
3. Recipient streams decrypted video via `/api/p2p/download/:id`.

## Success targets
- Latency: < 20ms in Nigeria
- Wallet unlock to play: < 2 seconds
- Cost per 90-minute view: < N5

## Mobile app (React Native)
The native app lives in `mobile/` (Expo + Expo Router).

Setup:
```bash
npm run env:sync:mobile
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 \
EXPO_PUBLIC_FIREBASE_API_KEY=... \
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=... \
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
EXPO_PUBLIC_FIREBASE_APP_ID=... \
npm run start
```

For device testing, use your machine's LAN IP for `EXPO_PUBLIC_API_URL`.
If your root `.env` already has the Firebase web config, you can generate `mobile/.env.local` automatically with `npm run env:sync:mobile`.

## Family Pass (Diaspora)
Diaspora users can purchase a Home Bundle that adds wallet credits to a linked Nigerian phone number. Configure credits with `ACE_FAMILY_PASS_CREDITS`.

## Strict launch checklist
Run a pre-launch gate before production cutover:

```bash
npm run launch:check
```

This checks:
- required `.env` keys and placeholder/test value detection
- `ffmpeg` and `ffprobe` availability for HLS processing (warning-only when this host is not your transcoder)
- lint and production build gates
- relay health smoke check (`/api/health`)
