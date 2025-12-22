import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { parseFirestoreDate } from '@/utils/date';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { bookingsApi } from '@/lib/api/bookings';
import { Booking } from '@/types/booking';
import { Calendar } from 'lucide-react';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  booking
}: RescheduleDialogProps) {
  const queryClient = useQueryClient();
  const [newScheduledAt, setNewScheduledAt] = useState('');

  const rescheduleMutation = useMutation({
    mutationFn: (data: { newScheduledAt: string }) =>
      bookingsApi.requestReschedule(booking.id, data),
    onSuccess: () => {
      toast.success('Reschedule request sent! Awaiting approval from the other party.');

      // Invalidate multiple queries that might show this booking
      queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send reschedule request');
    }
  });

  const handleSubmit = () => {
    if (!newScheduledAt) {
      toast.error('Please select a new date and time');
      return;
    }

    rescheduleMutation.mutate({ newScheduledAt });
  };

  const handleClose = () => {
    setNewScheduledAt('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule Lesson</DialogTitle>
          <DialogDescription>
            Choose a new date and time for this lesson
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Date Display */}
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Current time:</span>
            </div>
            <p className="mt-1 text-sm">
              {format(parseFirestoreDate(booking.scheduledAt), 'PPP p')}
            </p>
          </div>

          {/* New Date Input */}
          <div className="space-y-2">
            <Label>New Date & Time</Label>
            <Input
              type="datetime-local"
              value={newScheduledAt}
              onChange={(e) => setNewScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={rescheduleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={rescheduleMutation.isPending || !newScheduledAt}
            >
              {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
