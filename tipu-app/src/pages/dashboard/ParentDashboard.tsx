import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import { paymentsApi } from '@/lib/api/payments';
import { parseFirestoreDate } from '@/utils/date';
import { penceToPounds } from '@/utils/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BookingCard } from '@/components/bookings/BookingCard';
import { TutorSuggestionCard } from '@/components/bookings/TutorSuggestionCard';
import { PaymentForm } from '@/components/bookings/PaymentForm';
import { AuthorizationForm } from '@/components/bookings/AuthorizationForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Calendar, CreditCard, ClipboardList, BookOpen, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Booking } from '@/types/booking';

const ParentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Payment state
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSecret, setPaymentSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // Authorization state
  const [authBooking, setAuthBooking] = useState<Booking | null>(null);
  const [authSecret, setAuthSecret] = useState<string | null>(null);
  const [isDeferred, setIsDeferred] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Race condition prevention
  const [recentlyPaidBookingIds, setRecentlyPaidBookingIds] = useState<Set<string>>(new Set());

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

  // Mutations for approving/declining tutor suggestions
  const approveSuggestionMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.approveSuggestion(bookingId),
    onSuccess: () => {
      toast.success('Lesson approved! You can now proceed with payment.');
      queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve lesson suggestion');
    }
  });

  const declineSuggestionMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.declineSuggestion(bookingId),
    onSuccess: () => {
      toast.success('Lesson suggestion declined');
      queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to decline lesson suggestion');
    }
  });

  const handleApproveSuggestion = (bookingId: string) => {
    approveSuggestionMutation.mutate(bookingId);
  };

  const handleDeclineSuggestion = (bookingId: string) => {
    declineSuggestionMutation.mutate(bookingId);
  };

  // Filter bookings by selected child
  const filteredBookings = selectedChildId
    ? bookings.filter(b => b.studentId === selectedChildId)
    : bookings;

  // Calculate stats
  const activeBookings = filteredBookings.filter(b =>
    (b.status === 'pending' || b.status === 'confirmed' || b.status === 'tutor-suggested') &&
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

  // Tutor-suggested bookings requiring parent approval
  const tutorSuggestedBookings = filteredBookings.filter(b =>
    b.status === 'tutor-suggested' &&
    b.requiresParentApproval === true &&
    parseFirestoreDate(b.scheduledAt) >= new Date()
  );

  const upcomingLessons = filteredBookings
    .filter(b =>
      (b.status === 'pending' || b.status === 'accepted' || b.status === 'confirmed') &&
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

  // Payment handlers
  const handlePayNow = async (booking: Booking) => {
    setIsCreatingPayment(true);
    try {
      const paymentIntent = await paymentsApi.createIntent({
        bookingId: booking.id,
        amount: booking.price,
        currency: 'gbp'
      });

      setPaymentSecret(paymentIntent.clientSecret);
      setPaymentBooking(booking);
      setShowPaymentModal(true);
    } catch (error: any) {
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleAuthorize = async (booking: Booking) => {
    const scheduledAt = parseFirestoreDate(booking.scheduledAt);
    const daysUntilLesson = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    const isDeferred = daysUntilLesson >= 7;

    setAuthBooking(booking);
    setIsDeferred(isDeferred);
    setIsCreatingPayment(true);

    try {
      let clientSecret: string;

      if (isDeferred) {
        const setupIntent = await paymentsApi.createSetupIntent({ bookingId: booking.id });
        clientSecret = setupIntent.clientSecret;
      } else {
        const paymentIntent = await paymentsApi.createAuthorization({
          bookingId: booking.id,
          amount: booking.price,
          currency: 'gbp'
        });
        clientSecret = paymentIntent.clientSecret;
      }

      setAuthSecret(clientSecret);

      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error('Stripe publishable key not configured');
      }
      const stripe = loadStripe(publishableKey);
      setStripePromise(stripe);
    } catch (error: any) {
      toast.error('Failed to initialize payment authorization. Please try again.');
      setAuthBooking(null);
      setAuthSecret(null);
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handlePaymentClick = (booking: Booking) => {
    if (booking.paymentAuthType === 'immediate_charge') {
      handlePayNow(booking);
    } else {
      handleAuthorize(booking);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setPaymentBooking(null);
    setPaymentSecret(null);

    if (paymentBooking) {
      setRecentlyPaidBookingIds(prev => new Set(prev).add(paymentBooking.id));
      setTimeout(() => {
        setRecentlyPaidBookingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(paymentBooking.id);
          return newSet;
        });
      }, 5000);
    }

    queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });
    toast.success('Payment successful! Your lesson is confirmed.');
  };

  const handleAuthSuccess = async () => {
    if (!authBooking) return;

    setAuthBooking(null);
    setAuthSecret(null);
    setStripePromise(null);

    setRecentlyPaidBookingIds(prev => new Set(prev).add(authBooking.id));
    setTimeout(() => {
      setRecentlyPaidBookingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(authBooking.id);
        return newSet;
      });
    }, 5000);

    queryClient.invalidateQueries({ queryKey: ['parent-bookings'] });

    if (isDeferred) {
      toast.success('Payment method saved successfully! You will be charged on the scheduled date.');
    } else {
      toast.success('Payment authorized successfully! Your lesson is confirmed.');
    }
  };

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

        {/* Tutor Lesson Suggestions */}
        {tutorSuggestedBookings.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Lesson Suggestions from Tutors
                {selectedChild && <span className="text-sm font-normal text-muted-foreground">for {selectedChild.displayName}</span>}
              </CardTitle>
              <CardDescription>
                Your child's tutor has suggested the following lessons. Please review and approve to proceed with payment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tutorSuggestedBookings.map((booking) => {
                const tutor = tutorsData?.[booking.tutorId];
                const child = children.find(c => c.uid === booking.studentId);
                return (
                  <div key={booking.id}>
                    {!selectedChildId && (
                      <p className="text-sm font-medium mb-2 text-primary">
                        For: {child?.displayName}
                      </p>
                    )}
                    <TutorSuggestionCard
                      booking={booking}
                      onApprove={() => handleApproveSuggestion(booking.id)}
                      onDecline={() => handleDeclineSuggestion(booking.id)}
                      isApproving={approveSuggestionMutation.isPending}
                      isDeclining={declineSuggestionMutation.isPending}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Lessons Section - All future bookings (pending, accepted, confirmed) */}
        <Card className={upcomingLessons.length > 0 ? "border-blue-200 bg-blue-50/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Lessons
              {selectedChild && <span className="text-sm font-normal text-muted-foreground">for {selectedChild.displayName}</span>}
            </CardTitle>
            <CardDescription>
              All scheduled lessons
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
                        onPayNow={handlePaymentClick}
                        isCreatingPayment={isCreatingPayment}
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

      {/* Payment Modal */}
      {paymentBooking && paymentSecret && (
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>
            <PaymentForm
              clientSecret={paymentSecret}
              amount={paymentBooking.price}
              onSuccess={handlePaymentSuccess}
              onBack={() => setShowPaymentModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Authorization Modal */}
      {authBooking && authSecret && stripePromise && (
        <Dialog
          open={!!authBooking && !!authSecret}
          onOpenChange={(open) => {
            if (!open) {
              toast.error('Please save your card to continue');
            }
          }}
        >
          <DialogContent className="max-w-md" hideCloseButton>
            <DialogHeader>
              <DialogTitle>
                {isDeferred ? 'Save Payment Method' : 'Authorize Payment'}
              </DialogTitle>
            </DialogHeader>
            <AuthorizationForm
              clientSecret={authSecret}
              isDeferred={isDeferred}
              stripePromise={stripePromise}
              onSuccess={handleAuthSuccess}
            />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default ParentDashboard;
