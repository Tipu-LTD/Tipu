import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function PublicNavbar() {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">TIPU Academy</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button onClick={() => navigate('/register')}>
            Register
          </Button>
        </div>
      </div>
    </nav>
  );
}
