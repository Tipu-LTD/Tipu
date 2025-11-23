export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentIntentId: string;
  createdAt: Date;
}

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}
