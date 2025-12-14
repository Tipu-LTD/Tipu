import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-primary/10 to-primary/5">
      <div className="container mx-auto text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join thousands of students learning with expert tutors
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/register')}>
            Register Now
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/about')}>
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
