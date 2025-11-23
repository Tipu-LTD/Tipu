import { Search, Calendar, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Search,
    title: 'Choose Your Subject',
    description: 'Browse our qualified tutors and find the perfect match'
  },
  {
    number: 2,
    icon: Calendar,
    title: 'Book a Session',
    description: 'Select a time that works for you and make payment'
  },
  {
    number: 3,
    icon: TrendingUp,
    title: 'Learn & Grow',
    description: 'Join your session, learn, and track your progress'
  }
];

export function HowItWorks() {
  return (
    <section className="py-20 px-4 bg-muted/50">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative text-center">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  {step.number}
                </div>
                <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
