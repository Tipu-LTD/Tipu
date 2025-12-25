import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AuthorizationFormProps {
  clientSecret: string;
  bookingId: string;
  amount: number; // Amount in pence (e.g., 4500 = £45.00)
  scheduledAt: Date;
  onSuccess: () => void;
  isDeferred?: boolean; // true for SetupIntent, false for PaymentIntent
}

export function AuthorizationForm({
  clientSecret,
  bookingId,
  amount,
  scheduledAt,
  onSuccess,
  isDeferred = false
}: AuthorizationFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate charge date (24h before lesson)
  const chargeDate = new Date(scheduledAt.getTime() - (24 * 60 * 60 * 1000));
  const formattedAmount = (amount / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let result;

      if (isDeferred) {
        // SetupIntent flow (save card for future auth - lessons ≥7 days away)
        result = await stripe.confirmSetup({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: window.location.href,
          }
        });
      } else {
        // PaymentIntent flow (authorize immediately - lessons <7 days away)
        result = await stripe.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            return_url: window.location.href,
          }
        });
      }

      if (result.error) {
        setError(result.error.message || 'Card authorization failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      // Success - show simple message
      const message = isDeferred
        ? `Card saved! You'll be charged £${formattedAmount} on ${format(chargeDate, 'PPP')}`
        : `Payment authorized! You'll be charged £${formattedAmount} on ${format(chargeDate, 'PPP')}`;

      toast.success(message);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Informational alert - simple language */}
      <Alert className="bg-blue-50 border-blue-200">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="ml-2 text-sm text-blue-900">
          <p className="font-semibold">
            {isDeferred ? 'Save your card' : 'Authorize your payment'}
          </p>
          <p className="mt-1">
            You'll be charged <strong>£{formattedAmount}</strong> on{' '}
            <strong>{format(chargeDate, 'PPP')}</strong> (24 hours before your lesson).
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Cancel anytime before then for free.
          </p>
        </AlertDescription>
      </Alert>

      {/* Stripe PaymentElement - handles all card input */}
      <div className="rounded-lg border p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {/* Inline error display - stays in modal */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Single submit button - no cancel (modal can't be dismissed) */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {isDeferred ? 'Save Card' : 'Authorize Payment'}
          </>
        )}
      </Button>

      {/* Security reassurance */}
      <p className="text-xs text-gray-500 text-center">
        🔒 Secured by Stripe. Your card details are never stored on our servers.
      </p>
    </form>
  );
}
