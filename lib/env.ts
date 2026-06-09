// 'server-only' is a Next.js build-time marker. It is not a runtime dependency
// and throws if the Next.js build shim is not present (e.g. during tests or scripts).
// Since this module is used in both server and client components, we avoid importing it directly.
// If you need to ensure this module only runs in server contexts, check process.env.NODE_ENV or use
// Next.js built-in server-only checks where appropriate.
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default(''),
  API_BASE_URL: z.string().min(1).default('http://localhost:3000'),
  BUNNY_STORAGE_API_KEY: z.string().default(''),
  BUNNY_STORAGE_ZONE: z.string().default('ace-studio'),
  BUNNY_STORAGE_ENDPOINT: z.string().default('https://storage.bunnycdn.com'),
  BUNNY_STORAGE_S3_ENDPOINT: z.string().default(''),
  BUNNY_CDN_HOSTNAME: z.string().default('cdn.acestudio.ng'),
  BUNNY_TOKEN_KEY: z.string().default(''),
  CONTABO_TRANSCODE_API_URL: z.string().default(''),
  CONTABO_PIPELINE_SECRET: z.string().default(''),
  ACE_STREAM_SIGNING_SECRET: z.string().default(''),
  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default(''),
  FIREBASE_STORAGE_BUCKET: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().default(''),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().default(''),
  PAYSTACK_SECRET_KEY: z.string().default(''),
  PAYSTACK_PUBLIC_KEY: z.string().default(''),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  ACE_STORAGE_DIR: z.string().min(1).default('./storage'),
  ACE_NODE_NAME: z.string().min(1).default('ace-app-origin-01'),
  ACE_NODE_REGION: z.string().min(1).default('NG'),
  ACE_NODE_LAGOS_URL: z.string().min(1).optional(),
  ACE_NODE_ABUJA_URL: z.string().min(1).optional(),
  ACE_NODE_JHB_URL: z.string().min(1).optional(),
  ACE_USD_NGN_RATE: z.string().min(1).optional(),
  ACE_EUR_NGN_RATE: z.string().min(1).optional(),
  ACE_GBP_NGN_RATE: z.string().min(1).optional(),
  ACE_CAD_NGN_RATE: z.string().min(1).optional(),
  ACE_FAMILY_PASS_CREDITS: z.string().min(1).optional(),
  ACE_GRAFANA_URL: z.string().min(1).optional(),
  ACE_APP_BASE_URL: z.string().min(1).default('http://localhost:3000'),
  ACE_UPLOAD_PROXY_BASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_ACE_UPLOAD_PROXY_BASE_URL: z.string().min(1).optional()
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

const REQUIRED_PRODUCTION_ENV = [
  'DATABASE_URL',
  'API_BASE_URL',
  'BUNNY_STORAGE_API_KEY',
  'BUNNY_STORAGE_ZONE',
  'BUNNY_STORAGE_ENDPOINT',
  'BUNNY_STORAGE_S3_ENDPOINT',
  'BUNNY_TOKEN_KEY',
  'BUNNY_CDN_HOSTNAME',
  'CONTABO_TRANSCODE_API_URL',
  'CONTABO_PIPELINE_SECRET',
  'ACE_STREAM_SIGNING_SECRET',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PUBLIC_KEY',
  'ACE_APP_BASE_URL'
] as const satisfies ReadonlyArray<keyof Env>;

function normalizeEnvValue(value: string | undefined) {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;

  const hasMatchingQuotes =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));

  const unwrapped = hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
  return unwrapped.length > 0 ? unwrapped : undefined;
}

