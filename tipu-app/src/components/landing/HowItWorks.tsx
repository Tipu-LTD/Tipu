import { Search, Calendar, Play, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Choose Your Service',
    description: 'Browse tutoring, PSP, or homeschooling support based on your family\'s needs.',
  },
  {
    icon: Calendar,
    number: '02',
    title: 'Book or Subscribe',
    description: 'Select your preferred tutor and schedule, or choose your subscription tier.',
  },
  {
    icon: Play,
    number: '03',
    title: 'Start Learning',
    description: 'Join live sessions, access resources, or follow your personalized lesson plans.',
  },
  {
    icon: BarChart3,
    number: '04',
    title: 'Track Progress',
    description: 'Review detailed reports, session recordings, and watch your growth over time.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Getting Started is Simple
          </h2>
          <p className="text-lg text-muted-foreground">
            Four easy steps to begin your learning journey with Tipu.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-24 left-[calc(12.5%+28px)] right-[calc(12.5%+28px)] h-0.5 bg-primary/20" />
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="relative inline-flex items-center justify-center w-14 h-14 bg-primary rounded-full mb-6 shadow-lg">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-foreground text-background text-xs font-bold rounded-full flex items-center justify-center">
                    {step.number.slice(-1)}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}