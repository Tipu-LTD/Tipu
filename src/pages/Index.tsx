import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { Hero } from '@/components/landing/Hero';
import { SubjectCards } from '@/components/landing/SubjectCards';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <PublicNavbar />
      <Hero />
      <SubjectCards />
      <HowItWorks />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
