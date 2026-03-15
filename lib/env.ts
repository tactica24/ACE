import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  ACE_STREAM_SIGNING_SECRET: z.string().min(1),
  PAYSTACK_SECRET_KEY: z.string().min(1),
  PAYSTACK_PUBLIC_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  R2_ENDPOINT: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_REGION: z.string().min(1).default('auto'),
  ACE_STORAGE_DIR: z.string().min(1).default('./storage'),
  ACE_NODE_NAME: z.string().min(1).default('lagos-relay-01'),
  ACE_NODE_REGION: z.string().min(1).default('NG'),
  ACE_NODE_LAGOS_URL: z.string().min(1).optional(),
  ACE_NODE_ABUJA_URL: z.string().min(1).optional(),
  ACE_NODE_JHB_URL: z.string().min(1).optional(),
  ACE_CDN_BASE_URL: z.string().min(1).optional(),
  ACE_USD_NGN_RATE: z.string().min(1).optional(),
  ACE_GBP_NGN_RATE: z.string().min(1).optional(),
  ACE_CAD_NGN_RATE: z.string().min(1).optional(),
  ACE_FAMILY_PASS_CREDITS: z.string().min(1).optional(),
  ACE_GRAFANA_URL: z.string().min(1).optional(),
  ACE_APP_BASE_URL: z.string().min(1).default('http://localhost:3000')
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ACE_STREAM_SIGNING_SECRET: process.env.ACE_STREAM_SIGNING_SECRET,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_REGION: process.env.R2_REGION ?? 'auto',
  ACE_STORAGE_DIR: process.env.ACE_STORAGE_DIR ?? './storage',
  ACE_NODE_NAME: process.env.ACE_NODE_NAME ?? 'lagos-relay-01',
  ACE_NODE_REGION: process.env.ACE_NODE_REGION ?? 'NG',
  ACE_NODE_LAGOS_URL: process.env.ACE_NODE_LAGOS_URL,
  ACE_NODE_ABUJA_URL: process.env.ACE_NODE_ABUJA_URL,
  ACE_NODE_JHB_URL: process.env.ACE_NODE_JHB_URL,
  ACE_CDN_BASE_URL: process.env.ACE_CDN_BASE_URL,
  ACE_USD_NGN_RATE: process.env.ACE_USD_NGN_RATE,
  ACE_GBP_NGN_RATE: process.env.ACE_GBP_NGN_RATE,
  ACE_CAD_NGN_RATE: process.env.ACE_CAD_NGN_RATE,
  ACE_FAMILY_PASS_CREDITS: process.env.ACE_FAMILY_PASS_CREDITS,
  ACE_GRAFANA_URL: process.env.ACE_GRAFANA_URL,
  ACE_APP_BASE_URL: process.env.ACE_APP_BASE_URL ?? 'http://localhost:3000'
});



