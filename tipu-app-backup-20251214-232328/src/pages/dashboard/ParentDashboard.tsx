import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { parseFirestoreDate } from '@/utils/date';
import { penceToPounds } from '@/utils/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookingCard } from '@/components/bookings/BookingCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Calendar, CreditCard, ClipboardList, BookOpen } from 'lucide-react';

const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Fetch children data
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children', user?.uid],
    queryFn: async () => {
      if (!user?.childrenIds || user.childrenIds.length === 0) return [];
      const children = await Promise.all(
        user.childrenIds.map(id => usersApi.getById(id))
      );
      return children;
    },
    enabled: !!user?.childrenIds && user.childrenIds.length > 0
  });

  const children = childrenData || [];

  // Fetch bookings for all children
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['parent-bookings', children.map(c => c.uid)],
    queryFn: () => bookingsApi.getAll(),
    enabled: children.length > 0
  });

  const bookings = bookingsData?.bookings || [];

  // Fetch tutors for bookings
  const { data: tutorsData } = useQuery({
    queryKey: ['booking-tutors', bookings.map(b => b.tutorId)],
    queryFn: async () => {
      const tutorIds = [...new Set(bookings.map(b => b.tutorId))];
      const tutors = await Promise.all(tutorIds.map(id => usersApi.getById(id)));
      return tutors.reduce((acc, tutor) => ({ ...acc, [tutor.uid]: tutor }), {});
    },
    enabled: bookings.length > 0
  });

  // Filter bookings by selected child
  const filteredBookings = selectedChildId
    ? bookings.filter(b => b.studentId === selectedChildId)
    : bookings;

  // Calculate stats
  const activeBookings = filteredBookings.filter(b =>
    (b.status === 'pending' || b.status === 'confirmed') &&
    parseFirestoreDate(b.scheduledAt) >= new Date()
  );

  const thisMonthsSpend = filteredBookings
    .filter(b => {
      const bookingDate = parseFirestoreDate(b.scheduledAt);
      const now = new Date();
      return bookingDate.getMonth() === now.getMonth() &&
             bookingDate.getFullYear() === now.getFullYear() &&
             b.isPaid;
    })
    .reduce((sum, b) => sum + b.price, 0);

  const pendingRequests = filteredBookings.filter(b =>
    b.status === 'pending' &&
    parseFirestoreDate(b.scheduledAt) >= new Date()
  );

  const upcomingLessons = filteredBookings
    .filter(b =>
      b.status === 'confirmed' &&
      parseFirestoreDate(b.scheduledAt) >= new Date()
    )
    .sort((a, b) =>
      parseFirestoreDate(a.scheduledAt).getTime() - parseFirestoreDate(b.scheduledAt).getTime()
    );

  const stats = [
    {
      title: 'Children',
      value: children.length.toString(),
      description: 'Linked children',
      icon: Users,
    },
    {
      title: 'Active Bookings',
      value: activeBookings.length.toString(),
      description: 'Pending & upcoming',
      icon: Calendar,
    },
    {
      title: "This Month's Spend",
      value: penceToPounds(thisMonthsSpend),
      description: 'Total paid',
      icon: CreditCard,
    },
  ];

  // Loading state
  if (childrenLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  // Empty state - no children
  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
            <p className="text-muted-foreground">Manage your children's learning journey</p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No children added yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first child to start booking lessons and tracking their progress
              </p>
              <Button onClick={() => navigate('/children/add')}>
                Add Your First Child
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const selectedChild = selectedChildId ? children.find(c => c.uid === selectedChildId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName}!</h1>
          <p className="text-muted-foreground">Manage your children's learning journey</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
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
          })}
        </div>

        {/* Children Selector and Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Viewing:</label>
            <Select
              value={selectedChildId || 'all'}
              onValueChange={(v) => setSelectedChildId(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Children</SelectItem>
                {children.map(child => (
                  <SelectItem key={child.uid} value={child.uid}>
                    {child.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => navigate('/tutors')}>
              <BookOpen className="h-4 w-4 mr-2" />
              Book Lesson
            </Button>
            <Button variant="outline" onClick={() => navigate('/children/add')}>
              <Users className="h-4 w-4 mr-2" />
              Add Child
            </Button>
          </div>
        </div>

        {/* Children Cards */}
        {!selectedChildId && (
          <Card>
            <CardHeader>
              <CardTitle>My Children</CardTitle>
              <CardDescription>Your children's profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {children.map(child => {
                  const childBookings = bookings.filter(b => b.studentId === child.uid);
                  const activeChildBookings = childBookings.filter(b =>
                    (b.status === 'pending' || b.status === 'confirmed') &&
                    parseFirestoreDate(b.scheduledAt) >= new Date()
                  );

                  return (
                    <Card key={child.uid} className="hover:border-primary cursor-pointer" onClick={() => setSelectedChildId(child.uid)}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xl font-semibold text-primary">
                              {child.displayName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{child.displayName}</p>
                            <p className="text-sm text-muted-foreground">{child.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <span>{activeChildBookings.length} active bookings</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Pending Booking Requests
                {selectedChild && <span className="text-sm font-normal text-muted-foreground">for {selectedChild.displayName}</span>}
              </CardTitle>
              <CardDescription>
                Awaiting tutor approval
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingRequests.map(booking => {
                const tutor = tutorsData?.[booking.tutorId];
                const child = children.find(c => c.uid === booking.studentId);
                return (
                  <div key={booking.id}>
                    {!selectedChildId && (
                      <p className="text-sm font-medium mb-2 text-primary">
                        For: {child?.displayName}
                      </p>
                    )}
                    <BookingCard
                      booking={booking}
                      tutorName={tutor?.displayName}
                      tutorPhoto={tutor?.photoURL}
                      onViewDetails={(id) => navigate(`/bookings/${id}`)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Lessons Section */}
        <Card className={upcomingLessons.length > 0 ? "border-green-200 bg-green-50/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Lessons
              {selectedChild && <span className="text-sm font-normal text-muted-foreground">for {selectedChild.displayName}</span>}
            </CardTitle>
            <CardDescription>
              Confirmed bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </div>
            ) : upcomingLessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming lessons</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedChild
                    ? `Book a lesson for ${selectedChild.displayName} to get started`
                    : 'Book your first lesson to get started'
                  }
                </p>
                <Button onClick={() => navigate('/tutors')}>
                  Find a Tutor
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingLessons.slice(0, 5).map(booking => {
                  const tutor = tutorsData?.[booking.tutorId];
                  const child = children.find(c => c.uid === booking.studentId);
                  return (
                    <div key={booking.id}>
                      {!selectedChildId && (
                        <p className="text-sm font-medium mb-2 text-primary">
                          For: {child?.displayName}
                        </p>
                      )}
                      <BookingCard
                        booking={booking}
                        tutorName={tutor?.displayName}
                        tutorPhoto={tutor?.photoURL}
                        onViewDetails={(id) => navigate(`/bookings/${id}`)}
                      />
                    </div>
                  );
                })}
                {upcomingLessons.length > 5 && (
                  <Button variant="outline" className="w-full" onClick={() => navigate('/bookings')}>
                    View All {upcomingLessons.length} Bookings
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

export default ParentDashboard;
