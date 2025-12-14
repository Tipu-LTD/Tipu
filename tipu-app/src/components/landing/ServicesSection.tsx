import { GraduationCap, Users, Home, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

const services = [
  {
    icon: GraduationCap,
    title: '1-on-1 Expert Tutoring',
    description: 'Personalized lessons with university student tutors who relate to your learning journey. All sessions recorded and include detailed progress reports.',
    price: 'From £30/hour',
    features: [
      'GCSE & A-Level support',
      '55-minute lessons + 5-min report',
      'Session recordings included',
      '10% bulk discount available',
    ],
    cta: 'Book a Tutor',
    href: '/tutors',
    highlight: true,
  },
  {
    icon: Users,
    title: 'Parent Support Program',
    description: 'Support your child\'s education with expert resources, guidance, and community. Perfect for parents who want to be actively involved.',
    price: 'From £30/month',
    tiers: ['Basic', 'Standard', 'Premium'],
    features: [
      'Weekly educational newsletters',
      'Expert video content library',
      'Group support sessions',
      'Tailored revision plans',
    ],
    cta: 'Explore PSP',
    href: '/register?service=psp',
    highlight: false,
  },
  {
    icon: Home,
    title: 'Homeschooling Solutions',
    description: 'Comprehensive lesson planning, progress tracking, and resources to support your homeschooling journey with confidence.',
    price: 'Custom quotes',
    features: [
      'Curriculum-aligned lesson plans',
      'Progress tracking dashboard',
      'Resource library access',
      'Includes PSP access',
    ],
    cta: 'Get a Quote',
    href: '/register?service=homeschool',
    highlight: false,
  },
];

export function ServicesSection() {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">Our Services</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How Tipu Helps You Grow
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the support that fits your family's needs. From one-on-one tutoring 
            to comprehensive homeschooling support.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                service.highlight ? 'border-primary shadow-lg' : ''
              }`}
            >
              {service.highlight && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              
              <CardHeader>
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <service.icon className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-primary">{service.price}</p>
                  {service.tiers && (
                    <div className="flex gap-2 mt-2">
                      {service.tiers.map((tier) => (
                        <Badge key={tier} variant="outline" className="text-xs">
                          {tier}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <ul className="space-y-3">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full group"
                  variant={service.highlight ? 'default' : 'outline'}
                  onClick={() => navigate(service.href)}
                >
                  {service.cta}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}