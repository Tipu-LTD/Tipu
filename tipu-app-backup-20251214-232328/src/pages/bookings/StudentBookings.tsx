import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookingCard } from '@/components/bookings/BookingCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { parseFirestoreDate } from '@/utils/date';
import { Booking, BookingStatus } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past' | 'cancelled'>('pending');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: () => bookingsApi.getAll(),
    refetchOnMount: 'always' // Always refetch when navigating to this page
  });

  const bookings = bookingsData?.bookings || [];

  // Debug logging
  console.log('=== BOOKINGS DEBUG ===');
  console.log('Total bookings fetched:', bookings.length);
  console.log('Current time:', new Date());
  bookings.forEach((b, index) => {
    const scheduledDate = parseFirestoreDate(b.scheduledAt);
    console.log(`Booking ${index + 1}:`, {
      id: b.id,
      status: b.status,
      scheduledAt: b.scheduledAt,
      scheduledAtDate: scheduledDate,
      isFuture: scheduledDate >= new Date(),
      statusType: typeof b.status
    });
  });

  // Fetch tutor details for each booking
  const { data: tutorsData } = useQuery({
    queryKey: ['tutors', bookings.map(b => b.tutorId)],
    queryFn: async () => {
      const tutorIds = [...new Set(bookings.map(b => b.tutorId))];
      const tutors = await Promise.all(tutorIds.map(id => usersApi.getById(id)));
      return tutors.reduce((acc, tutor) => ({ ...acc, [tutor.uid]: tutor }), {});
    },
    enabled: bookings.length > 0
  });

  // Fetch student details for each booking (for parents viewing their children's bookings)
  const { data: studentsData } = useQuery({
    queryKey: ['students', bookings.map(b => b.studentId)],
    queryFn: async () => {
      if (user?.role !== 'parent') return {};

      const studentIds = [...new Set(bookings.map(b => b.studentId))];
      const students = await Promise.all(studentIds.map(id => usersApi.getById(id)));
      return students.reduce((acc, student) => ({ ...acc, [student.uid]: student }), {});
    },
    enabled: bookings.length > 0 && user?.role === 'parent'
  });

  // For parents, fetch list of children for filter dropdown
  const { data: children = [] } = useQuery({
    queryKey: ['parent-children', user?.uid],
    queryFn: async () => {
      if (!user || user.role !== 'parent' || !user.childrenIds || user.childrenIds.length === 0) {
        return [];
      }

      const childrenPromises = user.childrenIds.map(childId => usersApi.getById(childId));
      return Promise.all(childrenPromises);
    },
    enabled: !!user && user.role === 'parent'
  });

  const filterBookings = (status: 'pending' | 'upcoming' | 'past' | 'cancelled'): Booking[] => {
    const now = new Date();

    let filtered: Booking[] = [];

    switch (status) {
      case 'pending':
        filtered = bookings.filter(b =>
          b.status === 'pending' &&
          parseFirestoreDate(b.scheduledAt) >= now
        );
        break;
      case 'upcoming':
        filtered = bookings.filter(b =>
          b.status === 'confirmed' &&
          parseFirestoreDate(b.scheduledAt) >= now
        );
        break;
      case 'past':
        filtered = bookings.filter(b =>
          b.status === 'completed' ||
          (b.status === 'confirmed' && parseFirestoreDate(b.scheduledAt) < now)
        );
        break;
      case 'cancelled':
        filtered = bookings.filter(b => b.status === 'cancelled' || b.status === 'declined');
        break;
      default:
        filtered = [];
    }

    // Apply child filter for parents
    if (user?.role === 'parent' && selectedChildFilter !== 'all') {
      filtered = filtered.filter(b => b.studentId === selectedChildFilter);
    }

    return filtered;
  };

  const pendingBookings = filterBookings('pending');
  const upcomingBookings = filterBookings('upcoming');
  const pastBookings = filterBookings('past');
  const cancelledBookings = filterBookings('cancelled');

  // Debug filtered bookings
  console.log('=== FILTERED RESULTS ===');
  console.log(`Pending (${pendingBookings.length}):`, pendingBookings.map(b => b.id));
  console.log(`Upcoming (${upcomingBookings.length}):`, upcomingBookings.map(b => b.id));
  console.log(`Past (${pastBookings.length}):`, pastBookings.map(b => b.id));
  console.log(`Cancelled (${cancelledBookings.length}):`, cancelledBookings.map(b => b.id));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground">Manage your lesson bookings</p>
          </div>

          {/* Child filter for parents */}
          {user?.role === 'parent' && children.length > 1 && (
            <div className="w-64">
              <Select value={selectedChildFilter} onValueChange={setSelectedChildFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by child" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.uid} value={child.uid}>
                      {child.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))
            ) : pendingBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending bookings</h3>
                <p className="text-muted-foreground mb-4">Your booking requests will appear here while awaiting tutor approval</p>
                <Button onClick={() => navigate('/tutors')}>Find a Tutor</Button>
              </div>
            ) : (
              pendingBookings.map((booking) => {
                const tutor = tutorsData?.[booking.tutorId];
                const student = studentsData?.[booking.studentId];
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
                    studentName={user?.role === 'parent' ? student?.displayName : undefined}
                    onViewDetails={(id) => navigate(`/bookings/${id}`)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming bookings</h3>
                <p className="text-muted-foreground mb-4">Find a tutor and book your first lesson</p>
                <Button onClick={() => navigate('/tutors')}>Find a Tutor</Button>
              </div>
            ) : (
              upcomingBookings.map((booking) => {
                const tutor = tutorsData?.[booking.tutorId];
                const student = studentsData?.[booking.studentId];
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
                    studentName={user?.role === 'parent' ? student?.displayName : undefined}
                    onViewDetails={(id) => navigate(`/bookings/${id}`)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No past bookings
              </div>
            ) : (
              pastBookings.map((booking) => {
                const tutor = tutorsData?.[booking.tutorId];
                const student = studentsData?.[booking.studentId];
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
                    studentName={user?.role === 'parent' ? student?.displayName : undefined}
                    onViewDetails={(id) => navigate(`/bookings/${id}`)}
                  />
                );
              })
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {cancelledBookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No cancelled bookings
              </div>
            ) : (
              cancelledBookings.map((booking) => {
                const tutor = tutorsData?.[booking.tutorId];
                const student = studentsData?.[booking.studentId];
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
                    studentName={user?.role === 'parent' ? student?.displayName : undefined}
                    onViewDetails={(id) => navigate(`/bookings/${id}`)}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
