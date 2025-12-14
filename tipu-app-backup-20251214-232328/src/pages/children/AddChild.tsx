import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAge } from '@/utils/age';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus, AlertCircle } from 'lucide-react';

const addChildSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
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

type AddChildFormData = z.infer<typeof addChildSchema>;

const AddChild = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [childAge, setChildAge] = useState<number | null>(null);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<AddChildFormData>({
    resolver: zodResolver(addChildSchema)
  });

  const dateOfBirth = watch('dateOfBirth');

  // Calculate age when DOB changes
  const handleDateChange = (dob: string) => {
    if (dob) {
      const age = calculateAge(dob);
      setChildAge(age);
    } else {
      setChildAge(null);
    }
  };

  const onSubmit = async (data: AddChildFormData) => {
    if (!user) {
      toast.error('You must be logged in to add a child');
      return;
    }

    if (user.role !== 'parent') {
      toast.error('Only parent accounts can add children');
      return;
    }

    setIsLoading(true);
    try {
      // Create Firebase Auth account for child
      const userCredential = await signUpWithEmail(data.email, data.password);
      const childUid = userCredential.user.uid;

      // Register child with backend, linking to parent
      await authApi.register({
        uid: childUid,
        email: data.email,
        displayName: data.displayName,
        role: 'student',
        dateOfBirth: data.dateOfBirth,
        parentId: user.uid, // Link to current parent
      });

      toast.success(`${data.displayName} has been added successfully!`);

      // Redirect to parent dashboard
      navigate('/dashboard/parent');
    } catch (error: any) {
      console.error('Error adding child:', error);

      let errorMessage = 'Failed to add child. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak, please choose a stronger password';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/parent')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              <div>
                <CardTitle>Add a Child</CardTitle>
                <CardDescription>
                  Create a student account for your child
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Child's Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Child's Full Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Emma Smith"
                  {...register('displayName')}
                />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                )}
              </div>

              {/* Child's Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Child's Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="child@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  This will be used to log in to their student account
                </p>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                  onChange={(e) => {
                    register('dateOfBirth').onChange(e);
                    handleDateChange(e.target.value);
                  }}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.dateOfBirth && (
                  <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
                )}
                {childAge !== null && (
                  <p className="text-sm text-muted-foreground">
                    Age: {childAge} years old
                  </p>
                )}
              </div>

              {/* Age Warning for Under 18 */}
              {childAge !== null && childAge < 18 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Students under 18 cannot use chat features for safeguarding reasons.
                    They can still book and attend lessons.
                  </AlertDescription>
                </Alert>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Minimum 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard/parent')}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Adding Child...' : 'Add Child'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• A student account will be created for your child</li>
              <li>• You'll be able to book lessons on their behalf</li>
              <li>• You can view all their bookings and progress</li>
              <li>• They can log in using their email and password</li>
              <li>• You'll manage all payments through your parent account</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddChild;
