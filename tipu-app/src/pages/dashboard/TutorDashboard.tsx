import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { penceToPounds } from '@/utils/currency';
import { parseFirestoreDate } from '@/utils/date';
import { isTutorProfileComplete } from '@/utils/profileValidation';
import { toast } from 'sonner';
import { Bell, Calendar, DollarSign, Users, AlertCircle, UserCircle } from 'lucide-react';
import AvailabilityEditor from '@/components/tutors/AvailabilityEditor';

const TutorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['tutor-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];

  // Debug logging
  console.log('=== TUTOR DASHBOARD DEBUG ===');
  console.log('Current tutor UID:', user?.uid);
  console.log('Total bookings fetched:', bookings.length);
  bookings.forEach((b, index) => {
    const scheduledDate = parseFirestoreDate(b.scheduledAt);
    console.log(`Booking ${index + 1}:`, {
      id: b.id,
      status: b.status,
      tutorId: b.tutorId,
      studentId: b.studentId,
      scheduledAt: b.scheduledAt,
      scheduledAtDate: scheduledDate,
      isFuture: scheduledDate >= new Date(),
      tutorIdMatches: b.tutorId === user?.uid
    });
  });

  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const upcomingLessons = bookings.filter(b => b.status === 'confirmed' && parseFirestoreDate(b.scheduledAt) >= new Date());
  const completedLessons = bookings.filter(b => b.status === 'completed');

  // Filter bookings with pending reschedule requests
  const pendingReschedules = bookings.filter(b =>
    b.rescheduleRequest &&
    b.rescheduleRequest.status === 'pending' &&
    b.rescheduleRequest.requestedBy !== user?.uid  // Not requested by tutor
  );

  console.log('=== FILTERED RESULTS ===');
  console.log(`Pending requests (${pendingRequests.length}):`, pendingRequests.map(b => b.id));
  console.log(`Upcoming lessons (${upcomingLessons.length}):`, upcomingLessons.map(b => b.id));
  console.log(`Completed lessons (${completedLessons.length}):`, completedLessons.map(b => b.id));
  console.log(`Pending reschedules (${pendingReschedules.length}):`, pendingReschedules.map(b => b.id));

  const totalEarnings = completedLessons.reduce((sum, b) => sum + b.price, 0);
  const uniqueStudents = new Set(bookings.map(b => b.studentId)).size;

  // Mutations for approve/decline reschedule
  const { mutate: approveReschedule, isPending: isApprovingReschedule } = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.approveReschedule(bookingId),
    onSuccess: () => {
      toast.success('Reschedule approved! Meeting link updated.');
      queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve reschedule');
    }
  });

  const { mutate: declineReschedule, isPending: isDecliningReschedule } = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.declineReschedule(bookingId),
    onSuccess: () => {
      toast.success('Reschedule request declined');
      queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to decline reschedule');
    }
  });

  const handleApproveReschedule = (bookingId: string) => {
    approveReschedule(bookingId);
  };

  const handleDeclineReschedule = (bookingId: string) => {
    declineReschedule(bookingId);
  };

  const totalPendingActions = pendingRequests.length + pendingReschedules.length;

  const stats = [
    {
      title: 'Pending Actions',
      value: totalPendingActions.toString(),
      description: `${pendingRequests.length} new, ${pendingReschedules.length} reschedules`,
      icon: Bell
    },
    { title: 'Upcoming Lessons', value: upcomingLessons.length.toString(), description: 'Confirmed bookings', icon: Calendar },
    { title: "This Month's Earnings", value: penceToPounds(totalEarnings), description: 'Total earnings', icon: DollarSign },
    { title: 'Total Students', value: uniqueStudents.toString(), description: 'Students taught', icon: Users },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-muted-foreground">Manage your bookings and track your earnings</p>
        </div>

        {!isTutorProfileComplete(user) && (
          <Alert variant="destructive">
            <UserCircle className="h-4 w-4" />
            <AlertTitle>Complete Your Profile</AlertTitle>
            <AlertDescription>
              Your profile is incomplete. Add your bio, subjects, and hourly rates to start accepting bookings.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={() => navigate('/profile')}
              >
                Complete Profile Now
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {user?.isApproved === false && (
          <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Profile Under Review</AlertTitle><AlertDescription>Your tutor profile is pending approval. You'll be visible to students once approved.</AlertDescription></Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
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

        <div className="flex gap-4">
          <Button onClick={() => navigate('/bookings/requests')}>View Requests</Button>
          <Button variant="outline" onClick={() => toast.info('Resource uploads coming in Phase 2!')}>
            Upload Resources
          </Button>
        </div>

        <AvailabilityEditor />

        <Card>
          <CardHeader>
            <CardTitle>Pending Booking Requests</CardTitle>
            <CardDescription>Students waiting for your response</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32" /> : pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
                <p className="text-sm text-muted-foreground">New booking requests will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.slice(0, 3).map(b => (
                  <div key={b.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div><p className="font-medium">{b.subject} - {b.level}</p><p className="text-sm text-muted-foreground">{format(parseFirestoreDate(b.scheduledAt), 'PPP p')}</p></div>
                    <Button onClick={() => navigate(`/bookings/${b.id}`)}>Review</Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/bookings/requests')}>View All</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Reschedule Requests */}
        {pendingReschedules.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Reschedule Requests</CardTitle>
                <Badge variant="secondary">{pendingReschedules.length}</Badge>
              </div>
              <CardDescription>
                Students/parents requesting to reschedule their lessons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReschedules.slice(0, 3).map((booking) => {
                  // Fetch student details
                  const StudentInfo = ({ studentId }: { studentId: string }) => {
                    const { data: student } = useQuery({
                      queryKey: ['user', studentId],
                      queryFn: () => usersApi.getById(studentId)
                    });

                    return (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student?.photoURL} />
                          <AvatarFallback>
                            {student?.displayName?.split(' ').map(n => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student?.displayName || 'Loading...'}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.subject} • {booking.level}
                          </p>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div key={booking.id} className="border rounded-lg p-4 space-y-3">
                      {/* Student Info */}
                      <StudentInfo studentId={booking.studentId} />

                      {/* Current vs Proposed Times */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Current Time:</p>
                          <p className="font-medium">
                            {format(parseFirestoreDate(booking.scheduledAt), 'PPP p')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Proposed Time:</p>
                          <p className="font-medium text-blue-600">
                            {format(parseFirestoreDate(booking.rescheduleRequest!.newScheduledAt), 'PPP p')}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveReschedule(booking.id)}
                          disabled={isApprovingReschedule}
                        >
                          {isApprovingReschedule ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeclineReschedule(booking.id)}
                          disabled={isDecliningReschedule}
                        >
                          {isDecliningReschedule ? 'Declining...' : 'Decline'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* View All Link */}
                {pendingReschedules.length > 3 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/bookings/requests')}
                  >
                    View All {pendingReschedules.length} Reschedule Requests
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TutorDashboard;