function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsedEnv = envSchema.parse({
    DATABASE_URL: normalizeEnvValue(process.env.DATABASE_URL),
    API_BASE_URL: normalizeEnvValue(process.env.API_BASE_URL),
    BUNNY_STORAGE_API_KEY: normalizeEnvValue(process.env.BUNNY_STORAGE_API_KEY),
    BUNNY_STORAGE_ZONE: normalizeEnvValue(process.env.BUNNY_STORAGE_ZONE),
    BUNNY_STORAGE_ENDPOINT: normalizeEnvValue(process.env.BUNNY_STORAGE_ENDPOINT),
    BUNNY_STORAGE_S3_ENDPOINT: normalizeEnvValue(process.env.BUNNY_STORAGE_S3_ENDPOINT),
    BUNNY_CDN_HOSTNAME: normalizeEnvValue(process.env.BUNNY_CDN_HOSTNAME),
    BUNNY_TOKEN_KEY: normalizeEnvValue(process.env.BUNNY_TOKEN_KEY),
    CONTABO_TRANSCODE_API_URL: normalizeEnvValue(process.env.CONTABO_TRANSCODE_API_URL),
    CONTABO_PIPELINE_SECRET: normalizeEnvValue(process.env.CONTABO_PIPELINE_SECRET),
    ACE_STREAM_SIGNING_SECRET: normalizeEnvValue(process.env.ACE_STREAM_SIGNING_SECRET),
    FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_API_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    NEXT_PUBLIC_FIREBASE_APP_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
    PAYSTACK_SECRET_KEY: normalizeEnvValue(process.env.PAYSTACK_SECRET_KEY),
    PAYSTACK_PUBLIC_KEY: normalizeEnvValue(process.env.PAYSTACK_PUBLIC_KEY),
    STRIPE_SECRET_KEY: normalizeEnvValue(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: normalizeEnvValue(process.env.STRIPE_WEBHOOK_SECRET),
    ACE_STORAGE_DIR: normalizeEnvValue(process.env.ACE_STORAGE_DIR),
    ACE_NODE_NAME: normalizeEnvValue(process.env.ACE_NODE_NAME),
    ACE_NODE_REGION: normalizeEnvValue(process.env.ACE_NODE_REGION),
    ACE_NODE_LAGOS_URL: normalizeEnvValue(process.env.ACE_NODE_LAGOS_URL),
    ACE_NODE_ABUJA_URL: normalizeEnvValue(process.env.ACE_NODE_ABUJA_URL),
    ACE_NODE_JHB_URL: normalizeEnvValue(process.env.ACE_NODE_JHB_URL),
    ACE_USD_NGN_RATE: normalizeEnvValue(process.env.ACE_USD_NGN_RATE),
    ACE_EUR_NGN_RATE: normalizeEnvValue(process.env.ACE_EUR_NGN_RATE),
    ACE_GBP_NGN_RATE: normalizeEnvValue(process.env.ACE_GBP_NGN_RATE),
    ACE_CAD_NGN_RATE: normalizeEnvValue(process.env.ACE_CAD_NGN_RATE),
    ACE_FAMILY_PASS_CREDITS: normalizeEnvValue(process.env.ACE_FAMILY_PASS_CREDITS),
    ACE_GRAFANA_URL: normalizeEnvValue(process.env.ACE_GRAFANA_URL),
    ACE_APP_BASE_URL: normalizeEnvValue(process.env.ACE_APP_BASE_URL),
    ACE_UPLOAD_PROXY_BASE_URL: normalizeEnvValue(process.env.ACE_UPLOAD_PROXY_BASE_URL),
    NEXT_PUBLIC_ACE_UPLOAD_PROXY_BASE_URL: normalizeEnvValue(process.env.NEXT_PUBLIC_ACE_UPLOAD_PROXY_BASE_URL)
  });

  if (process.env.NODE_ENV === 'production') {
    const missing = REQUIRED_PRODUCTION_ENV.filter((key) => !parsedEnv[key]);

    if (missing.length) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(', ')}. ` +
        'Set them before starting the app.'
      );
    }
  }

  cachedEnv = parsedEnv;

  return cachedEnv;
}

export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    return loadEnv()[prop as keyof Env];
  }
});

export function getEnv(): Env {
  return loadEnv();
}

export function getMissingProductionEnvKeys() {
  const parsedEnv = envSchema.parse({
    DATABASE_URL: normalizeEnvValue(process.env.DATABASE_URL),
    API_BASE_URL: normalizeEnvValue(process.env.API_BASE_URL),
    BUNNY_STORAGE_API_KEY: normalizeEnvValue(process.env.BUNNY_STORAGE_API_KEY),
    BUNNY_STORAGE_ZONE: normalizeEnvValue(process.env.BUNNY_STORAGE_ZONE),
    BUNNY_STORAGE_ENDPOINT: normalizeEnvValue(process.env.BUNNY_STORAGE_ENDPOINT),
    BUNNY_STORAGE_S3_ENDPOINT: normalizeEnvValue(process.env.BUNNY_STORAGE_S3_ENDPOINT),
    BUNNY_CDN_HOSTNAME: normalizeEnvValue(process.env.BUNNY_CDN_HOSTNAME),
    BUNNY_TOKEN_KEY: normalizeEnvValue(process.env.BUNNY_TOKEN_KEY),
    CONTABO_TRANSCODE_API_URL: normalizeEnvValue(process.env.CONTABO_TRANSCODE_API_URL),
    CONTABO_PIPELINE_SECRET: normalizeEnvValue(process.env.CONTABO_PIPELINE_SECRET),
    ACE_STREAM_SIGNING_SECRET: normalizeEnvValue(process.env.ACE_STREAM_SIGNING_SECRET),
    FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_API_KEY: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    NEXT_PUBLIC_FIREBASE_APP_ID: normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    PAYSTACK_SECRET_KEY: normalizeEnvValue(process.env.PAYSTACK_SECRET_KEY),
    PAYSTACK_PUBLIC_KEY: normalizeEnvValue(process.env.PAYSTACK_PUBLIC_KEY),
    ACE_APP_BASE_URL: normalizeEnvValue(process.env.ACE_APP_BASE_URL),
    ACE_UPLOAD_PROXY_BASE_URL: normalizeEnvValue(process.env.ACE_UPLOAD_PROXY_BASE_URL),
    NEXT_PUBLIC_ACE_UPLOAD_PROXY_BASE_URL: normalizeEnvValue(process.env.NEXT_PUBLIC_ACE_UPLOAD_PROXY_BASE_URL)
  });

  return REQUIRED_PRODUCTION_ENV.filter((key) => !parsedEnv[key]);
}
