import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Elements } from '@stripe/react-stripe-js';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookingCard } from '@/components/bookings/BookingCard';
import { PaymentPrompt } from '@/components/bookings/PaymentPrompt';
import { PaymentForm } from '@/components/bookings/PaymentForm';
import { AuthorizationForm } from '@/components/bookings/AuthorizationForm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { bookingsApi } from '@/lib/api/bookings';
import { paymentsApi } from '@/lib/api/payments';
import { usersApi } from '@/lib/api/users';
import { parseFirestoreDate } from '@/utils/date';
import { Booking, BookingStatus } from '@/types/booking';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getStripe } from '@/lib/stripe/client';

export default function StudentBookings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'upcoming' | 'past' | 'cancelled'>('pending');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSecret, setPaymentSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // Authorization state
  const [authBooking, setAuthBooking] = useState<Booking | null>(null);
  const [authSecret, setAuthSecret] = useState<string | null>(null);
  const [isDeferred, setIsDeferred] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Track recently paid bookings to prevent modal reopening (race condition fix)
  const [recentlyPaidBookingIds, setRecentlyPaidBookingIds] = useState<Set<string>>(new Set());

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
          (b.status === 'pending' || b.status === 'accepted') &&
          parseFirestoreDate(b.scheduledAt) >= now
        );
        break;
      case 'upcoming':
        filtered = bookings.filter(b =>
          (b.status === 'pending' || b.status === 'accepted' || b.status === 'confirmed') &&
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

  // Initialize Stripe
  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  // Auto-trigger authorization when tutor accepts
  useEffect(() => {
    if (!bookings || bookings.length === 0) return;

    bookings.forEach((booking) => {
      // If tutor just accepted and no payment method saved, open modal
      if (
        booking.status === 'accepted' &&
        !booking.paymentIntentId &&
        !booking.savedPaymentMethodId &&
        !authBooking && // Don't open multiple modals
        !paymentBooking && // Don't open multiple modals
        !recentlyPaidBookingIds.has(booking.id) // ✅ Don't reopen for recently paid bookings
      ) {
        // Route based on payment auth type
        if (booking.paymentAuthType === 'immediate_charge') {
          handlePayNow(booking); // Existing payment flow for <24h bookings
        } else {
          handleAuthorize(booking); // Authorization flow for immediate_auth or deferred_auth
        }
      }
    });
  }, [bookings, authBooking, paymentBooking, recentlyPaidBookingIds]);

  const handleAuthorize = async (booking: Booking) => {
    // Safety check: Only handle immediate_auth and deferred_auth
    // immediate_charge should use handlePayNow instead
    if (booking.paymentAuthType === 'immediate_charge') {
      console.error('handleAuthorize called for immediate_charge - should use handlePayNow');
      return;
    }

    const isDeferred = booking.paymentAuthType === 'deferred_auth';

    try {
      const response = isDeferred
        ? await paymentsApi.createSetupIntent(booking.id)
        : await paymentsApi.createAuthorization(booking.id);

      setAuthSecret(response.clientSecret);
      setAuthBooking(booking);
      setIsDeferred(isDeferred);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment authorization');
    }
  };

  const handleAuthComplete = () => {
    if (authBooking) {
      // Track this booking as recently authorized (prevent modal reopening)
      setRecentlyPaidBookingIds(prev => new Set(prev).add(authBooking.id));

      // Remove from tracking after 5 seconds (webhook should be done by then)
      setTimeout(() => {
        setRecentlyPaidBookingIds(prev => {
          const next = new Set(prev);
          next.delete(authBooking.id);
          return next;
        });
      }, 5000);
    }

    setAuthBooking(null);
    setAuthSecret(null);
    queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
  };

  const handlePayNow = async (booking: Booking) => {
    setIsCreatingPayment(true);
    try {
      // Call API to create Payment Intent
      const paymentIntent = await paymentsApi.createIntent({
        bookingId: booking.id,
        amount: booking.price,
        currency: 'gbp'
      });

      // Store the clientSecret
      setPaymentSecret(paymentIntent.clientSecret);
      setPaymentBooking(booking);
      setShowPaymentModal(true);
    } catch (error) {
      console.error('Failed to create payment intent:', error);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Confirm booking status after successful payment
      if (paymentBooking) {
        await bookingsApi.confirmPayment(paymentBooking.id, paymentIntentId);

        // Track this booking as recently paid (prevent modal reopening)
        setRecentlyPaidBookingIds(prev => new Set(prev).add(paymentBooking.id));

        // Remove from tracking after 5 seconds (webhook should be done by then)
        setTimeout(() => {
          setRecentlyPaidBookingIds(prev => {
            const next = new Set(prev);
            next.delete(paymentBooking.id);
            return next;
          });
        }, 5000);
      }

      toast.success('Payment successful! Booking confirmed.');
      setShowPaymentModal(false);
      setPaymentBooking(null);
      setPaymentSecret(null);
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });
    } catch (error) {
      console.error('Failed to confirm booking:', error);
      toast.error('Payment succeeded but booking status update failed. Please refresh the page.');
    }
  };

  // Unified handler for Pay Now button
  const handlePaymentClick = (booking: Booking) => {
    // Route based on payment auth type
    if (booking.paymentAuthType === 'immediate_charge') {
      handlePayNow(booking);
    } else {
      handleAuthorize(booking);
    }
  };

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
                  <div key={booking.id} className="space-y-2">
                    {/* Authorization states - only show for accepted bookings that aren't paid yet */}
                    {booking.status === 'accepted' && !booking.isPaid && (
                      <>
                        {/* Case 1: Payment authorized - show green success badge */}
                        {(booking.paymentIntentId || booking.savedPaymentMethodId) && !booking.paymentCapturedAt && (
                          <>
                            <Alert className="bg-green-50 border-green-200">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <AlertDescription className="ml-2">
                                <p className="font-semibold text-green-900">
                                  ✓ Payment Saved
                                </p>
                                <p className="text-sm text-green-700">
                                  {booking.paymentScheduledFor ? (
                                    <>
                                      You'll be charged <strong>£{(booking.price / 100).toFixed(2)}</strong> on{' '}
                                      {format(parseFirestoreDate(booking.paymentScheduledFor), 'PPP')}
                                    </>
                                  ) : (
                                    <>
                                      You'll be charged <strong>£{(booking.price / 100).toFixed(2)}</strong> immediately after the lesson
                                    </>
                                  )}
                                </p>
                              </AlertDescription>
                            </Alert>

                            {/* Prominent cancellation policy badge (user preference) */}
                            {booking.paymentScheduledFor && (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-300 rounded-full text-sm font-medium text-green-800">
                                <span>✓</span>
                                Free cancellation until {format(parseFirestoreDate(booking.paymentScheduledFor), 'PPP')}
                              </div>
                            )}
                          </>
                        )}

                        {/* Case 2: Authorization needed - auto-opens modal (handled in useEffect) */}
                        {!booking.paymentIntentId && !booking.savedPaymentMethodId && (
                          <Alert className="bg-yellow-50 border-yellow-200">
                            <CreditCard className="h-5 w-5 text-yellow-600" />
                            <AlertDescription className="ml-2">
                              <p className="font-semibold text-yellow-900">
                                Payment Information Required
                              </p>
                              <p className="text-sm text-yellow-700">
                                Opening payment authorization...
                              </p>
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                    <BookingCard
                      booking={booking}
                      tutorName={tutor?.displayName}
                      tutorPhoto={tutor?.photoURL}
                      studentName={user?.role === 'parent' ? student?.displayName : undefined}
                      onViewDetails={(id) => navigate(`/bookings/${id}`)}
                      onPayNow={handlePaymentClick}
                      isCreatingPayment={isCreatingPayment}
                    />
                  </div>
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
                    onPayNow={handlePaymentClick}
                    isCreatingPayment={isCreatingPayment}
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
                    onPayNow={handlePaymentClick}
                    isCreatingPayment={isCreatingPayment}
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
                    onPayNow={handlePaymentClick}
                    isCreatingPayment={isCreatingPayment}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
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

      {/* Authorization Dialog - can't close until card saved */}
      {authBooking && authSecret && stripePromise && (
        <Dialog
          open={!!authBooking && !!authSecret}
          onOpenChange={(open) => {
            // Prevent closing - user must complete or it stays open
            if (!open) {
              toast.error('Please save your card to continue');
            }
          }}
        >
          <DialogContent className="max-w-md" hideCloseButton>
            <DialogHeader>
              <DialogTitle>
                {isDeferred ? 'Save Your Card' : 'Authorize Payment'}
              </DialogTitle>
              <DialogDescription>
                Required to confirm your booking
              </DialogDescription>
            </DialogHeader>

            <Elements stripe={stripePromise} options={{ clientSecret: authSecret }}>
              <AuthorizationForm
                clientSecret={authSecret}
                bookingId={authBooking.id}
                amount={authBooking.price}
                scheduledAt={parseFirestoreDate(authBooking.scheduledAt)}
                onSuccess={handleAuthComplete}
                isDeferred={isDeferred}
              />
            </Elements>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
