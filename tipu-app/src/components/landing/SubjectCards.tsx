import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calculator, Atom, Code, Terminal } from 'lucide-react';

const subjects = [
  {
    name: 'Maths',
    icon: Calculator,
    description: 'Master equations, algebra, calculus and more',
    slug: 'maths'
  },
  {
    name: 'Physics',
    icon: Atom,
    description: 'Explore the laws of nature and mechanics',
    slug: 'physics'
  },
  {
    name: 'Computer Science',
    icon: Code,
    description: 'Learn programming, algorithms and data structures',
    slug: 'computer-science'
  },
  {
    name: 'Python',
    icon: Terminal,
    description: 'Build real-world applications with Python',
    slug: 'python'
  }
];

export function SubjectCards() {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Choose Your Subject</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {subjects.map((subject) => {
            const Icon = subject.icon;
            return (
              <Card key={subject.name} className="hover:border-primary transition-all">
                <CardHeader className="text-center">
                  <Icon className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <CardTitle>{subject.name}</CardTitle>
                  <CardDescription>{subject.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/tutors?subject=${subject.slug}`)}
                  >
                    Browse Tutors
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
