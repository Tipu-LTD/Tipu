import { GraduationCap, PiggyBank, BarChart3, ShieldCheck } from 'lucide-react';

const reasons = [
  {
    icon: GraduationCap,
    title: 'University Student Tutors',
    description: 'Learn from tutors who remember what it\'s like to be in your shoes. Our university student tutors bring fresh perspectives and relatable teaching styles.',
  },
  {
    icon: PiggyBank,
    title: 'Affordable Excellence',
    description: 'Quality education shouldn\'t break the bank. Our competitive rates and bulk discounts make expert tutoring accessible to all families.',
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Support',
    description: 'More than just lessons. Get recorded sessions, detailed reports, and ongoing support to track real progress over time.',
  },
  {
    icon: ShieldCheck,
    title: 'DBS-Checked Safety',
    description: 'Your child\'s safety is our priority. All tutors undergo enhanced DBS checks and thorough background verification.',
  },
];

export function WhyChooseTipu() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Families Choose Tipu
          </h2>
          <p className="text-lg text-muted-foreground">
            We're not just another tutoring platform. Here's what makes us different.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {reasons.map((reason, index) => (
            <div 
              key={index}
              className="flex gap-5 p-6 rounded-2xl bg-card border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="shrink-0">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                  <reason.icon className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{reason.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}