import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signUpWithEmail } from '@/lib/firebase/auth';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { GraduationCap, Users, Heart, ArrowLeft } from 'lucide-react';
import { UserRole, Subject } from '@/types/user';

const roles = [
  {
    value: 'student' as UserRole,
    icon: GraduationCap,
    title: 'Student',
    description: 'Book sessions and learn from expert tutors'
  },
  {
    value: 'tutor' as UserRole,
    icon: Users,
    title: 'Tutor',
    description: 'Share your knowledge and earn money'
  },
  {
    value: 'parent' as UserRole,
    icon: Heart,
    title: 'Parent',
    description: "Manage your children's learning journey"
  }
];

const basicInfoSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
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

type BasicInfoData = z.infer<typeof basicInfoSchema>;

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [basicInfo, setBasicInfo] = useState<BasicInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Role-specific form data
  const [tutorBio, setTutorBio] = useState('');
  const [tutorSubjects, setTutorSubjects] = useState<Subject[]>([]);
  const [gcseRate, setGcseRate] = useState('');
  const [aLevelRate, setALevelRate] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema)
  });

  const progressValue = (step / 4) * 100;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBasicInfoSubmit = (data: BasicInfoData) => {
    setBasicInfo(data);
    setStep(3);
  };

  const handleSubjectToggle = (subject: Subject) => {
    setTutorSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const handleFinalSubmit = async () => {
    if (!selectedRole || !basicInfo) return;

    // Validate role-specific fields
    if (selectedRole === 'tutor') {
      if (tutorBio.length < 50) {
        toast.error('Bio must be at least 50 characters');
        return;
      }
      if (tutorSubjects.length === 0) {
        toast.error('Please select at least one subject');
        return;
      }
      if (!gcseRate || !aLevelRate) {
        toast.error('Please set your hourly rates');
        return;
      }
    }

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);
    try {
      // Sign up with Firebase
      const userCredential = await signUpWithEmail(basicInfo.email, basicInfo.password);
      const uid = userCredential.user.uid;

      // Prepare registration data
      const registrationData: any = {
        uid,
        email: basicInfo.email,
        displayName: basicInfo.displayName,
        role: selectedRole,
      };

      // Add role-specific data
      if (selectedRole === 'tutor') {
        registrationData.bio = tutorBio;
        registrationData.subjects = tutorSubjects;
        registrationData.hourlyRates = {
          GCSE: parseFloat(gcseRate),
          'A-Level': parseFloat(aLevelRate)
        };
      }

      // Register with backend
      await authApi.register(registrationData);

      toast.success('Account created successfully!');

      // Redirect to dashboard
      const dashboardMap: Record<UserRole, string> = {
        student: '/dashboard/student',
        tutor: '/dashboard/tutor',
        parent: '/dashboard/parent',
        admin: '/dashboard/admin'
      };
      navigate(dashboardMap[selectedRole]);
    } catch (error: any) {
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak, please choose a stronger password';
      }
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
      <div className="w-full max-w-2xl space-y-4">
        {step === 1 && (
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        )}
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Step {step} of 4</CardDescription>
            <Progress value={progressValue} className="mt-2" />
          </CardHeader>
        <CardContent>
          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Choose Your Role</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {roles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <Card
                      key={role.value}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedRole === role.value ? 'border-primary ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleRoleSelect(role.value)}
                    >
                      <CardHeader className="text-center">
                        <Icon className="h-12 w-12 mx-auto mb-2" />
                        <CardTitle className="text-base">{role.title}</CardTitle>
                        <CardDescription className="text-sm">{role.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
              <Button
                className="w-full"
                disabled={!selectedRole}
                onClick={() => setStep(2)}
              >
                Next
              </Button>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {step === 2 && (
            <form onSubmit={handleSubmit(handleBasicInfoSubmit)} className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input id="displayName" {...register('displayName')} />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">Next</Button>
              </div>
            </form>
          )}

          {/* Step 3: Role-Specific Fields */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {selectedRole === 'tutor' ? 'Tutor Information' : 'Additional Information'}
              </h3>

              {selectedRole === 'tutor' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about your teaching experience..."
                      value={tutorBio}
                      onChange={(e) => setTutorBio(e.target.value)}
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      {tutorBio.length}/1000 characters (minimum 50)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Subjects</Label>
                    <div className="space-y-2">
                      {(['Maths', 'Physics', 'Computer Science', 'Python'] as Subject[]).map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject}
                            checked={tutorSubjects.includes(subject)}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                          />
                          <Label htmlFor={subject} className="cursor-pointer">
                            {subject}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gcseRate">GCSE Hourly Rate (£)</Label>
                      <Input
                        id="gcseRate"
                        type="number"
                        min="10"
                        max="100"
                        value={gcseRate}
                        onChange={(e) => setGcseRate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aLevelRate">A-Level Hourly Rate (£)</Label>
                      <Input
                        id="aLevelRate"
                        type="number"
                        min="10"
                        max="100"
                        value={aLevelRate}
                        onChange={(e) => setALevelRate(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {selectedRole === 'parent' && (
                <p className="text-muted-foreground">
                  You can add your children after registration
                </p>
              )}

              {selectedRole === 'student' && (
                <p className="text-muted-foreground">
                  You're all set! Click Next to review and submit
                </p>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && basicInfo && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review Your Information</h3>
              <div className="space-y-2 p-4 bg-muted rounded-md">
                <p><strong>Role:</strong> {selectedRole}</p>
                <p><strong>Name:</strong> {basicInfo.displayName}</p>
                <p><strong>Email:</strong> {basicInfo.email}</p>
                {selectedRole === 'tutor' && (
                  <>
                    <p><strong>Subjects:</strong> {tutorSubjects.join(', ')}</p>
                    <p><strong>GCSE Rate:</strong> £{gcseRate}/hour</p>
                    <p><strong>A-Level Rate:</strong> £{aLevelRate}/hour</p>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <Label htmlFor="terms" className="cursor-pointer text-sm">
                  I agree to the Terms of Service and Privacy Policy
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={!termsAccepted || isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
