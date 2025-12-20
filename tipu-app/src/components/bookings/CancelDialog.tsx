import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { bookingsApi } from '@/lib/api/bookings';
import { Booking } from '@/types/booking';
import { AlertCircle, Info } from 'lucide-react';

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
}

export function CancelDialog({
  open,
  onOpenChange,
  booking
}: CancelDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const cancelMutation = useMutation({
    mutationFn: (data: { reason?: string }) =>
      bookingsApi.cancel(booking.id, data),
    onSuccess: (response) => {
      const message = response.refunded
        ? 'Lesson cancelled. Refund is being processed.'
        : 'Lesson cancelled successfully';
      toast.success(message);

      // Invalidate multiple queries
      queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel lesson');
    }
  });

  const handleSubmit = () => {
    cancelMutation.mutate({ reason: reason || undefined });
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Lesson</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this lesson?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Refund Alert */}
          {booking.isPaid && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                This lesson has been paid for. A full refund will be processed to the original payment method.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for Completed */}
          {booking.status === 'completed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This lesson has been completed and cannot be cancelled.
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you cancelling this lesson?"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={cancelMutation.isPending}
            >
              Keep Lesson
            </Button>
            <Button
              onClick={handleSubmit}
              variant="destructive"
              className="flex-1"
              disabled={cancelMutation.isPending || booking.status === 'completed'}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Lesson'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
