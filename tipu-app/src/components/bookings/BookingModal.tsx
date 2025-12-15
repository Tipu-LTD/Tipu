import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Subject, Level } from '@/types/booking';
import { penceToPounds, poundsToPence } from '@/utils/currency';
import { calculateBookingPrice, type EducationLevel } from '@/utils/pricing';
import { User } from '@/types/user';
import { bookingsApi } from '@/lib/api/bookings';
import { usersApi } from '@/lib/api/users';
import TimeSlotPicker from './TimeSlotPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState<Date>();
  const [selectedSubject, setSelectedSubject] = useState<Subject>();
  const [selectedLevel, setSelectedLevel] = useState<Level>();
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [selectedChildId, setSelectedChildId] = useState<string>();

  // Fetch children if user is a parent
  const { data: children = [], isLoading: isLoadingChildren } = useQuery({
    queryKey: ['parent-children', user?.uid],
    queryFn: async () => {
      if (!user || user.role !== 'parent' || !user.childrenIds || user.childrenIds.length === 0) {
        return [];
      }

      // Fetch each child's details
      const childrenPromises = user.childrenIds.map(childId => usersApi.getById(childId));
      return Promise.all(childrenPromises);
    },
    enabled: !!user && user.role === 'parent'
  });

  // Auto-select child if only one exists
  useEffect(() => {
    if (children.length === 1 && !selectedChildId) {
      setSelectedChildId(children[0].uid);
    }
  }, [children, selectedChildId]);

  const calculatePrice = () => {
    if (!selectedLevel) return 0;
    return calculateBookingPrice(selectedLevel as EducationLevel, selectedDuration);
  };

  const handleDetailsSubmit = async () => {
    if (!selectedDateTime || !selectedSubject || !selectedLevel) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate child selection for parents
    if (user?.role === 'parent' && !selectedChildId) {
      toast.error('Please select which child this booking is for');
      return;
    }

    setIsLoading(true);
    try {
      const priceInPence = calculatePrice();

      // Prepare booking data with studentId for parents
      const bookingPayload = {
        tutorId: tutor.uid,
        subject: selectedSubject,
        level: selectedLevel,
        scheduledAt: selectedDateTime.toISOString(),
        price: priceInPence,
        duration: selectedDuration,
        ...(user?.role === 'parent' && selectedChildId && { studentId: selectedChildId })
      };

      // Create booking (status='pending', isPaid=false)
      await bookingsApi.create(bookingPayload);

      // Invalidate cache to show new booking
      queryClient.invalidateQueries({ queryKey: ['student-bookings'] });

      // Success message
      toast.success('Booking request sent to tutor! You\'ll be prompted to pay once they accept.');

      // Close modal
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to create booking');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedDateTime(undefined);
    setSelectedSubject(undefined);
    setSelectedLevel(undefined);
    setSelectedDuration(1);
    setSelectedChildId(undefined);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a Lesson with {tutor.displayName}</DialogTitle>
          <DialogDescription>
            Choose your lesson details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pb-4">
            {/* Parent: Child Selection */}
            {user?.role === 'parent' && (
              <div className="space-y-2">
                <Label>Select Child</Label>
                {isLoadingChildren ? (
                  <div className="text-sm text-muted-foreground">Loading children...</div>
                ) : children.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You haven't added any children yet. Please add a child to your account before booking.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select which child this booking is for" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.uid} value={child.uid}>
                          {child.displayName} ({child.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

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

            {/* Date & Time Selection using TimeSlotPicker */}
            <div className="space-y-2">
              <Label>Select Date & Time</Label>
              <TimeSlotPicker
                tutorId={tutor.uid}
                onSelect={setSelectedDateTime}
              />
              {selectedDateTime && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {format(selectedDateTime, 'PPP p')}
                </p>
              )}
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
              disabled={!selectedDateTime || !selectedSubject || !selectedLevel || isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending Request...' : 'Book Lesson'}
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}
