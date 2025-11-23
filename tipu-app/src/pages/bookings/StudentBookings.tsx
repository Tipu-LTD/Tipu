import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BookingCard } from '@/components/bookings/BookingCard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { Booking, BookingStatus } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

export default function StudentBookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['student-bookings'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];

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

  const filterBookings = (status: 'upcoming' | 'past' | 'cancelled'): Booking[] => {
    const now = new Date();
    
    switch (status) {
      case 'upcoming':
        return bookings.filter(b => 
          (b.status === 'pending' || b.status === 'confirmed') && 
          new Date(b.scheduledAt) >= now
        );
      case 'past':
        return bookings.filter(b => 
          b.status === 'completed' || 
          (b.status === 'confirmed' && new Date(b.scheduledAt) < now)
        );
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled' || b.status === 'declined');
      default:
        return [];
    }
  };

  const upcomingBookings = filterBookings('upcoming');
  const pastBookings = filterBookings('past');
  const cancelledBookings = filterBookings('cancelled');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">Manage your lesson bookings</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
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
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
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
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
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
                return (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    tutorName={tutor?.displayName}
                    tutorPhoto={tutor?.photoURL}
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
