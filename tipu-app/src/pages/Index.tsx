import { useState, useEffect } from 'react';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { Hero } from '@/components/landing/Hero';
import { TrustIndicators } from '@/components/landing/TrustIndicators';
import { ServicesSection } from '@/components/landing/ServicesSection';
import { WhyChooseTipu } from '@/components/landing/WhyChooseTipu';
import { TutorShowcase } from '@/components/landing/TutorShowcase';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PricingSection } from '@/components/landing/PricingSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

const Index = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <Hero />
      <TrustIndicators />
      <ServicesSection />
      <WhyChooseTipu />
      <TutorShowcase />
      <HowItWorks />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />

      {/* Back to Top Button */}
      <Button
        variant="default"
        size="icon"
        className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all duration-300 ${
          showBackToTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default Index;