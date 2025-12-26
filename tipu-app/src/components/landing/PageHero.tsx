import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeroProps {
  badge?: {
    icon: LucideIcon;
    text: string;
  };
  title: string | ReactNode;
  description: string;
  backgroundImage?: string;
}

export function PageHero({ badge, title, description, backgroundImage }: PageHeroProps) {
  const bgImage = backgroundImage || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop';

  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32 px-4">
      {/* NZ Landscape Background */}
      <div className="absolute inset-0 -z-10">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      </div>

      <div className="container mx-auto max-w-4xl text-center">
        {badge && (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <badge.icon className="h-4 w-4" />
            {badge.text}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>
    </section>
  );
}
