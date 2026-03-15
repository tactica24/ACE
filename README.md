# ACE Studio

ACE Studio is a production-ready, Africa-first video marketplace with Lagos Relay caching, wallet unlocks, creator analytics, and admin moderation.

## Stack
- Next.js App Router
- Prisma + PostgreSQL
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

## Demo accounts (seed)
- Admin: `admin@acestudio.local` / `AdminPass123!`
- Creator: `creator@acestudio.local` / `CreatorPass123!`
- Viewer: `viewer@acestudio.local` / `ViewerPass123!`

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
- Cost per 90-minute view: < ₦5

## Mobile app (React Native)
The native app lives in `mobile/` (Expo + Expo Router).

Setup:
```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://localhost:3000 npm run start
```

For device testing, use your machine's LAN IP for `EXPO_PUBLIC_API_URL`.

## Family Pass (Diaspora)
Diaspora users can purchase a Home Bundle that adds wallet credits to a linked Nigerian phone number. Configure credits with `ACE_FAMILY_PASS_CREDITS`.


