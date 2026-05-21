import crypto from 'node:crypto';
import { env } from './env';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function initializeTransaction(args: {
  amountNaira: number;
  email: string;
  reference: string;
  metadata?: Record<string, unknown>;
}) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: args.amountNaira * 100,
      email: args.email,
      reference: args.reference,
      metadata: args.metadata ?? {}
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack init failed: ${text}`);
  }

  return res.json() as Promise<{ status: boolean; data: { authorization_url: string; reference: string } }>;
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack verify failed: ${text}`);
  }

  return res.json() as Promise<{
    status: boolean;
    data: { status: string; amount: number; metadata: Record<string, unknown>; currency?: string; fees?: number };
  }>;
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !env.PAYSTACK_SECRET_KEY) {
    return false;
  }

  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'));
}
