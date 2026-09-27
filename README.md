# Ace Studio

Ace Studio is a Next.js + Prisma platform for movie streaming, creator monetization, and studio operations. It also includes a Flutter companion app and a local Postgres-based development environment.

## Prerequisites

- Node.js 20.11.1+
- npm 10+
- PostgreSQL 15+ (or Docker)
- Optional: Flutter 3.22+ for mobile-side validation

## Local setup

```bash
git clone https://github.com/tactica24/ACE.git ace-studio
cd ace-studio
npm install
cp .env.example .env
docker compose up -d db
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker Compose (mock media, no live Bunny)

```bash
cp .env.example .env
# Ensure MOCK_BUNNY=1 is set in .env (default in compose)
docker compose up --build
```

This starts Postgres plus the Next.js app with `MOCK_BUNNY=1` for local-only media operations, runs Prisma push + seed, and serves on port 3000.

## Testing

```bash
# Unit specs (node:test via tsx)
npm run test

# Coverage gate (c8)
npm run test:coverage
```

Specs live under `tests/*.test.ts` and cover report formatting, upload security, studio tiers, upload helpers, and moderation status helpers. Coverage is enforced in CI.

Mock-only sequence (no external API keys required for unit tests):

```bash
cp .env.example .env
export MOCK_BUNNY=1
npm run test
npm run test:coverage
```

## Useful commands

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run db:push
npm run db:seed
npm run build
```

## Environment notes

Copy `.env.example` → `.env`. Required groups:

- `DATABASE_URL` / `DIRECT_URL` — Postgres
- Firebase web + admin credentials
- Bunny Storage/Stream (or `MOCK_BUNNY=1` for local mocks)
- Stripe / Paystack keys for payments
- Seed passwords: `ADMIN_SEED_PASSWORD`, `CREATOR_SEED_PASSWORD`, `USER_SEED_PASSWORD`
- Optional: `ACE_SENTRY_DSN` for error tracking bridge
- Optional smoke targets: `ACE_PRODUCTION_SMOKE_BASE_URL`, `TARGET_EMAIL`, `TARGET_ROLE`, `VERCEL_URL`

See `CONTRIBUTING.md` for commit and PR conventions.

## Deployment

Production build runs Prisma generate and Next.js build. Set the same variables from `.env.example` in your host console before starting the app.
