import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { penceToPounds } from '@/utils/currency';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { Booking } from '@/types/booking';

interface PaymentPromptProps {
  booking: Booking;
  onPayNow: () => void;
  isLoading?: boolean;
}

export function PaymentPrompt({ booking, onPayNow, isLoading }: PaymentPromptProps) {
  return (
    <Alert className="bg-yellow-50 border-yellow-200 mb-4">
      <CheckCircle2 className="h-5 w-5 text-yellow-600" />
      <AlertDescription className="flex items-center justify-between ml-2">
        <div>
          <p className="font-semibold text-yellow-900">
            Tutor Accepted - Payment Required
          </p>
          <p className="text-sm text-yellow-700">
            Complete payment to confirm your lesson ({penceToPounds(booking.price)})
          </p>
        </div>
        <Button
          onClick={onPayNow}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 ml-4"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {isLoading ? 'Processing...' : 'Pay Now'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
