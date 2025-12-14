import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { penceToPounds } from '@/utils/currency';
import { Loader2 } from 'lucide-react';

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

function CheckoutForm({ amount, onSuccess, onBack }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await onSuccess(paymentIntent.id);
      }
    } catch (error) {
      toast.error('Payment processing failed');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 bg-muted">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Amount to pay</p>
          <p className="text-3xl font-bold text-primary">{penceToPounds(amount)}</p>
        </div>
      </Card>

      <PaymentElement />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isProcessing}>
          Back
        </Button>
        <Button type="submit" disabled={!stripe || isProcessing} className="flex-1">
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ${penceToPounds(amount)}`
          )}
        </Button>
      </div>
    </form>
  );
}

export function PaymentForm({ clientSecret, amount, onSuccess, onBack }: PaymentFormProps) {
  const stripePromise = getStripe();

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}
