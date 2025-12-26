import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/api/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Subject } from '@/types/user';

const AVAILABLE_SUBJECTS: Subject[] = ['Maths', 'Physics', 'Computer Science', 'Python'];

interface EnrollSubjectsProps {
  /**
   * Pass this prop to control the component externally
   * (e.g., when redirected from /lessons with ?enrollSubjects=true)
   */
  autoFocus?: boolean;
}

export function EnrollSubjects({ autoFocus = false }: EnrollSubjectsProps) {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  // Initialize with current enrolled subjects or empty array
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(
    user?.enrolledSubjects || []
  );

  const updateSubjectsMutation = useMutation({
    mutationFn: async (subjects: Subject[]) => {
      if (!user?.uid) throw new Error('User not authenticated');

      return updateUserProfile(user.uid, {
        enrolledSubjects: subjects
      });
    },
    onSuccess: async () => {
      // Invalidate user query to refetch updated profile
      queryClient.invalidateQueries({ queryKey: ['user', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });

      // CRITICAL: Refresh AuthContext user object to sync with backend
      await refreshProfile();

      toast.success('Subjects updated successfully!', {
        description: 'Your enrolled subjects have been saved.'
      });
    },
    onError: (error: any) => {
      toast.error('Failed to update subjects', {
        description: error.message || 'Please try again later.'
      });
    }
  });

  const handleSubjectToggle = (subject: Subject) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        // Remove subject
        return prev.filter(s => s !== subject);
      } else {
        // Add subject
        return [...prev, subject];
      }
    });
  };

  const handleSave = () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject');
      return;
    }

    updateSubjectsMutation.mutate(selectedSubjects);
  };

  const hasChanges = JSON.stringify(selectedSubjects.sort()) !==
                     JSON.stringify((user?.enrolledSubjects || []).sort());

  return (
    <Card className={autoFocus ? 'border-blue-300 shadow-lg' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <CardTitle>Enrolled Subjects</CardTitle>
        </div>
        <CardDescription>
          Select the subjects you're studying. This helps personalize your lessons page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Subject checkboxes */}
          <div className="grid gap-3">
            {AVAILABLE_SUBJECTS.map((subject) => {
              const isSelected = selectedSubjects.includes(subject);

              return (
                <div
                  key={subject}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={`subject-${subject}`}
                    checked={isSelected}
                    onCheckedChange={() => handleSubjectToggle(subject)}
                  />
                  <Label
                    htmlFor={`subject-${subject}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {subject}
                  </Label>
                  {isSelected && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected count */}
          {selectedSubjects.length > 0 && (
            <p className="text-sm text-gray-600">
              {selectedSubjects.length} subject{selectedSubjects.length > 1 ? 's' : ''} selected
            </p>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSubjectsMutation.isPending}
            className="w-full"
          >
            {updateSubjectsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>

          {/* Help text */}
          <p className="text-xs text-gray-500">
            You can change your enrolled subjects anytime from this page.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
