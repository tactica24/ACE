# Deploy ACE on Vercel + Neon + R2

This repository is already shaped for a `Next.js + Prisma + PostgreSQL + object storage` deployment.
The recommended production stack is:

- `Vercel` for the Next.js application
- `Neon` for PostgreSQL
- `Cloudflare R2` for media storage

## 1. Create the production services

### Vercel
- Create a new Vercel project from this repository.
- Set the production domain you want to use.

### Neon
- Create a Neon project and database.
- Copy two connection strings:
  - pooled connection string for `DATABASE_URL`
  - direct connection string for `DIRECT_URL`

Use the pooled string for runtime traffic and the direct string for Prisma migrations.

### Cloudflare R2
- Create a bucket for video and poster uploads.
- Create an R2 API token with read and write access to that bucket.
- Copy:
  - `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`

## 2. Set Vercel environment variables

Copy values from `.env.production.example` into Vercel Project Settings -> Environment Variables.

Required variables for production:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `ACE_STREAM_SIGNING_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_REGION`
- `ACE_APP_BASE_URL`

Set Stripe variables if you plan to use diaspora checkout:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional:

- `ACE_CDN_BASE_URL`
- `ACE_NODE_LAGOS_URL`
- `ACE_NODE_ABUJA_URL`
- `ACE_NODE_JHB_URL`
- `ACE_GRAFANA_URL`
- `ACE_USD_NGN_RATE`
- `ACE_GBP_NGN_RATE`
- `ACE_CAD_NGN_RATE`
- `ACE_FAMILY_PASS_CREDITS`

## 3. Run production migrations

Before the first production deploy, run:

```bash
npx prisma migrate deploy
```

Then seed initial accounts if you want the default admin and creator records:

```bash
npm run db:seed
```

You can run those from any machine with Node.js access to the production Neon database.

## 4. Deploy on Vercel

Recommended build flow:

```bash
npm install
npm run vercel:build
```

This repository is now configured so Vercel runs:

- `prisma migrate deploy`
- then the production Next.js build

That means schema migrations apply automatically during deploy.
If `DIRECT_URL` is set, migration commands will use it.
If `DIRECT_URL` is not set, they fall back to `DATABASE_URL`.

## 5. Post-deploy checks

Validate these flows on the live site:

1. Register a creator account.
2. Log in and complete creator onboarding.
3. Upload a title with poster artwork.
4. Confirm the upload appears in the creator library.
5. Log in as admin and approve the title in moderation.
6. Confirm the title appears on:
   - homepage
   - browse page
   - TV page
   - single-title page
7. Confirm poster image loads correctly from R2.
8. Confirm unlock flow works with wallet/payment configuration.

## 6. Important runtime notes

- `DATABASE_URL` should be the Neon pooled connection string.
- `DIRECT_URL` is recommended for migrations, but not strictly required.
- `ACE_APP_BASE_URL` must be the final production URL so callbacks and cookies behave correctly.
- Uploads and posters will not work until R2 credentials are set correctly.
- This repo currently expects a Node-enabled environment for build, Prisma CLI, and deployment operations.

## 7. One-click production bootstrap

A GitHub Actions workflow is included at `.github/workflows/bootstrap-production.yml`.

After you add these GitHub repository secrets:

- `DATABASE_URL`
- `DIRECT_URL`

you can run the workflow from the Actions tab to:

1. install dependencies
2. run `prisma migrate deploy`
3. optionally run `npm run db:seed`

That gives you a one-click database bootstrap without needing to run local CLI commands yourself.
