import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset({ email: data.email });
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      // Security: Always show success even on error
      console.error('Password reset error:', error);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success('Password reset email sent!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!submittedEmail) return;
    setIsLoading(true);
    try {
      await authApi.requestPasswordReset({ email: submittedEmail });
      toast.success('Password reset email resent!');
    } catch (error) {
      console.error('Resend error:', error);
      toast.success('Password reset email resent!');
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
        {!isSuccess && (
          <Button variant="ghost" onClick={() => navigate('/login')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              {isSuccess ? 'Check Your Email' : 'Forgot Password?'}
            </CardTitle>
            <CardDescription>
              {isSuccess
                ? 'We\'ve sent you a password reset link'
                : 'Enter your email address and we\'ll send you a link to reset your password'
              }
            </CardDescription>
          </CardHeader>

          {!isSuccess ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    autoComplete="email"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    You'll receive an email with instructions to reset your password.
                    The link will expire in 1 hour.
                  </AlertDescription>
                </Alert>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div className="text-sm text-center space-y-2">
                  <Link to="/login" className="text-primary hover:underline">
                    Remember your password? Login
                  </Link>
                </div>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  If an account exists with <strong>{submittedEmail}</strong>,
                  you will receive a password reset link shortly.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Please check your email inbox and spam folder.</p>
                <p>The reset link will expire in 1 hour.</p>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  {isLoading ? 'Resending...' : 'Resend Email'}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Return to Login
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
