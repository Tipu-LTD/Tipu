import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navLinks = [
  { label: 'Home', href: '/', isPage: true },
  { label: 'Subjects & Pricing', href: '/#pricing', isPage: false },
  { label: 'Our Tutors', href: '/our-tutors', isPage: true },
  { label: 'About', href: '/about', isPage: true },
  { label: 'Contact', href: '/contact', isPage: true },
];

export function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string, isPage: boolean) => {
    setIsOpen(false);
    
    if (isPage) {
      navigate(href);
    } else if (href.startsWith('/#')) {
      // Handle hash links - navigate to home first if not there
      if (location.pathname !== '/') {
        navigate(href);
      } else {
        const element = document.querySelector(href.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex h-16 md:h-20 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <img src="/tipu-logo.png" alt="Tipu" className="h-10 md:h-12 w-auto" />
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href, link.isPage)}
              className="text-foreground/80 hover:text-primary font-medium transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/login')} className="px-6">
            Sign In
          </Button>
          <Button onClick={() => navigate('/register')} className="px-6">
            Book a Session
          </Button>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[350px]">
            <div className="flex flex-col gap-6 mt-8">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href, link.isPage)}
                  className="text-lg font-medium text-foreground/80 hover:text-primary transition-colors text-left"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t">
                <Button variant="outline" onClick={() => { setIsOpen(false); navigate('/login'); }}>
                  Sign In
                </Button>
                <Button onClick={() => { setIsOpen(false); navigate('/register'); }}>
                  Book a Session
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}