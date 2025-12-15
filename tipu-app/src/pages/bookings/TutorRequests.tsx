import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookingCard } from '@/components/bookings/BookingCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';

export default function TutorRequests() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [declineReason, setDeclineReason] = useState('');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['tutor-requests'],
    queryFn: () => bookingsApi.getAll({ status: 'pending' })
  });

  const bookings = bookingsData?.bookings || [];

  const { data: studentsData } = useQuery({
    queryKey: ['students', bookings.map(b => b.studentId)],
    queryFn: async () => {
      const studentIds = [...new Set(bookings.map(b => b.studentId))];
      const students = await Promise.all(studentIds.map(id => usersApi.getById(id)));
      return students.reduce((acc, student) => ({ ...acc, [student.uid]: student }), {});
    },
    enabled: bookings.length > 0
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.accept(id),
    onSuccess: () => {
      toast.success('Booking accepted! Student will be prompted to pay.');
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
    },
    onError: () => {
      toast.error('Failed to accept booking');
    }
  });

  const declineMutation = useMutation({
    mutationFn: (data: { id: string; reason: string }) =>
      bookingsApi.decline(data.id, { reason: data.reason }),
    onSuccess: () => {
      toast.success('Booking declined');
      queryClient.invalidateQueries({ queryKey: ['tutor-requests'] });
      setDeclineModalOpen(false);
      setDeclineReason('');
    },
    onError: () => {
      toast.error('Failed to decline booking');
    }
  });

  const handleAcceptClick = (id: string) => {
    if (confirm('Accept this booking? Student will be prompted to pay.')) {
      acceptMutation.mutate(id);
    }
  };

  const handleDeclineClick = (id: string) => {
    setSelectedBookingId(id);
    setDeclineModalOpen(true);
  };

  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    declineMutation.mutate({ id: selectedBookingId, reason: declineReason });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Booking Requests</h1>
          <p className="text-muted-foreground">Review and respond to student booking requests</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
            <p className="text-muted-foreground">You'll see booking requests from students here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const student = studentsData?.[booking.studentId];
              return (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  studentName={student?.displayName}
                  studentPhoto={student?.photoURL}
                  onViewDetails={(id) => navigate(`/bookings/${id}`)}
                  showActions
                  onAccept={handleAcceptClick}
                  onDecline={handleDeclineClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason</Label>
              <Textarea
                id="declineReason"
                placeholder="Let the student know why you can't accept this booking..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeclineModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeclineSubmit} 
                disabled={declineMutation.isPending}
                className="flex-1"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline Booking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
