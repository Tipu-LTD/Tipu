import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi } from '@/lib/api/bookings';
import { BookOpen, Clock, Users, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { parseFirestoreDate } from '@/utils/date';
import { isAdult } from '@/utils/age';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];

  // Filter tutor-suggested bookings for adult students (don't require parent approval)
  const tutorSuggestedBookings = bookings.filter(b =>
    b.status === 'tutor-suggested' &&
    b.requiresParentApproval === false
  );

  const upcomingBookings = bookings.filter(b =>
    (b.status === 'pending' || b.status === 'accepted' || b.status === 'confirmed') &&
    parseFirestoreDate(b.scheduledAt) >= new Date()
  );
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalHours = completedBookings.reduce((sum, b) => sum + b.duration, 0);
  const uniqueTutors = new Set(bookings.map(b => b.tutorId)).size;

  // Mutations for tutor suggestion approval
  const approveSuggestionMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.approveSuggestion(id),
    onSuccess: () => {
      toast.success('Lesson approved! Proceed to payment.');
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve lesson');
    }
  });

  const declineSuggestionMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingsApi.declineSuggestion(id, reason),
    onSuccess: () => {
      toast.success('Lesson suggestion declined. Coordinate with your tutor via WhatsApp if needed.');
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to decline lesson');
    }
  });

  const stats = [
    { title: 'Upcoming Lessons', value: upcomingBookings.length.toString(), description: 'All scheduled lessons', icon: BookOpen },
    { title: 'Completed Lessons', value: completedBookings.length.toString(), description: 'Lessons finished', icon: CheckCircle },
    { title: 'Hours Learned', value: totalHours.toString(), description: 'Total hours', icon: Clock },
  ];

  // Check if user is an adult (18+)
  const userIsAdult = user?.dateOfBirth ? isAdult(user.dateOfBirth) : false;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-muted-foreground">Track your learning journey and manage your bookings</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
            <><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></>
          ) : (
            stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Quick action buttons - age-based */}
        <div className="flex gap-4">
          {/* My Lessons - for all students */}
          <Button onClick={() => navigate('/lessons')}>
            <BookOpen className="h-4 w-4 mr-2" />
            My Lessons
          </Button>

          {/* Book a Lesson and View Schedule - adults only */}
          {userIsAdult && (
            <>
              <Button variant="outline" onClick={() => navigate('/tutors')}>
                Book a Lesson
              </Button>
              <Button variant="outline" onClick={() => navigate('/bookings')}>
                View Schedule
              </Button>
            </>
          )}
        </div>

        {/* Tutor Suggestions Section - Adult Students Only */}
        {tutorSuggestedBookings.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Lesson Suggestions from Your Tutor</AlertTitle>
            <AlertDescription>
              Your tutor has suggested the following lessons. Review and approve to schedule.
            </AlertDescription>
            <div className="mt-4 space-y-4">
              {tutorSuggestedBookings.map(booking => (
                <div key={booking.id} className="flex justify-between items-center p-4 border border-blue-200 rounded-lg bg-white">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{booking.subject} - {booking.level}</p>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        Suggested
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(parseFirestoreDate(booking.scheduledAt), 'PPP p')}
                    </p>
                    {booking.tutorNotes && (
                      <p className="text-sm text-blue-700 mt-1">Note: {booking.tutorNotes}</p>
                    )}
                    <p className="text-sm font-semibold mt-1">
                      £{(booking.price / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const reason = prompt('Please provide a reason for declining (optional):');
                        if (reason !== null) {
                          declineSuggestionMutation.mutate({ id: booking.id, reason: reason || 'No reason provided' });
                        }
                      }}
                      disabled={declineSuggestionMutation.isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveSuggestionMutation.mutate(booking.id)}
                      disabled={approveSuggestionMutation.isPending}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Alert>
        )}

        {/* Upcoming Lessons Section - All future bookings (pending, accepted, confirmed) */}
        <Card className={upcomingBookings.length > 0 ? "border-blue-200 bg-blue-50/50" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle>Upcoming Lessons</CardTitle>
            </div>
            <CardDescription>All your scheduled lessons</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32" /> : upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming lessons</p>
                <p className="text-sm text-muted-foreground mb-4">Book a lesson with your tutors to get started</p>
                <Button onClick={() => navigate('/tutors')}>Book a Lesson</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 3).map(b => (
                  <div key={b.id} className="flex justify-between items-center p-4 border border-blue-200 rounded-lg bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.subject} - {b.level}</p>
                        <Badge
                          variant={b.status === 'confirmed' ? 'default' : b.status === 'accepted' ? 'secondary' : 'outline'}
                          className={
                            b.status === 'confirmed' ? 'bg-green-100 text-green-800 border-green-300' :
                            b.status === 'accepted' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }
                        >
                          {b.status === 'confirmed' ? 'Confirmed' : b.status === 'accepted' ? 'Awaiting Payment' : 'Awaiting Tutor'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{format(parseFirestoreDate(b.scheduledAt), 'PPP p')}</p>
                      {b.status === 'confirmed' && b.meetingLink && (
                        <p className="text-xs text-green-600 mt-1">Meeting link available</p>
                      )}
                      {b.status === 'accepted' && (
                        <p className="text-xs text-blue-600 mt-1">Payment required to confirm</p>
                      )}
                      {b.status === 'pending' && (
                        <p className="text-xs text-yellow-600 mt-1">Waiting for tutor to accept</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/bookings/${b.id}`)}>View</Button>
                  </div>
                ))}
                {upcomingBookings.length > 3 && (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>
                    View All {upcomingBookings.length} Lessons
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
