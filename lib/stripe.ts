import Stripe from 'stripe';
import { env } from './env';

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe not configured');
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10'
  });
}

