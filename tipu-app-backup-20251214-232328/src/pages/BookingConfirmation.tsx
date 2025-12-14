import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Calendar, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { penceToPounds } from '@/utils/currency';
import { parseFirestoreDate } from '@/utils/date';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingConfirmation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: !!bookingId
  });

  const { data: tutor } = useQuery({
    queryKey: ['tutor', booking?.tutorId],
    queryFn: () => usersApi.getById(booking!.tutorId),
    enabled: !!booking?.tutorId
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
            <Button onClick={() => navigate('/bookings')}>View My Bookings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-3xl">Booking Confirmed!</CardTitle>
          <p className="text-muted-foreground mt-2">
            Your lesson has been booked successfully. You'll receive a confirmation email shortly.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Card className="bg-muted">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Booking Reference</span>
                <span className="font-mono text-sm">{booking.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Subject & Level</p>
                  <p className="font-medium">{booking.subject} - {booking.level}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(parseFirestoreDate(booking.scheduledAt), 'PPPP')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Time & Duration</p>
                  <p className="font-medium">
                    {format(parseFirestoreDate(booking.scheduledAt), 'p')} ({booking.duration}h)
                  </p>
                </div>
              </div>

              <Separator />

              {tutor && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Tutor</p>
                  <p className="font-medium">{tutor.displayName}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-medium">Total Paid</span>
                <span className="text-2xl font-bold text-primary">{penceToPounds(booking.price)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">What's Next?</h3>
            <ul className="text-sm space-y-1 text-blue-900/80 dark:text-blue-100/80">
              <li>• Your tutor will review and accept your booking request</li>
              <li>• You'll receive a meeting link once confirmed</li>
              <li>• Check your email for booking details and reminders</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/dashboard/student')} className="flex-1">
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate('/bookings')} className="flex-1">
              View My Bookings
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
