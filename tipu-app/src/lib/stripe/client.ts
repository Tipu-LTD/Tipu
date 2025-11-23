import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = "pk_test_51SWa1gPPXCmAeaEF83KffwEfuem0kZrUINLFJtGWZy7xKPUhW8Han15hF2znlIlBbazQOzm3PxWthZDPULQdfFt400g4OCnn3e";
    
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
};
