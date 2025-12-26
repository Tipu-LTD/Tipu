import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      throw new Error('Stripe publishable key is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your environment variables.');
    }

    stripePromise = loadStripe(publishableKey, {
      apiVersion: '2025-12-15'  // Match backend API version
    });
  }

  return stripePromise;
};
