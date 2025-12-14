import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi } from '@/lib/api/bookings';
import { BookOpen, Clock, Users, AlertCircle, CheckCircle } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];
  const pendingBookings = bookings.filter(b =>
    b.status === 'pending' &&
    new Date(b.scheduledAt) >= new Date()
  );
  const confirmedBookings = bookings.filter(b =>
    b.status === 'confirmed' &&
    new Date(b.scheduledAt) >= new Date()
  );
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalHours = completedBookings.reduce((sum, b) => sum + b.duration, 0);
  const uniqueTutors = new Set(bookings.map(b => b.tutorId)).size;

  const stats = [
    { title: 'Pending Approval', value: pendingBookings.length.toString(), description: 'Awaiting tutor response', icon: AlertCircle },
    { title: 'Confirmed Lessons', value: confirmedBookings.length.toString(), description: 'Ready to attend', icon: CheckCircle },
    { title: 'Hours Learned', value: totalHours.toString(), description: 'Total hours', icon: Clock },
  ];

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

        <div className="flex gap-4">
          <Button onClick={() => navigate('/tutors')}>Book a Lesson</Button>
          <Button variant="outline" onClick={() => navigate('/bookings')}>View Schedule</Button>
          <Button variant="outline" onClick={() => navigate('/resources')}>Browse Resources</Button>
        </div>

        {/* Pending Lessons Section */}
        {pendingBookings.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <CardTitle>Pending Lessons</CardTitle>
              </div>
              <CardDescription>Awaiting tutor approval</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32" /> : (
                <div className="space-y-4">
                  {pendingBookings.slice(0, 3).map(b => (
                    <div key={b.id} className="flex justify-between items-center p-4 border border-yellow-200 rounded-lg bg-white">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{b.subject} - {b.level}</p>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Pending
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{format(new Date(b.scheduledAt), 'PPP p')}</p>
                        <p className="text-xs text-muted-foreground mt-1">Waiting for tutor to accept</p>
                      </div>
                      <Button variant="outline" onClick={() => navigate(`/bookings/${b.id}`)}>View</Button>
                    </div>
                  ))}
                  {pendingBookings.length > 3 && (
                    <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>
                      View All {pendingBookings.length} Pending
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Confirmed Lessons Section */}
        <Card className={confirmedBookings.length > 0 ? "border-green-200 bg-green-50/50" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Confirmed Lessons</CardTitle>
            </div>
            <CardDescription>Your upcoming tutoring sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32" /> : confirmedBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No confirmed lessons yet</p>
                <p className="text-sm text-muted-foreground mb-4">Your tutors will confirm your booking requests</p>
                <Button onClick={() => navigate('/tutors')}>Book a Lesson</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmedBookings.slice(0, 3).map(b => (
                  <div key={b.id} className="flex justify-between items-center p-4 border border-green-200 rounded-lg bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.subject} - {b.level}</p>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                          Confirmed
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{format(new Date(b.scheduledAt), 'PPP p')}</p>
                      {b.meetingLink && (
                        <p className="text-xs text-green-600 mt-1">Meeting link available</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={() => navigate(`/bookings/${b.id}`)}>View</Button>
                  </div>
                ))}
                {confirmedBookings.length > 3 && (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>
                    View All {confirmedBookings.length} Confirmed
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
