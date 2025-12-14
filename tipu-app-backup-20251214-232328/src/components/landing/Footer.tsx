import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card py-12 px-4">
      <div className="container mx-auto">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-bold mb-4">About</h3>
            <p className="text-sm text-muted-foreground">
              TIPU Academy connects students with qualified tutors for personalized learning in Maths, Physics, Computer Science, and Python.
            </p>
          </div>
          <div>
            <h3 className="font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link></li>
              <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link></li>
              <li><Link to="/help" className="text-muted-foreground hover:text-foreground">Help</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold mb-4">Subjects</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/tutors?subject=maths" className="text-muted-foreground hover:text-foreground">Maths</Link></li>
              <li><Link to="/tutors?subject=physics" className="text-muted-foreground hover:text-foreground">Physics</Link></li>
              <li><Link to="/tutors?subject=computer-science" className="text-muted-foreground hover:text-foreground">Computer Science</Link></li>
              <li><Link to="/tutors?subject=python" className="text-muted-foreground hover:text-foreground">Python</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {currentYear} TIPU Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
