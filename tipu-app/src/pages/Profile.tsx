import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';
import { useState } from 'react';
import { Subject } from '@/types/user';
import { Loader2 } from 'lucide-react';

const subjects: Subject[] = ['Maths', 'Physics', 'Computer Science', 'Python'];

const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  bio: z.string().min(50, 'Bio must be at least 50 characters').max(1000, 'Bio must be less than 1000 characters').optional(),
  subjects: z.array(z.string()).optional(),
  // Rate fields removed - using fixed pricing (£29 GCSE, £39 A-Level)
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(user?.subjects || []);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      bio: user?.bio || '',
      // Rate default values removed - using fixed pricing
    }
  });

  const handleSubjectToggle = (subject: Subject) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const updateData: any = {
        displayName: data.displayName,
      };

      if (user.role === 'tutor') {
        updateData.bio = data.bio;
        updateData.subjects = selectedSubjects;
        // hourlyRates removed from update - backend uses fixed pricing
      }

      await usersApi.update(user.uid, updateData);
      await refreshProfile();
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your profile information</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your basic profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" {...register('displayName')} />
                {errors.displayName && (
                  <p className="text-sm text-destructive">{errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input value={user.role} disabled className="capitalize" />
              </div>
            </CardContent>
          </Card>

          {user.role === 'tutor' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Tutor Information</CardTitle>
                  <CardDescription>Tell students about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea 
                      id="bio" 
                      {...register('bio')} 
                      rows={6}
                      placeholder="Tell students about your teaching experience, qualifications, and approach..."
                    />
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Minimum 50 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Subjects I Teach</Label>
                    <div className="space-y-2">
                      {subjects.map(subject => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={subject}
                            checked={selectedSubjects.includes(subject)}
                            onCheckedChange={() => handleSubjectToggle(subject)}
                          />
                          <Label htmlFor={subject} className="font-normal cursor-pointer">
                            {subject}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedSubjects.length === 0 && (
                      <p className="text-sm text-destructive">Please select at least one subject</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hourly Rates</CardTitle>
                  <CardDescription>Standard rates for all tutors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">GCSE</span>
                      <span className="text-lg font-bold text-primary">£29.00/hr</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="font-medium">A-Level</span>
                      <span className="text-lg font-bold text-primary">£39.00/hr</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Standard rates apply to all tutors. Contact support if you have questions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
