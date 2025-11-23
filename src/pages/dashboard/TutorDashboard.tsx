import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi } from '@/lib/api/bookings';
import { penceToPounds } from '@/utils/currency';
import { isTutorProfileComplete } from '@/utils/profileValidation';
import { toast } from 'sonner';
import { Bell, Calendar, DollarSign, Users, AlertCircle, UserCircle } from 'lucide-react';

const TutorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['tutor-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];
  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const upcomingLessons = bookings.filter(b => b.status === 'confirmed' && new Date(b.scheduledAt) >= new Date());
  const completedLessons = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completedLessons.reduce((sum, b) => sum + b.price, 0);
  const uniqueStudents = new Set(bookings.map(b => b.studentId)).size;

  const stats = [
    { title: 'Pending Requests', value: pendingRequests.length.toString(), description: 'Awaiting response', icon: Bell },
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
          <Button variant="outline" onClick={() => toast.info('Availability management coming in Phase 2!')}>
            Manage Availability
          </Button>
          <Button variant="outline" onClick={() => toast.info('Resource uploads coming in Phase 2!')}>
            Upload Resources
          </Button>
        </div>

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
                    <div><p className="font-medium">{b.subject} - {b.level}</p><p className="text-sm text-muted-foreground">{format(new Date(b.scheduledAt), 'PPP p')}</p></div>
                    <Button onClick={() => navigate(`/bookings/${b.id}`)}>Review</Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/bookings/requests')}>View All</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TutorDashboard;
