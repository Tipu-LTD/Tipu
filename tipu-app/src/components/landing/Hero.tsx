import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 px-4 bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="container mx-auto text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Unlock Your Potential with Expert Tutoring
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Connect with qualified tutors in Maths, Physics, Computer Science & Python
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/register?role=student')}>
            Find a Tutor
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/register?role=tutor')}>
            Become a Tutor
          </Button>
        </div>
      </div>
    </section>
  );
}
