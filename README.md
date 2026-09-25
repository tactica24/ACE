# Ace Studio

Ace Studio is a Next.js + Prisma platform for movie streaming, creator monetization, and studio operations. It also includes a Flutter companion app and a local Postgres-based development environment.

## Prerequisites

- Node.js 20.11.1+
- npm 10+
- PostgreSQL 15+
- Optional: Flutter 3.22+ for mobile-side validation

## Local setup

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url> ace-studio
   cd ace-studio
   npm install
   ```
2. Copy the environment template and fill in your local values:
   ```bash
   cp .env.example .env
   ```
3. Start PostgreSQL locally (or use Docker Compose):
   ```bash
   docker compose up -d db
   ```
4. Push the Prisma schema and seed local auth accounts:
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## Docker Compose setup

For a clean local boot without external live services, you can run the full stack with:

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres plus the Next.js app, sets `MOCK_BUNNY=1` for local-only media operations, and runs the Prisma push + seed bootstrap before the app opens on port 3000.

## Mock service helpers

The repo includes a lightweight mock helper at `scripts/mock-bunny.ts` for tests and local setup flows that need Bunny-like config without a live backend account.

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

- The app expects Firebase web/admin credentials, Bunny Storage/Stream values, Stripe/Paystack keys, and a PostgreSQL `DATABASE_URL`.
- The seed script reads `ADMIN_SEED_PASSWORD`, `CREATOR_SEED_PASSWORD`, and `USER_SEED_PASSWORD` from the environment; do not leave them unset.
- The `.env.example` file includes the common keys used across the app and relay tooling.

## Testing

This repository includes a small real spec suite in `tests/*.test.ts` for status transitions and metadata normalization, alongside the existing legacy verification script. Coverage is enforced with `c8` for the spec suite.

## Deployment notes

The production build runs Prisma generation and Next.js build steps. For managed hosting, set the same environment variables exposed in `.env.example` in your deployment console before starting the app.
