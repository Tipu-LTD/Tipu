import { Timestamp } from 'firebase-admin/firestore'

export interface Payment {
  id: string
  userId: string
  bookingId?: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  stripePaymentIntentId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CreatePaymentIntentInput {
  bookingId: string
  amount: number
  currency?: string
}

export interface CreatePaymentIntentResponse {
  clientSecret: string
  paymentIntentId: string
}
