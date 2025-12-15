import { Link } from 'react-router-dom';
import { User } from '@/types/user';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { penceToPounds } from '@/utils/currency';
import { FIXED_PRICES } from '@/utils/pricing';

interface TutorCardProps {
  tutor: User;
}

export function TutorCard({ tutor }: TutorCardProps) {
  const initials = tutor.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const truncatedBio = tutor.bio && tutor.bio.length > 100
    ? `${tutor.bio.substring(0, 100)}...`
    : tutor.bio || 'No bio available';

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardContent className="p-6 flex-1">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar */}
          <Avatar className="h-20 w-20">
            <AvatarImage src={tutor.photoURL} alt={tutor.displayName} />
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <h3 className="text-lg font-semibold text-foreground">{tutor.displayName}</h3>

          {/* Bio */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {truncatedBio}
          </p>

          {/* Subjects */}
          {tutor.subjects && tutor.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {tutor.subjects.map(subject => (
                <Badge key={subject} variant="secondary">
                  {subject}
                </Badge>
              ))}
            </div>
          )}

          {/* Hourly Rates */}
          <div className="text-sm font-medium text-muted-foreground space-y-1">
            <p>GCSE: {penceToPounds(FIXED_PRICES.GCSE)}/hr</p>
            <p>A-Level: {penceToPounds(FIXED_PRICES['A-Level'])}/hr</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button asChild className="w-full">
          <Link to={`/tutors/${tutor.uid}`}>
            View Profile
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
