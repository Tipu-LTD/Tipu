import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, GraduationCap, Video } from 'lucide-react';

const badges = [
  { icon: ShieldCheck, label: 'DBS Checked' },
  { icon: GraduationCap, label: 'University Tutors' },
  { icon: Video, label: 'Session Recordings' },
];

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Help Your Student Grow?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10">
            Start your personalized learning journey today with university tutors who care.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg"
              variant="secondary"
              onClick={() => navigate('/register')}
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all group"
            >
              Book a Free Consultation
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => {
                const element = document.querySelector('#services');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-lg px-8 py-6 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              Explore Our Services
            </Button>
          </div>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-6">
            {badges.map((badge, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 text-primary-foreground/90"
              >
                <badge.icon className="h-5 w-5" />
                <span className="font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}