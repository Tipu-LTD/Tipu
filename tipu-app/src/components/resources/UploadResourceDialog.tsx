import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { resourcesApi } from '@/lib/api/resources';
import { uploadResourceFile } from '@/lib/firebase/storage';
import { ResourceType, ResourceSubject } from '@/types/resource';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UploadResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
}

type UploadState = 'idle' | 'uploading' | 'saving';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function UploadResourceDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: UploadResourceDialogProps) {
  const { currentUser } = useAuth();

  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceType>('guide');
  const [subject, setSubject] = useState<ResourceSubject>('General');
  const [level, setLevel] = useState<'GCSE' | 'A-Level' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>('idle');

  const createResourceMutation = useMutation({
    mutationFn: resourcesApi.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources', studentId] });
      toast.success('Resource uploaded successfully');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save resource');
      setUploadState('idle');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 100MB');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleClose = () => {
    // Reset all form fields
    setTitle('');
    setDescription('');
    setType('guide');
    setSubject('General');
    setLevel('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadState('idle');
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast.error('Please provide a title and select a file');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to upload resources');
      return;
    }

    try {
      setUploadState('uploading');

      // Upload to Firebase Storage
      const fileUrl = await uploadResourceFile(
        selectedFile,
        currentUser.uid,
        studentId,
        (progress) => setUploadProgress(progress.progress)
      );

      setUploadState('saving');

      // Save metadata to Firestore via API
      await createResourceMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        subject,
        level: level || undefined,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        studentId,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload resource');
      setUploadState('idle');
    }
  };

  const isUploading = uploadState !== 'idle';

  return (
    <Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Upload Resource for {studentName}</DialogTitle>
          <DialogDescription>
            Upload lesson recordings, study guides, notes, or other educational materials
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Week 3 - Quadratic Equations"
              disabled={isUploading}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional notes or context..."
              disabled={isUploading}
              rows={3}
            />
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">
              Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as ResourceType)}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recording">Lesson Recording</SelectItem>
                <SelectItem value="homework">Homework Assignment</SelectItem>
                <SelectItem value="guide">Study Guide</SelectItem>
                <SelectItem value="notes">Notes</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Select
              value={subject}
              onValueChange={(value) => setSubject(value as ResourceSubject)}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Maths">Maths</SelectItem>
                <SelectItem value="Physics">Physics</SelectItem>
                <SelectItem value="Computer Science">Computer Science</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Level (Optional) */}
          <div>
            <Label htmlFor="level">Level (optional)</Label>
            <Select
              value={level}
              onValueChange={(value) => setLevel(value as 'GCSE' | 'A-Level' | '')}
              disabled={isUploading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select level..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GCSE">GCSE</SelectItem>
                <SelectItem value="A-Level">A-Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Input */}
          <div>
            <Label htmlFor="file">
              File <span className="text-red-500">*</span>
            </Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              disabled={isUploading}
              accept="*/*"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadState === 'uploading' ? 'Uploading file...' : 'Saving metadata...'}
                </span>
                <span className="font-medium">
                  {uploadState === 'uploading' ? `${Math.round(uploadProgress)}%` : ''}
                </span>
              </div>
              <Progress
                value={uploadState === 'uploading' ? uploadProgress : 100}
                className="w-full"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !title.trim()}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
