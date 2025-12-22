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
import { AlertCircle, Info, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { parseFirestoreDate } from '@/utils/date';

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
  const { user } = useAuth();
  const [reason, setReason] = useState('');

  // Calculate hours until lesson
  const scheduledAt = parseFirestoreDate(booking.scheduledAt);
  const hoursUntilLesson = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

  // Check if user can cancel
  const isTutor = user?.role === 'tutor';
  const isAdmin = user?.role === 'admin';
  const isParentOrStudent = user?.role === 'parent' || user?.role === 'student';

  // Parents/students can only cancel 24+ hours before lesson
  const canCancel = isAdmin || isTutor || (isParentOrStudent && hoursUntilLesson >= 24);

  // Tutors must provide a reason (minimum 10 characters)
  const reasonRequired = isTutor;
  const reasonValid = !reasonRequired || (reason.trim().length >= 10);

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
      queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
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
          {/* 24-Hour Warning for Parents/Students */}
          {isParentOrStudent && !canCancel && hoursUntilLesson > 0 && (
            <Alert variant="destructive">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You cannot cancel within 24 hours of the lesson. Only {hoursUntilLesson.toFixed(1)} hours remaining.
                <br />
                <span className="font-medium">Please contact your tutor directly if you need to cancel.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Refund Alert */}
          {booking.isPaid && canCancel && (
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
            <Label>
              Reason {reasonRequired && <span className="text-red-500">*</span>}
              {!reasonRequired && <span className="text-muted-foreground text-sm">(optional)</span>}
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isTutor ? "Please explain why you need to cancel (minimum 10 characters)" : "Why are you cancelling this lesson?"}
              rows={3}
              disabled={!canCancel}
            />
            {reasonRequired && reason.trim().length > 0 && reason.trim().length < 10 && (
              <p className="text-sm text-red-500">
                Reason must be at least 10 characters ({reason.trim().length}/10)
              </p>
            )}
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
              disabled={
                cancelMutation.isPending ||
                booking.status === 'completed' ||
                !canCancel ||
                !reasonValid
              }
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Lesson'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
