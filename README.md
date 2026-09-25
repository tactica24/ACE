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
