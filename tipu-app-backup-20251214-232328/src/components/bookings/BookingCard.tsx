import { format } from 'date-fns';
import { Calendar, Clock, User, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Booking, BookingStatus } from '@/types/booking';
import { penceToPounds } from '@/utils/currency';
import { parseFirestoreDate } from '@/utils/date';

interface BookingCardProps {
  booking: Booking;
  tutorName?: string;
  tutorPhoto?: string;
  studentName?: string;
  studentPhoto?: string;
  onViewDetails: (id: string) => void;
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-500',
  declined: 'bg-red-500'
};

const statusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined'
};

export function BookingCard({
  booking,
  tutorName,
  tutorPhoto,
  studentName,
  studentPhoto,
  onViewDetails,
  showActions,
  onAccept,
  onDecline
}: BookingCardProps) {
  const displayName = tutorName || studentName;
  const displayPhoto = tutorPhoto || studentPhoto;
  const initials = displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={displayPhoto} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{displayName}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>{booking.subject}</span>
                <Badge variant="outline" className="text-xs">{booking.level}</Badge>
              </div>
              {studentName && tutorName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span>For: {studentName}</span>
                </div>
              )}
            </div>
          </div>
          <Badge className={statusColors[booking.status]}>
            {statusLabels[booking.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(parseFirestoreDate(booking.scheduledAt), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{format(parseFirestoreDate(booking.scheduledAt), 'p')}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold">{penceToPounds(booking.price)}</span>
          <span className="text-sm text-muted-foreground">{booking.duration}h</span>
        </div>

        {booking.meetingLink && booking.status === 'confirmed' && (
          <Button variant="outline" className="w-full" asChild>
            <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer">
              Join Meeting
            </a>
          </Button>
        )}

        <div className="flex gap-2">
          {showActions && booking.status === 'pending' && onAccept && onDecline && (
            <>
              <Button onClick={() => onAccept(booking.id)} className="flex-1">
                Accept
              </Button>
              <Button onClick={() => onDecline(booking.id)} variant="destructive" className="flex-1">
                Decline
              </Button>
            </>
          )}
          <Button onClick={() => onViewDetails(booking.id)} variant="outline" className="flex-1">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
