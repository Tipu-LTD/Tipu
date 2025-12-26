import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, MessageCircle, Users, Upload, FileText, ChevronDown, Download, Trash2 } from 'lucide-react';
import { tutorsApi } from '@/lib/api/tutors';
import { resourcesApi } from '@/lib/api/resources';
import { SuggestLessonDialog } from '@/components/tutors/SuggestLessonDialog';
import { UploadResourceDialog } from '@/components/resources/UploadResourceDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { parseFirestoreDate } from '@/utils/date';
import { useAuth } from '@/contexts/AuthContext';
import type { Resource } from '@/types/resource';

interface StudentProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  enrolledSubjects: string[];
  totalLessons: number;
  upcomingLessons: number;
}

export default function TutorStudents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUploadStudent, setSelectedUploadStudent] = useState<StudentProfile | null>(null);
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: tutorsApi.getMyStudents,
    retry: 2
  });

  const handleSuggestLesson = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSuggestDialogOpen(true);
  };

  const handleUploadResource = (student: StudentProfile) => {
    setSelectedUploadStudent(student);
    setUploadDialogOpen(true);
  };

  const toggleResourceExpansion = (studentId: string) => {
    setExpandedResources(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) => resourcesApi.deleteResource(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-resources'] });
      toast.success('Resource deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete resource');
    }
  });

  // StudentCard component with resource management
  const StudentCard = ({ student }: { student: StudentProfile }) => {
    const { data: studentResources = [], isLoading: resourcesLoading } = useQuery({
      queryKey: ['student-resources', student.uid],
      queryFn: () => resourcesApi.getStudentResources(student.uid),
      enabled: expandedResources[student.uid] === true
    });

    const handleDeleteResource = (resourceId: string) => {
      if (window.confirm('Are you sure you want to delete this resource?')) {
        deleteResourceMutation.mutate(resourceId);
      }
    };

    return (
      <Card key={student.uid}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={student.photoURL} />
              <AvatarFallback>
                {student.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{student.displayName}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Lessons</span>
            <Badge variant="secondary">{student.totalLessons}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Upcoming</span>
            <Badge>{student.upcomingLessons}</Badge>
          </div>
          {student.enrolledSubjects.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {student.enrolledSubjects.map((subject) => (
                <Badge key={subject} variant="outline" className="text-xs">
                  {subject}
                </Badge>
              ))}
            </div>
          )}

          {/* Resources Section */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleResourceExpansion(student.uid)}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Resources ({studentResources.length})</span>
              </div>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${expandedResources[student.uid] ? 'rotate-180' : ''}`}
              />
            </Button>

            {expandedResources[student.uid] && (
              <div className="mt-2 space-y-2">
                {resourcesLoading ? (
                  <Skeleton className="h-16" />
                ) : studentResources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No resources uploaded yet
                  </p>
                ) : (
                  studentResources.map((resource: Resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{resource.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">{resource.type}</Badge>
                          <span>{resource.subject}</span>
                          <span>{format(parseFirestoreDate(resource.createdAt), 'PP')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(resource.fileUrl, '_blank')}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {resource.uploadedBy === user?.uid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteResource(resource.id)}
                            disabled={deleteResourceMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            onClick={() => handleSuggestLesson(student.uid)}
            className="w-full"
            size="sm"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Suggest Lesson
          </Button>
          <Button
            onClick={() => handleUploadResource(student)}
            variant="secondary"
            className="w-full"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
          <div className="flex gap-2 w-full">
            <Button
              onClick={() => navigate(`/students/${student.uid}/reports`)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              View Reports
            </Button>
            <Button
              onClick={() => navigate(`/messages/${student.uid}`)}
              variant="outline"
              size="sm"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Students</h1>
          <p className="text-muted-foreground">
            View and manage your students
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium mb-2">Failed to load students</p>
              <p className="text-sm text-muted-foreground">
                {(error as Error).message || 'An error occurred while fetching your students'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Students Grid */}
        {!error && isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : !error && students.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                You haven't taught any students yet.
              </p>
            </CardContent>
          </Card>
        ) : !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <StudentCard key={student.uid} student={student} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Suggest Lesson Dialog */}
      {selectedStudentId && (
        <SuggestLessonDialog
          open={suggestDialogOpen}
          onOpenChange={setSuggestDialogOpen}
          studentId={selectedStudentId}
          student={students.find(s => s.uid === selectedStudentId)}
        />
      )}

      {/* Upload Resource Dialog */}
      {selectedUploadStudent && (
        <UploadResourceDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          studentId={selectedUploadStudent.uid}
          studentName={selectedUploadStudent.displayName}
        />
      )}
    </DashboardLayout>
  );
}
