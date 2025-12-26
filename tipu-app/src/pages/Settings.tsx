import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { EnrollSubjects } from '@/components/settings/EnrollSubjects';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Settings = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const enrollSubjectsParam = searchParams.get('enrollSubjects');
  const shouldAutoFocus = enrollSubjectsParam === 'true';

  // Show toast if redirected from /lessons
  useEffect(() => {
    if (shouldAutoFocus && user?.role === 'student') {
      toast.info('Please enroll in subjects to view your lessons', {
        duration: 5000
      });
    }
  }, [shouldAutoFocus, user?.role]);

  const isStudent = user?.role === 'student';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive booking updates via email</p>
              </div>
              <Switch disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Message Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified about new messages</p>
              </div>
              <Switch disabled />
            </div>
            <p className="text-xs text-muted-foreground">Notification preferences coming in Phase 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Control your privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">Show your profile to other users</p>
              </div>
              <Switch disabled />
            </div>
            <p className="text-xs text-muted-foreground">Privacy settings coming in Phase 2</p>
          </CardContent>
        </Card>

        {/* Subject Enrollment - Students only */}
        {isStudent && (
          <EnrollSubjects autoFocus={shouldAutoFocus} />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => setChangePasswordOpen(true)}
            >
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </DashboardLayout>
  );
};

export default Settings;
