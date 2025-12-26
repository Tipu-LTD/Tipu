import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { signInWithEmail } from '@/lib/firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserRole } from '@/types/user';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginFormData = z.infer<typeof loginSchema>;

const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
};

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (!loading && user) {
      const dashboardMap: Record<UserRole, string> = {
        student: '/dashboard/student',
        tutor: '/dashboard/tutor',
        parent: '/dashboard/parent',
        admin: '/dashboard/admin'
      };

      navigate(dashboardMap[user.role], { replace: true });
    }
  }, [loading, user, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Sign in with Firebase
      await signInWithEmail(data.email, data.password, staySignedIn);

      // Refresh profile to sync auth state
      await refreshProfile();

      // Show success message
      toast.success('Login successful!');

      // Navigation handled by useEffect when user state updates
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = getAuthErrorMessage(error.code || '');
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img 
          src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
      </div>
      <div className="w-full max-w-md space-y-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your TIPU Academy account</CardDescription>
          </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="staySignedIn"
                checked={staySignedIn}
                onCheckedChange={(checked) => setStaySignedIn(checked as boolean)}
              />
              <Label
                htmlFor="staySignedIn"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Stay signed in
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
            <div className="text-sm text-center space-y-2">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Forgot your password?
              </Link>
              <div>
                <Link to="/register" className="text-primary hover:underline">
                  Don't have an account? Register
                </Link>
              </div>
            </div>
          </CardFooter>
        </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
