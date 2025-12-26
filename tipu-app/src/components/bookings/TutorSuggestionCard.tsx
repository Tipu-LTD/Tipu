import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Booking } from '@/types/booking';
import { parseFirestoreDate } from '@/utils/date';

interface TutorSuggestionCardProps {
  booking: Booking;
  onApprove: () => void;
  onDecline: () => void;
  isApproving?: boolean;
  isDeclining?: boolean;
}

export function TutorSuggestionCard({
  booking,
  onApprove,
  onDecline,
  isApproving = false,
  isDeclining = false
}: TutorSuggestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {booking.subject} - {booking.level}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            £{(booking.price / 100).toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {parseFirestoreDate(booking.scheduledAt).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            {parseFirestoreDate(booking.scheduledAt).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            })}
            {' - '}
            {booking.duration} minutes
          </span>
        </div>
        {booking.tutorNotes && (
          <div className="mt-3 p-3 bg-muted rounded-md">
            <p className="text-sm font-medium mb-1">Tutor's Note:</p>
            <p className="text-sm text-muted-foreground">{booking.tutorNotes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          onClick={onDecline}
          variant="outline"
          className="flex-1"
          disabled={isApproving || isDeclining}
        >
          <XCircle className="mr-2 h-4 w-4" />
          {isDeclining ? 'Declining...' : 'Decline'}
        </Button>
        <Button
          onClick={onApprove}
          className="flex-1"
          disabled={isApproving || isDeclining}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          {isApproving ? 'Approving...' : 'Approve'}
        </Button>
      </CardFooter>
    </Card>
  );
}
