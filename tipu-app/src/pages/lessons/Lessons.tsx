import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calculator,
  Atom,
  Code,
  FileCode,
  ArrowRight,
  Settings as SettingsIcon
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getBookings } from '@/lib/api/bookings';
import { getStudentResources } from '@/lib/api/resources';
import { parseFirestoreDate } from '@/utils/date';
import { toast } from 'sonner';
import type { Subject } from '@/types/user';
import type { Booking } from '@/types/booking';

// Subject icons mapping
const SUBJECT_ICONS: Record<Subject, React.ReactNode> = {
  'Maths': <Calculator className="h-8 w-8 text-blue-600" />,
  'Physics': <Atom className="h-8 w-8 text-purple-600" />,
  'Computer Science': <Code className="h-8 w-8 text-green-600" />,
  'Python': <FileCode className="h-8 w-8 text-yellow-600" />
};

// Subject colors for cards
const SUBJECT_COLORS: Record<Subject, string> = {
  'Maths': 'border-blue-200 hover:border-blue-400 bg-blue-50/50',
  'Physics': 'border-purple-200 hover:border-purple-400 bg-purple-50/50',
  'Computer Science': 'border-green-200 hover:border-green-400 bg-green-50/50',
  'Python': 'border-yellow-200 hover:border-yellow-400 bg-yellow-50/50'
};

const Lessons = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all bookings for the student
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', user?.uid],
    queryFn: getBookings,
    enabled: !!user?.uid
  });

  // Fetch resources for the student
  const { data: resources = [] } = useQuery({
    queryKey: ['resources', user?.uid],
    queryFn: () => {
      if (!user?.uid) return Promise.resolve([]);
      return getStudentResources(user.uid);
    },
    enabled: !!user?.uid
  });

  // Get enrolled subjects from user profile
  const enrolledSubjects = user?.enrolledSubjects || [];

  // Infer subjects from bookings (fallback if no enrolled subjects)
  const inferredSubjects = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];

    const subjectSet = new Set<Subject>();
    bookings.forEach((booking: Booking) => {
      if (booking.subject) {
        subjectSet.add(booking.subject);
      }
    });

    return Array.from(subjectSet);
  }, [bookings]);

  // Determine which subjects to display
  const displaySubjects = enrolledSubjects.length > 0 ? enrolledSubjects : inferredSubjects;

  // Redirect to settings if no subjects at all
  useEffect(() => {
    if (user && displaySubjects.length === 0 && bookings) {
      // No enrolled subjects and no bookings -> redirect to settings
      toast.info('Please enroll in subjects to view your lessons');
      navigate('/settings?enrollSubjects=true');
    }
  }, [user, displaySubjects.length, bookings, navigate]);

  // Count upcoming lessons per subject
  const subjectStats = useMemo(() => {
    const stats: Record<Subject, { upcomingLessons: number; resources: number }> = {
      'Maths': { upcomingLessons: 0, resources: 0 },
      'Physics': { upcomingLessons: 0, resources: 0 },
      'Computer Science': { upcomingLessons: 0, resources: 0 },
      'Python': { upcomingLessons: 0, resources: 0 }
    };

    // Count upcoming bookings per subject (pending, accepted, confirmed)
    bookings?.forEach((booking: Booking) => {
      if (
        (booking.status === 'pending' || booking.status === 'accepted' || booking.status === 'confirmed') &&
        booking.subject
      ) {
        const lessonDate = parseFirestoreDate(booking.scheduledAt);
        if (lessonDate > new Date()) {
          stats[booking.subject].upcomingLessons++;
        }
      }
    });

    // Count resources per subject
    resources?.forEach((resource: any) => {
      if (resource.subject && resource.subject in stats) {
        stats[resource.subject as Subject].resources++;
      }
    });

    return stats;
  }, [bookings, resources]);

  const handleSubjectClick = (subject: Subject) => {
    navigate(`/lessons/${encodeURIComponent(subject)}`);
  };

  const usingInferredSubjects = enrolledSubjects.length === 0 && inferredSubjects.length > 0;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-blue-600" />
            My Lessons
          </h1>
          <p className="text-muted-foreground">
            View your upcoming lessons and resources by subject
          </p>
        </div>

        {/* Alert if using inferred subjects */}
        {usingInferredSubjects && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <SettingsIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="ml-2">
              <p className="font-semibold text-yellow-900">
                Based on your bookings, we found these subjects.
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Please enroll in subjects in Settings to customize your experience.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigate('/settings?enrollSubjects=true')}
              >
                <SettingsIcon className="h-3 w-3 mr-1" />
                Enroll in Subjects
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Subject Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displaySubjects.map((subject) => {
            const stats = subjectStats[subject];

            return (
              <Card
                key={subject}
                className={`transition-all cursor-pointer ${SUBJECT_COLORS[subject]}`}
                onClick={() => handleSubjectClick(subject)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {SUBJECT_ICONS[subject]}
                  </div>
                  <CardTitle className="mt-4">{subject}</CardTitle>
                  <CardDescription>
                    View lessons and resources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Upcoming lessons count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Upcoming Lessons:</span>
                      <span className="font-semibold text-gray-900">
                        {stats.upcomingLessons}
                      </span>
                    </div>

                    {/* Resources count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Resources:</span>
                      <span className="font-semibold text-gray-900">
                        {stats.resources}
                      </span>
                    </div>

                    {/* View button */}
                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubjectClick(subject);
                      }}
                    >
                      View Lessons
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state if no subjects */}
        {displaySubjects.length === 0 && bookings && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-gray-400" />
                No Subjects Found
              </CardTitle>
              <CardDescription>
                You haven't enrolled in any subjects yet, and you don't have any bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/settings?enrollSubjects=true')}>
                <SettingsIcon className="h-4 w-4 mr-2" />
                Enroll in Subjects
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Lessons;
