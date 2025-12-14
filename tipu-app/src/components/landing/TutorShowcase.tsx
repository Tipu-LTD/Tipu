import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';

const tutors = [
  {
    name: 'James Wilson',
    subjects: ['Mathematics', 'Physics'],
    university: 'University of Manchester',
    qualifications: 'A-Level: A*A*A',
    bio: 'Passionate about making complex concepts simple. Specialized in helping students overcome maths anxiety.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  },
  {
    name: 'Sarah Ahmed',
    subjects: ['Computer Science', 'Python'],
    university: 'Imperial College London',
    qualifications: 'A-Level: A*AA',
    bio: 'Full-stack developer and CS student. Love teaching programming from basics to advanced algorithms.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  },
  {
    name: 'Michael Chen',
    subjects: ['Physics', 'Mathematics'],
    university: 'University of Cambridge',
    qualifications: 'A-Level: A*A*A*',
    bio: 'Physics enthusiast with a talent for explaining quantum mechanics in everyday terms.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
  },
];

export function TutorShowcase() {
  const navigate = useNavigate();

  return (
    <section id="tutors" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">Our Team</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Meet Our Founding Tutors
          </h2>
          <p className="text-lg text-muted-foreground">
            Our first tutors — more joining as we grow.
          </p>
        </div>

        {/* Tutor Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor, index) => (
            <Card 
              key={index}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-20 h-20 mb-4 ring-4 ring-primary/10">
                    <AvatarImage src={tutor.image} alt={tutor.name} />
                    <AvatarFallback className="text-lg">{tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  
                  <h3 className="font-semibold text-lg">{tutor.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{tutor.university}</p>
                  
                  <Badge variant="secondary" className="mb-3 text-xs">
                    {tutor.qualifications}
                  </Badge>
                  
                  <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                    {tutor.subjects.map((subject) => (
                      <Badge key={subject} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {tutor.bio}
                  </p>
                  
                  <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/tutors')}>
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-muted-foreground mt-10">
          🌱 Growing our team — interested in tutoring?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/register')}>
            Apply now
          </Button>
        </p>
      </div>
    </section>
  );
}