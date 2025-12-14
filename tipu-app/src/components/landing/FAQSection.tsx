import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What qualifications do your tutors have?',
    answer: 'All our tutors are current university students who achieved A/A* grades (or equivalent) in the subjects they teach. They undergo a rigorous selection process, enhanced DBS checks, and training in our teaching methodology. Many have experience tutoring or mentoring younger students.',
  },
  {
    question: 'How does the booking system work?',
    answer: 'Simply browse our tutor profiles, select a tutor that matches your needs, and choose an available time slot. You can book individual sessions or purchase a bundle of 10+ lessons for a 10% discount. Sessions are confirmed instantly, and you\'ll receive calendar invites with the meeting link.',
  },
  {
    question: 'Can I try a lesson before committing?',
    answer: 'Yes! We offer a satisfaction guarantee on your first session. If you\'re not happy with your first lesson for any reason, we\'ll either match you with a different tutor or provide a full refund – no questions asked.',
  },
  {
    question: "What's included in the Parent Support Program?",
    answer: 'PSP includes weekly educational newsletters, an expert video content library, group support sessions with other parents, tailored revision plans for your child, and resources for supporting students with ADHD and dyslexia. Premium tiers include 1-on-1 consultations and priority tutor matching.',
  },
  {
    question: 'How does homeschooling support differ from tutoring?',
    answer: 'Homeschooling support provides a complete educational framework including curriculum-aligned lesson plans, a progress tracking dashboard, full access to our resource library, the ability to upload and have work reviewed, and PSP access included. It\'s designed for families who are fully homeschooling, while tutoring supplements existing education.',
  },
  {
    question: 'Are sessions really recorded?',
    answer: 'Yes! All tutoring sessions are recorded (with consent) and made available in your dashboard within 24 hours. Students can rewatch explanations, review worked examples before exams, and parents can check in on lesson quality. Recordings are stored securely and accessible for 6 months.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit and debit cards through our secure payment processor (Stripe). For homeschooling packages and annual PSP subscriptions, we also offer bank transfer options. All payments are encrypted and PCI-compliant.',
  },
  {
    question: 'What subjects do you cover?',
    answer: 'We currently specialize in Mathematics, Physics, Computer Science, and Python programming at GCSE and A-Level. We\'re expanding to cover more subjects based on demand. Each tutor has specific subject expertise listed on their profile.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="secondary" className="mb-4">FAQ</Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Got questions? We've got answers. Can't find what you're looking for? Contact us!
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border rounded-lg px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left hover:no-underline py-5">
                  <span className="font-semibold pr-4">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}