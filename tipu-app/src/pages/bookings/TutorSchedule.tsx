import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { parseFirestoreDate, formatDuration } from '@/utils/date';
import { format } from 'date-fns';
import { penceToPounds } from '@/utils/currency';
import { Calendar, Clock, User } from 'lucide-react';
import { Booking } from '@/types/booking';
import { User as UserType } from '@/types/user';
import { useEffect, useState } from 'react';

const TutorSchedule = () => {
  const navigate = useNavigate();
  const [studentsData, setStudentsData] = useState<Record<string, UserType>>({});

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['tutor-bookings-schedule'],
    queryFn: () => bookingsApi.getAll()
  });

  const bookings = bookingsData?.bookings || [];

  // Fetch student data for all bookings
  useEffect(() => {
    const fetchStudents = async () => {
      const studentIds = [...new Set(bookings.map(b => b.studentId))];
      const students: Record<string, UserType> = {};
      
      await Promise.all(
        studentIds.map(async (id) => {
          try {
            const response = await usersApi.getById(id);
            students[id] = response;
          } catch (error) {
            console.error(`Failed to fetch student ${id}:`, error);
          }
        })
      );
      
      setStudentsData(students);
    };

    if (bookings.length > 0) {
      fetchStudents();
    }
  }, [bookings]);

  const upcomingBookings = bookings.filter(
    b => (b.status === 'confirmed' || b.status === 'accepted' || b.status === 'pending') && parseFirestoreDate(b.scheduledAt) >= new Date()
  );
  const pastBookings = bookings.filter(
    b => b.status === 'completed' || (b.status === 'confirmed' && parseFirestoreDate(b.scheduledAt) < new Date())
  );
  const cancelledBookings = bookings.filter(
    b => b.status === 'cancelled' || b.status === 'declined'
  );

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const student = studentsData[booking.studentId];
    
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <Avatar>
                <AvatarImage src={student?.photoURL || undefined} />
                <AvatarFallback>
                  {student?.displayName?.charAt(0) || 'S'}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2">
                <div>
                  <p className="font-semibold">{student?.displayName || 'Loading...'}</p>
                  <p className="text-sm text-muted-foreground">{student?.email || ''}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{booking.subject}</Badge>
                  <Badge variant="outline">{booking.level}</Badge>
                  <Badge variant={
                    booking.status === 'confirmed' ? 'default' :
                    booking.status === 'accepted' ? 'secondary' :
                    booking.status === 'pending' ? 'secondary' :
                    booking.status === 'completed' ? 'default' :
                    'destructive'
                  } className={booking.status === 'accepted' ? 'bg-green-500' : ''}>
                    {booking.status}
                  </Badge>
                </div>
                
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseFirestoreDate(booking.scheduledAt), 'PPP')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(parseFirestoreDate(booking.scheduledAt), 'p')} ({formatDuration(booking.duration)})
                  </div>
                </div>
                
                {booking.meetingLink && (
                  <a 
                    href={booking.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Join Meeting →
                  </a>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <p className="font-semibold">{penceToPounds(booking.price)}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                View Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground">View and manage your bookings</p>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
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
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : upcomingBookings.length === 0 ? (
              <EmptyState message="No upcoming lessons scheduled" />
            ) : (
              upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : pastBookings.length === 0 ? (
              <EmptyState message="No past lessons found" />
            ) : (
              pastBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
              </>
            ) : cancelledBookings.length === 0 ? (
              <EmptyState message="No cancelled bookings" />
            ) : (
              cancelledBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TutorSchedule;
