import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { Footer } from '@/components/landing/Footer';
import { PageHero } from '@/components/landing/PageHero';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, GraduationCap, Sprout } from 'lucide-react';

const values = [
  {
    icon: Heart,
    title: 'Student-First Approach',
    description: 'Every decision we make starts with one question: how does this help our students grow?'
  },
  {
    icon: Users,
    title: 'Relatable Tutors',
    description: 'Our tutors are current university students who understand the challenges you face.'
  },
  {
    icon: GraduationCap,
    title: 'Academic Excellence',
    description: 'We believe every student can achieve their potential with the right support.'
  },
  {
    icon: Sprout,
    title: 'Growth Mindset',
    description: 'Tipu means "to grow" in Te Reo Māori – growth is at the heart of everything we do.'
  }
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <PublicNavbar />
      
      {/* Hero Section */}
      <PageHero
        badge={{ icon: Sprout, text: 'Our Story' }}
        title={
          <>
            Helping Students <span className="text-primary">Grow</span>
          </>
        }
        description="Tipu was founded with a simple belief: every student has the potential to succeed with the right support and guidance."
      />

      {/* Mission Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                We connect students with university tutors who not only excel academically 
                but also understand what it's like to navigate exams, coursework, and the 
                pressures of student life.
              </p>
              <p className="text-muted-foreground mb-4">
                Unlike traditional tutoring agencies, our tutors are current university 
                students. They've recently walked in your shoes, tackled the same 
                curriculum, and know exactly what it takes to succeed.
              </p>
              <p className="text-muted-foreground">
                This means more relatable teaching, practical exam tips, and support 
                from someone who truly gets it.
              </p>
            </div>
            <div className="bg-secondary/30 rounded-2xl p-8 md:p-12">
              <div className="flex items-center gap-3 mb-4">
                <Sprout className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">Tipu</span>
              </div>
              <p className="text-lg text-muted-foreground mb-2">
                <span className="font-medium text-foreground">/tee-poo/</span> — verb
              </p>
              <p className="text-muted-foreground italic mb-4">
                "To grow, spring up, develop"
              </p>
              <p className="text-sm text-muted-foreground">
                From Te Reo Māori, the indigenous language of New Zealand. 
                Our name reflects our core belief that with nurturing and support, 
                every student can flourish.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at Tipu.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <div 
                key={value.title}
                className="bg-background rounded-xl p-6 shadow-sm border border-border"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Growing?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Whether you're looking for tutoring support, resources for parents, 
            or homeschooling guidance, we're here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/our-tutors')}>
              Meet Our Tutors
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/contact')}>
              Get in Touch
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
