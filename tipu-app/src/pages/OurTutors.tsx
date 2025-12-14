import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, Star, ShieldCheck, Users } from 'lucide-react';

const tutors = [
  {
    name: 'Sarah Mitchell',
    university: 'University of Cambridge',
    course: 'Mathematics',
    subjects: ['Maths', 'Further Maths'],
    bio: 'Third-year maths student passionate about making complex concepts accessible. Achieved A* in A-Level Maths and Further Maths.',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'James Chen',
    university: 'Imperial College London',
    course: 'Physics',
    subjects: ['Physics', 'Maths'],
    bio: 'PhD student specializing in quantum mechanics. I focus on building intuition and problem-solving skills, not just memorizing formulas.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
  },
  {
    name: 'Emily Watson',
    university: 'University of Oxford',
    course: 'Computer Science',
    subjects: ['Computer Science', 'Python'],
    bio: 'Final year CS student with industry experience. I teach programming from the ground up, with real-world projects and practical examples.',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
  }
];

const benefits = [
  {
    icon: GraduationCap,
    title: 'University Students',
    description: 'All our tutors are current students at top UK universities'
  },
  {
    icon: ShieldCheck,
    title: 'DBS Verified',
    description: 'Enhanced background checks for your peace of mind'
  },
  {
    icon: BookOpen,
    title: 'Recent Exam Success',
    description: 'Tutors who achieved top grades in the subjects they teach'
  },
  {
    icon: Star,
    title: 'Vetted & Trained',
    description: 'Every tutor goes through our interview and training process'
  }
];

export default function OurTutors() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img 
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Users className="h-4 w-4" />
            Our Team
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Meet Our <span className="text-primary">Tutors</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            University students who've excelled in their subjects and are passionate 
            about helping others succeed.
          </p>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tutors Grid */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Founding Tutors</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our first tutors – more joining as we grow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tutors.map((tutor) => (
              <div 
                key={tutor.name}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  <img 
                    src={tutor.image} 
                    alt={tutor.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-1">{tutor.name}</h3>
                  <p className="text-sm text-primary font-medium mb-1">{tutor.course}</p>
                  <p className="text-sm text-muted-foreground mb-4">{tutor.university}</p>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {tutor.bio}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Tutor CTA */}
      <section className="py-16 md:py-24 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Become a Tutor
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            Are you a university student with top grades? Join our team and help 
            students achieve their potential while earning flexible income.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/register')}
          >
            Apply to Tutor
          </Button>
        </div>
      </section>

      {/* Student CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Book a free consultation to discuss your learning needs and find 
            the perfect tutor match.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/contact')}>
              Book Free Consultation
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/register')}>
              Create Account
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
