import { Video, FileText, GraduationCap, ShieldCheck } from 'lucide-react';

const capabilities = [
  {
    icon: Video,
    label: 'Recorded Sessions',
    description: 'Rewatch lessons anytime',
  },
  {
    icon: FileText,
    label: 'Progress Reports',
    description: 'Detailed session feedback',
  },
  {
    icon: GraduationCap,
    label: 'University Tutors',
    description: 'Current UK students',
  },
  {
    icon: ShieldCheck,
    label: 'DBS Verified',
    description: 'Enhanced background checks',
  },
];

export function TrustIndicators() {
  return (
    <section className="py-12 bg-primary">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {capabilities.map((capability, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-foreground/20 rounded-full mb-3">
                <capability.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="text-lg font-semibold text-primary-foreground">
                {capability.label}
              </p>
              <p className="text-sm text-primary-foreground/80 mt-1">
                {capability.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
