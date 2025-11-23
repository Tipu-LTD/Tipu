import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { bookingsApi } from '@/lib/api/bookings';
import { BookOpen, Clock, Users } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];
  const upcomingBookings = bookings.filter(b => 
    (b.status === 'pending' || b.status === 'confirmed') && 
    new Date(b.scheduledAt) >= new Date()
  );
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const totalHours = completedBookings.reduce((sum, b) => sum + b.duration, 0);
  const uniqueTutors = new Set(bookings.map(b => b.tutorId)).size;

  const stats = [
    { title: 'Upcoming Lessons', value: upcomingBookings.length.toString(), description: 'Confirmed bookings', icon: BookOpen },
    { title: 'Hours Learned', value: totalHours.toString(), description: 'Total hours', icon: Clock },
    { title: 'Tutors', value: uniqueTutors.toString(), description: 'Tutors worked with', icon: Users },
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

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Lessons</CardTitle>
            <CardDescription>Your scheduled tutoring sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-32" /> : upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No lessons scheduled</p>
                <p className="text-sm text-muted-foreground mb-4">Book your first lesson to get started!</p>
                <Button onClick={() => navigate('/tutors')}>Find a Tutor</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.slice(0, 3).map(b => (
                  <div key={b.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div><p className="font-medium">{b.subject} - {b.level}</p><p className="text-sm text-muted-foreground">{format(new Date(b.scheduledAt), 'PPP p')}</p></div>
                    <Button variant="outline" onClick={() => navigate(`/bookings/${b.id}`)}>View</Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>View All</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
