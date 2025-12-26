import { apiRequest } from './client';
import { Payment, PaymentIntent } from '@/types/payment';

export interface CreatePaymentIntentData {
  bookingId: string;
  amount: number;
  currency?: string;
}

export interface PaymentHistoryResponse {
  payments: Payment[];
}

export interface ConnectAccountResponse {
  accountId: string;
  onboardingUrl: string;
}

export const paymentsApi = {
  createIntent: (data: CreatePaymentIntentData) =>
    apiRequest<PaymentIntent>('/v1/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getHistory: (params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<PaymentHistoryResponse>(`/v1/payments/history${query ? `?${query}` : ''}`);
  },

  createConnectAccount: () =>
    apiRequest<ConnectAccountResponse>('/v1/payments/connect-account', {
      method: 'POST'
    }),

  // Create authorization (manual capture) for immediate auth flow (<7 days)
  createAuthorization: (bookingId: string) =>
    apiRequest<{ clientSecret: string; paymentIntentId: string; expiresAt: string }>(
      '/v1/payments/authorize',
      {
        method: 'POST',
        body: JSON.stringify({ bookingId })
      }
    ),

  // Create SetupIntent (save card for deferred auth flow ≥7 days)
  createSetupIntent: (bookingId: string) =>
    apiRequest<{ clientSecret: string; setupIntentId: string }>(
      '/v1/payments/setup-intent',
      {
        method: 'POST',
        body: JSON.stringify({ bookingId })
      }
    ),
};
