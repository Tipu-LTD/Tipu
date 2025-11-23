import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Clock, User, BookOpen, Link as LinkIcon, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { useAuth } from '@/contexts/AuthContext';
import { penceToPounds } from '@/utils/currency';
import { BookingStatus } from '@/types/booking';

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
  declined: 'bg-red-500'
};

export default function BookingDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getById(id!),
    enabled: !!id
  });

  const { data: tutor } = useQuery({
    queryKey: ['tutor', booking?.tutorId],
    queryFn: () => usersApi.getById(booking!.tutorId),
    enabled: !!booking?.tutorId
  });

  const { data: student } = useQuery({
    queryKey: ['student', booking?.studentId],
    queryFn: () => usersApi.getById(booking!.studentId),
    enabled: !!booking?.studentId
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!booking) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
          <p className="text-muted-foreground mb-4">The booking you're looking for doesn't exist</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isTutor = currentUser?.role === 'tutor';
  const otherUser = isTutor ? student : tutor;
  const otherUserLabel = isTutor ? 'Student' : 'Tutor';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <Badge className={statusColors[booking.status]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Subject & Level</p>
                  <p className="font-medium">{booking.subject} - {booking.level}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(booking.scheduledAt), 'PPPP')}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time & Duration</p>
                  <p className="font-medium">
                    {format(new Date(booking.scheduledAt), 'p')} ({booking.duration}h)
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Price</span>
                <span className="text-2xl font-bold text-primary">{penceToPounds(booking.price)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Other User Details */}
          <Card>
            <CardHeader>
              <CardTitle>{otherUserLabel} Information</CardTitle>
            </CardHeader>
            <CardContent>
              {otherUser ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={otherUser.photoURL} />
                      <AvatarFallback>
                        {otherUser.displayName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{otherUser.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{otherUser.email}</p>
                    </div>
                  </div>

                  {!isTutor && tutor?.bio && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">About</p>
                        <p className="text-sm">{tutor.bio}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Skeleton className="h-24" />
              )}
            </CardContent>
          </Card>

          {/* Meeting Link */}
          {booking.meetingLink && booking.status === 'confirmed' && (
            <Card>
              <CardHeader>
                <CardTitle>Meeting Link</CardTitle>
              </CardHeader>
              <CardContent>
                <Button className="w-full" asChild>
                  <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Join Meeting
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Lesson Report */}
          {booking.lessonReport && (
            <Card>
              <CardHeader>
                <CardTitle>Lesson Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Topics Covered</p>
                  <p className="text-sm">{booking.lessonReport.topicsCovered}</p>
                </div>
                {booking.lessonReport.homework && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Homework</p>
                    <p className="text-sm">{booking.lessonReport.homework}</p>
                  </div>
                )}
                {booking.lessonReport.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
                    <p className="text-sm">{booking.lessonReport.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Decline Reason */}
          {booking.status === 'declined' && booking.declineReason && (
            <Card>
              <CardHeader>
                <CardTitle>Decline Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{booking.declineReason}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
