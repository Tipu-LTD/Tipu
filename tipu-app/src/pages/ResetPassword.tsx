import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { confirmPasswordReset } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const getResetErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/expired-action-code':
      return 'This password reset link has expired. Please request a new one.';
    case 'auth/invalid-action-code':
      return 'This password reset link is invalid or has already been used.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found. The user may have been deleted.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a stronger password.';
    default:
      return 'An error occurred. Please try again or request a new reset link.';
  }
};

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  return strength;
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  });

  const passwordValue = watch('password', '');

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(passwordValue));
  }, [passwordValue]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  if (!oobCode) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-4 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        </div>

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is invalid or incomplete</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The password reset link you followed is invalid. Please request a new password reset.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button className="w-full" onClick={() => navigate('/forgot-password')}>
              Request New Reset Link
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await confirmPasswordReset(oobCode, data.password);
      setIsSuccess(true);
      toast.success('Password reset successful!');
    } catch (error: any) {
      const errorMessage = getResetErrorMessage(error.code || '');
      toast.error(errorMessage);
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
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
        {!isSuccess && (
          <Button variant="ghost" onClick={() => navigate('/login')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              {isSuccess ? 'Password Reset Complete!' : 'Reset Your Password'}
            </CardTitle>
            <CardDescription>
              {isSuccess
                ? 'You can now login with your new password'
                : 'Enter your new password below'
              }
            </CardDescription>
          </CardHeader>

          {!isSuccess ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}

                  {passwordValue && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Password strength</span>
                        <span className="text-muted-foreground">
                          {passwordStrength < 50 ? 'Weak' : passwordStrength < 75 ? 'Medium' : 'Strong'}
                        </span>
                      </div>
                      <Progress value={passwordStrength} className="h-1.5" indicatorClassName={getStrengthColor(passwordStrength)} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p className="font-semibold">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li className={passwordValue.length >= 8 ? 'text-green-600' : ''}>
                        At least 8 characters
                      </li>
                      <li className={/[A-Z]/.test(passwordValue) ? 'text-green-600' : ''}>
                        One uppercase letter
                      </li>
                      <li className={/[a-z]/.test(passwordValue) ? 'text-green-600' : ''}>
                        One lowercase letter
                      </li>
                      <li className={/[0-9]/.test(passwordValue) ? 'text-green-600' : ''}>
                        One number
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>

                <div className="text-sm text-center">
                  <Link to="/forgot-password" className="text-primary hover:underline">
                    Need a new reset link?
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your password has been successfully reset!
                </AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground text-center">
                Redirecting to login page in 3 seconds...
              </p>

              <Button
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Go to Login Now
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
