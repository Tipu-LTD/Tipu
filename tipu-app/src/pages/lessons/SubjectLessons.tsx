import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Video,
  AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ResourceGrid } from '@/components/resources/ResourceGrid';
import { useAuth } from '@/contexts/AuthContext';
import { getBookings } from '@/lib/api/bookings';
import { getStudentResources } from '@/lib/api/resources';
import { getUserProfile } from '@/lib/api/users';
import { isAdult } from '@/utils/age';
import { format } from 'date-fns';
import { parseFirestoreDate } from '@/utils/date';
import type { Subject } from '@/types/user';
import type { Booking } from '@/types/booking';

const SubjectLessons = () => {
  const { subject: encodedSubject } = useParams<{ subject: string }>();
  const subject = encodedSubject ? decodeURIComponent(encodedSubject) as Subject : null;
  const navigate = useNavigate();
  const { user } = useAuth();

  const userIsAdult = user?.dateOfBirth ? isAdult(user.dateOfBirth) : false;

  // Fetch all bookings
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', user?.uid],
    queryFn: getBookings,
    enabled: !!user?.uid
  });

  // Filter bookings for this subject
  const subjectBookings = allBookings.filter(
    (booking: Booking) =>
      booking.subject === subject &&
      (booking.status === 'pending' || booking.status === 'accepted' || booking.status === 'confirmed') &&
      parseFirestoreDate(booking.scheduledAt) > new Date() // Only upcoming
  );

  // Fetch resources for this subject
  const { data: allResources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['resources', user?.uid, subject],
    queryFn: async () => {
      if (!user?.uid || !subject) return [];
      const resources = await getStudentResources(user.uid);
      // Filter by subject
      return resources.filter((r: any) => r.subject === subject);
    },
    enabled: !!user?.uid && !!subject
  });

  // Fetch tutor profiles for bookings and resources
  const tutorIds = [
    ...new Set([
      ...subjectBookings.map((b: Booking) => b.tutorId),
      ...allResources.map((r: any) => r.uploadedBy)
    ])
  ];

  const { data: tutors = {} } = useQuery({
    queryKey: ['tutors', tutorIds],
    queryFn: async () => {
      const tutorProfiles = await Promise.all(
        tutorIds.map(id => getUserProfile(id).catch(() => null))
      );

      const tutorMap: Record<string, string> = {};
      tutorProfiles.forEach((tutor, index) => {
        if (tutor) {
          tutorMap[tutorIds[index]] = tutor.displayName;
        }
      });

      return tutorMap;
    },
    enabled: tutorIds.length > 0
  });

  if (!subject) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid subject. Please select a subject from the lessons page.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/lessons')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lessons
          </Button>

          <h1 className="text-3xl font-bold">{subject}</h1>
          <p className="text-muted-foreground">
            View your upcoming lessons and resources
          </p>
        </div>

        {/* Age-based info for minors */}
        {!userIsAdult && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="ml-2 text-blue-900">
              Your parent manages bookings for you. If you need to reschedule or cancel a lesson, please ask your parent.
            </AlertDescription>
          </Alert>
        )}

        {/* Section 1: Upcoming Lessons */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <CardTitle>Upcoming Lessons</CardTitle>
            </div>
            <CardDescription>
              Your confirmed lessons for {subject}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <p className="text-gray-600">Loading lessons...</p>
            ) : subjectBookings.length > 0 ? (
              <div className="space-y-4">
                {subjectBookings
                  .sort((a: Booking, b: Booking) =>
                    parseFirestoreDate(a.scheduledAt).getTime() - parseFirestoreDate(b.scheduledAt).getTime()
                  )
                  .map((booking: Booking) => {
                    const lessonDate = parseFirestoreDate(booking.scheduledAt);

                    return (
                      <Card key={booking.id} className="border-blue-100">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Date & Time */}
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Date & Time</p>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {format(lessonDate, 'PPP')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-700">
                                  {format(lessonDate, 'p')}
                                </span>
                              </div>
                            </div>

                            {/* Tutor */}
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Tutor</p>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">
                                  {tutors[booking.tutorId] || 'Loading...'}
                                </span>
                              </div>
                            </div>

                            {/* Meeting Link */}
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Meeting</p>
                              {booking.meetingLink ? (
                                <a
                                  href={booking.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                  <Video className="h-4 w-4" />
                                  <span className="text-sm font-medium">Join Lesson</span>
                                </a>
                              ) : (
                                <span className="text-sm text-gray-500">Link pending</span>
                              )}
                            </div>
                          </div>

                          {/* Actions (adults only) */}
                          {userIsAdult && (
                            <>
                              <Separator className="my-4" />
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/bookings/${booking.id}`)}
                                >
                                  View Details
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No upcoming lessons for {subject}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {userIsAdult
                    ? 'Book a lesson from the tutors page'
                    : 'Ask your parent to book a lesson for you'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Resources */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Resources</h2>
          {resourcesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-gray-600">Loading resources...</p>
              </CardContent>
            </Card>
          ) : (
            <ResourceGrid resources={allResources} tutorNames={tutors} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubjectLessons;
