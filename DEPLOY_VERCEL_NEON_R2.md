# Deploy ACE on Vercel + Firebase Auth + Neon + R2

This repository is already shaped for a `Next.js + Firebase Authentication + Prisma + PostgreSQL + object storage` deployment.
The recommended production stack is:

- `Vercel` for the Next.js application
- `Firebase Authentication` for user sign-in and session management
- `Neon` for PostgreSQL
- `Cloudflare R2` for media storage

## 1. Create the production services

### Vercel
- Create a new Vercel project from this repository.
- Set the production domain you want to use.

### Firebase
- Create a Firebase project.
- Enable `Email/Password` in Firebase Authentication.
- In Project Settings, collect the Web App config values:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- In Firebase Console -> Project settings -> Service accounts, create a private key and copy:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`
- Optional:
  - `FIREBASE_STORAGE_BUCKET`

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
- Add an R2 CORS policy that allows browser uploads from your app domain.
  Recommended minimum:
  - Origins: your `ACE_APP_BASE_URL` domain and any active Vercel preview domain you test with
  - Methods: `PUT`, `GET`, `HEAD`
  - Allowed headers: `Content-Type`

## 2. Set Vercel environment variables

Copy values from `.env.production.example` into Vercel Project Settings -> Environment Variables.

Required variables for production:

- `DATABASE_URL`
- `DIRECT_URL`
- `ACE_STREAM_SIGNING_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
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

- `FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `ACE_CDN_BASE_URL` for media assets
- `ACE_NODE_LAGOS_URL`
- `ACE_NODE_ABUJA_URL`
- `ACE_NODE_JHB_URL`
- `ACE_GRAFANA_URL`
- `ACE_USD_NGN_RATE`
- `ACE_GBP_NGN_RATE`
- `ACE_CAD_NGN_RATE`
- `ACE_FAMILY_PASS_CREDITS`

## 3. Sync the production schema

Before the first production deploy, run:

```bash
npm run db:migrate:deploy
```

Then seed initial accounts if you want the default admin and creator records:

```bash
npm run db:seed
```

You can run those from any machine with Node.js access to the production Neon database and Firebase Admin credentials.

## 4. Deploy on Vercel

Recommended build flow:

```bash
npm install
npm run vercel:build
```

This repository is now configured so Vercel runs:

- an idempotent SQL repair for the known `202603170001_tv_pairing` partial migration state
- `prisma migrate resolve --applied 202603170001_tv_pairing`
- `prisma migrate deploy`
- then the production Next.js build

That means the known stuck production migration state is repaired automatically, then committed Prisma migrations are applied during deploy.

## 5. Post-deploy checks

Validate these flows on the live site:

1. Register a viewer account with Firebase-backed sign-in.
2. Log in and confirm `/account` and `/wallet` resolve your Neon user record.
3. Register a creator account and complete creator onboarding.
4. Upload a title with poster artwork.
5. Confirm the upload appears in the creator library.
6. Log in as admin and approve the title in moderation.
7. Confirm the title appears on:
   - homepage
   - browse page
   - TV page
   - single-title page
8. Confirm poster image loads correctly from R2.
9. Confirm unlock flow works with wallet/payment configuration.
10. Confirm TV pairing signs the TV into Firebase and then into the web session.

You do not need to provision a relay node before these checks. Without `ACE_NODE_*` values, the app streams approved titles directly through the Next.js origin from R2.

## 6. Important runtime notes

- `DATABASE_URL` should be the Neon pooled connection string.
- `DIRECT_URL` is recommended for migrations, but not strictly required.
- `ACE_APP_BASE_URL` must be the final production URL so callbacks and cookies behave correctly.
- Uploads and posters will not work until R2 credentials are set correctly.
- Firebase Admin credentials must be valid on Vercel for auth session verification and seeded demo-account provisioning.
- This repo currently expects a Node-enabled environment for build, Prisma CLI, and deployment operations.

## 7. GitHub bootstrap workflow

A GitHub Actions workflow is included at `.github/workflows/bootstrap-production.yml`.

Add these GitHub repository secrets before running it:

- `DATABASE_URL`
- `DIRECT_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

You can then use the workflow from the Actions tab to:

1. install dependencies
2. run `npm run db:migrate:deploy`
3. optionally run `npm run db:seed`

That gives you a one-click database bootstrap for Neon plus Firebase-backed demo users.

## 8. GitHub migration repair workflow

If production gets stuck on a previously failed Prisma migration, use `.github/workflows/repair-production-migration.yml`.

It lets you:

1. enter the failed migration name
2. mark it as `rolled-back` or `applied`
3. run `npm run db:migrate:deploy`

This is safer than trying to auto-resolve failed migrations on every deploy, because Prisma recovery needs an explicit choice based on the actual database state.
