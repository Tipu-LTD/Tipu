import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import { penceToPounds } from '@/utils/currency';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BookingModal } from '@/components/bookings/BookingModal';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Star, Calendar, AlertCircle } from 'lucide-react';

export default function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const { data: tutor, isLoading, error } = useQuery({
    queryKey: ['tutor', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  });

  // Handle not approved or not found
  if (!isLoading && (!tutor || !tutor.isApproved)) {
    toast({
      title: 'Tutor Not Available',
      description: 'This tutor profile is not currently available.',
      variant: 'destructive',
    });
    navigate('/tutors');
    return null;
  }

  if (isLoading) {
    return <TutorProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <p className="text-destructive mb-4">Failed to load tutor profile</p>
              <Button onClick={() => navigate('/tutors')} variant="outline">
                Back to Tutors
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!tutor) return null;

  const initials = tutor.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const gcseRate = tutor.hourlyRates?.GCSE || 0;
  const aLevelRate = tutor.hourlyRates?.['A-Level'] || 0;

  // Validate tutor has complete profile before allowing booking
  const canBook = tutor.subjects && tutor.subjects.length > 0 && 
                  tutor.hourlyRates?.GCSE && 
                  tutor.hourlyRates?.['A-Level'];

  const handleBookLesson = () => {
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb / Back Button */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link 
            to="/tutors" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tutors
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Avatar className="h-32 w-32 sm:h-40 sm:w-40">
                    <AvatarImage src={tutor.photoURL} alt={tutor.displayName} />
                    <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-center sm:text-left space-y-4">
                    <div>
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {tutor.displayName}
                      </h1>
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <Badge variant="secondary" className="text-xs">
                          ✓ Verified Tutor
                        </Badge>
                      </div>
                    </div>

                    {/* Placeholder Rating */}
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className="h-5 w-5 fill-primary text-primary" 
                        />
                      ))}
                      <span className="ml-2 text-sm text-muted-foreground">
                        5.0 (Reviews coming soon)
                      </span>
                    </div>

                    {/* Subjects */}
                    {tutor.subjects && tutor.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        {tutor.subjects.map(subject => (
                          <Badge key={subject} variant="default">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {tutor.bio || 'No bio provided yet.'}
                </p>
              </CardContent>
            </Card>

            {/* Availability Section - Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Contact tutor to discuss available time slots. Online scheduling coming soon!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pricing & CTA */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Hourly Rates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="font-medium text-foreground">GCSE</span>
                    <span className="text-2xl font-bold text-primary">
                      {penceToPounds(gcseRate)}/hr
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="font-medium text-foreground">A-Level</span>
                    <span className="text-2xl font-bold text-primary">
                      {penceToPounds(aLevelRate)}/hr
                    </span>
                  </div>
                </div>

                {!canBook && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Booking Unavailable</AlertTitle>
                    <AlertDescription>
                      This tutor's profile is incomplete. Please try another tutor or contact support.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={handleBookLesson}
                  className="w-full" 
                  size="lg"
                  disabled={!canBook}
                >
                  {canBook ? 'Book a Lesson' : 'Booking Unavailable'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Payment processing powered by Stripe
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <BookingModal
        open={bookingModalOpen}
        onOpenChange={setBookingModalOpen}
        tutor={tutor}
      />
    </div>
  );
}

function TutorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Skeleton className="h-6 w-32" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 rounded-full" />
                  <div className="flex-1 space-y-4 w-full">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
