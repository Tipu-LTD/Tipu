import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Subject, Level } from '@/types/booking';
import { penceToPounds, poundsToPence } from '@/utils/currency';
import { User } from '@/types/user';
import { bookingsApi } from '@/lib/api/bookings';
import { paymentsApi } from '@/lib/api/payments';
import { PaymentForm } from './PaymentForm';

// Toggle this to skip payment for testing
const SKIP_PAYMENT_FOR_TESTING = true;

const bookingSchema = z.object({
  subject: z.enum(['Maths', 'Physics', 'Computer Science', 'Python']),
  level: z.enum(['GCSE', 'A-Level']),
  scheduledAt: z.date(),
  duration: z.number().min(1).max(3)
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutor: User;
}

export function BookingModal({ open, onOpenChange, tutor }: BookingModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [bookingData, setBookingData] = useState<BookingFormData | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<Subject>();
  const [selectedLevel, setSelectedLevel] = useState<Level>();
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  const calculatePrice = () => {
    if (!selectedLevel || !tutor.hourlyRates) return 0;
    const rateInPence = tutor.hourlyRates[selectedLevel];
    return rateInPence * selectedDuration;
  };

  const handleDetailsSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedSubject || !selectedLevel) {
      toast.error('Please fill in all fields');
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const data: BookingFormData = {
      subject: selectedSubject,
      level: selectedLevel,
      scheduledAt: scheduledDateTime,
      duration: selectedDuration
    };

    setIsLoading(true);
    try {
      const priceInPence = calculatePrice();

      if (SKIP_PAYMENT_FOR_TESTING) {
        // Test mode: Create booking directly without payment
        const booking = await bookingsApi.create({
          tutorId: tutor.uid,
          subject: data.subject,
          level: data.level,
          scheduledAt: data.scheduledAt.toISOString(),
          price: priceInPence,
          duration: data.duration
        });

        toast.success('Booking created successfully!');
        onOpenChange(false);
        navigate(`/bookings/confirmation/${booking.id}`);
      } else {
        // Production mode: Create unpaid booking, then payment intent
        const booking = await bookingsApi.create({
          tutorId: tutor.uid,
          subject: data.subject,
          level: data.level,
          scheduledAt: data.scheduledAt.toISOString(),
          price: priceInPence,
          duration: data.duration
        });

        setBookingId(booking.id);

        // Create payment intent with real booking ID
        const { clientSecret: secret } = await paymentsApi.createIntent({
          bookingId: booking.id,
          amount: priceInPence,
          currency: 'gbp'
        });

        setClientSecret(secret);
        setBookingData(data);
        setStep('payment');
      }
    } catch (error) {
      toast.error('Failed to create booking');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!bookingId) return;

    try {
      toast.success('Payment successful! Booking confirmed.');
      onOpenChange(false);
      navigate(`/bookings/confirmation/${bookingId}`);
    } catch (error) {
      toast.error('Failed to confirm booking');
      console.error(error);
    }
  };

  const resetModal = () => {
    setStep('details');
    setBookingData(null);
    setBookingId(null);
    setClientSecret(null);
    setSelectedDate(undefined);
    setSelectedTime('');
    setSelectedSubject(undefined);
    setSelectedLevel(undefined);
    setSelectedDuration(1);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const totalPrice = calculatePrice();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Book a Lesson with {tutor.displayName}</DialogTitle>
          <DialogDescription>
            {step === 'details' ? 'Choose your lesson details' : 'Complete your payment'}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div className="space-y-6">
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject(v as Subject)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {tutor.subjects && tutor.subjects.length > 0 ? (
                    tutor.subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No subjects available for this tutor.
                      <br />
                      Please contact support.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Level Selection */}
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as Level)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GCSE">GCSE</SelectItem>
                  <SelectItem value="A-Level">A-Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Selection */}
            <div className="space-y-2">
              <Label>Time</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 13 }, (_, i) => i + 9).map((hour) => (
                    <SelectItem key={hour} value={`${hour}:00`}>
                      {`${hour}:00`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Selection */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={selectedDuration.toString()} onValueChange={(v) => setSelectedDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="1.5">1.5 hours</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Preview */}
            <Card className="p-4 bg-muted">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Price:</span>
                <span className="text-2xl font-bold text-primary">
                  {selectedLevel ? penceToPounds(totalPrice) : '—'}
                </span>
              </div>
            </Card>

            <Button 
              onClick={handleDetailsSubmit} 
              disabled={!selectedDate || !selectedTime || !selectedSubject || !selectedLevel || isLoading}
              className="w-full"
            >
              {isLoading ? 'Processing...' : SKIP_PAYMENT_FOR_TESTING ? 'Book Lesson' : 'Proceed to Payment'}
            </Button>
          </div>
        )}

        {step === 'payment' && clientSecret && (
          <PaymentForm
            clientSecret={clientSecret}
            amount={totalPrice}
            onSuccess={handlePaymentSuccess}
            onBack={() => setStep('details')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
