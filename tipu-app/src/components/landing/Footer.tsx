import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle } from 'lucide-react';

const quickLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Our Tutors', href: '/our-tutors' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Contact', href: '/contact' },
];

const services = [
  { label: 'Private Tutoring', href: '/our-tutors' },
  { label: 'Parent Support Program', href: '/register?service=psp' },
  { label: 'Homeschooling Support', href: '/register?service=homeschool' },
  { label: 'GCSE Support', href: '/our-tutors' },
  { label: 'A-Level Support', href: '/our-tutors' },
];

const legal = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Safeguarding Policy', href: '/safeguarding' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-16 px-4">
      <div className="container mx-auto">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <img src="/tipu-logo.png" alt="Tipu" className="h-10 w-auto mb-4 brightness-0 invert" />
            <p className="text-background/70 text-sm mb-6 leading-relaxed">
              Every student has the potential to grow. Personalized tutoring, parent support, 
              and homeschooling resources from university students who understand your journey.
            </p>
            {/* Contact Info */}
            <div className="space-y-3">
              <a href="mailto:hello@tipu.edu" className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors">
                <Mail className="h-4 w-4" />
                hello@tipu.edu
              </a>
              <a href="tel:+441onal" className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors">
                <Phone className="h-4 w-4" />
                +44 (0) 123 456 7890
              </a>
              <a href="https://wa.me/44123456789" className="flex items-center gap-2 text-sm text-background/70 hover:text-background transition-colors">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Support
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Services</h3>
            <ul className="space-y-3">
              {services.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-3">
              {legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href} 
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Social Links Placeholder */}
            <div className="mt-8">
              <h4 className="font-medium mb-3">Follow Us</h4>
              <div className="flex gap-3">
                {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                  <a 
                    key={social}
                    href={`https://${social}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors"
                    aria-label={social}
                  >
                    <span className="text-xs uppercase font-medium">
                      {social[0]}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/60">
              © {currentYear} Tipu. All rights reserved.
            </p>
            <p className="text-sm text-background/60">
              Made with 🌱 for students everywhere
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}