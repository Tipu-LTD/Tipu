import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { tutorsApi, SuggestLessonData, StudentProfile } from '@/lib/api/tutors';
import { Subject, Level } from '@/types/booking';

interface SuggestLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  student?: StudentProfile;
}

export function SuggestLessonDialog({
  open,
  onOpenChange,
  studentId,
  student
}: SuggestLessonDialogProps) {
  const queryClient = useQueryClient();

  // Form state
  const [subject, setSubject] = useState<Subject>('Maths');
  const [level, setLevel] = useState<Level>('GCSE');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');

  const suggestMutation = useMutation({
    mutationFn: (data: SuggestLessonData) => tutorsApi.suggestLesson(data),
    onSuccess: () => {
      toast.success('Lesson suggestion sent to parent for approval');
      queryClient.invalidateQueries({ queryKey: ['tutor-students'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to suggest lesson');
    }
  });

  const handleSubmit = () => {
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }

    // Validate date is at least 1 hour from now and within 1 year
    const selectedDate = new Date(scheduledAt);
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    if (selectedDate < oneHourFromNow) {
      toast.error('Lesson must be scheduled at least 1 hour from now');
      return;
    }

    if (selectedDate > oneYearFromNow) {
      toast.error('Lesson cannot be scheduled more than 1 year in advance');
      return;
    }

    // Convert datetime-local format to ISO 8601 format for backend
    const isoDateTime = selectedDate.toISOString();

    suggestMutation.mutate({
      studentId,
      subject,
      level,
      scheduledAt: isoDateTime,
      duration,
      notes
    });
  };

  const handleClose = () => {
    setSubject('Maths');
    setLevel('GCSE');
    setScheduledAt('');
    setDuration(60);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Lesson</DialogTitle>
          <DialogDescription>
            Suggest a lesson time for {student?.displayName || 'this student'}.
            Their parent will need to approve and pay for the lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select value={subject} onValueChange={(v) => setSubject(v as Subject)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maths">Maths</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GCSE">GCSE</SelectItem>
                <SelectItem value="A-Level">A-Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
              max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be at least 1 hour from now, within the next year
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the parent about this lesson..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={suggestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={suggestMutation.isPending || !scheduledAt}
            >
              {suggestMutation.isPending ? 'Sending...' : 'Suggest Lesson'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
