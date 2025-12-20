import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BookOpen, MessageCircle, Users, Upload } from 'lucide-react';
import { tutorsApi } from '@/lib/api/tutors';
import { SuggestLessonDialog } from '@/components/tutors/SuggestLessonDialog';
import { UploadResourceDialog } from '@/components/resources/UploadResourceDialog';

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
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedUploadStudent, setSelectedUploadStudent] = useState<StudentProfile | null>(null);

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['tutor-students'],
    queryFn: tutorsApi.getMyStudents,
    retry: 2
  });

  console.log('🔍 TutorStudents - students data:', students);
  console.log('🔍 TutorStudents - uploadDialogOpen:', uploadDialogOpen);
  console.log('🔍 TutorStudents - selectedUploadStudent:', selectedUploadStudent);

  const handleSuggestLesson = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSuggestDialogOpen(true);
  };

  const handleUploadResource = (student: StudentProfile) => {
    alert('🔍 BUTTON CLICKED! Student: ' + student.displayName);
    console.log('🔍 Upload button clicked for student:', student);
    console.log('🔍 Student data:', JSON.stringify(student, null, 2));
    setSelectedUploadStudent(student);
    setUploadDialogOpen(true);
    console.log('🔍 Dialog state updated - should be open now');
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
      {(() => {
        console.log('🔍 Rendering UploadResourceDialog section');
        console.log('🔍 selectedUploadStudent:', selectedUploadStudent);
        console.log('🔍 uploadDialogOpen:', uploadDialogOpen);
        return selectedUploadStudent && (
          <UploadResourceDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            studentId={selectedUploadStudent.uid}
            studentName={selectedUploadStudent.displayName}
          />
        );
      })()}
    </DashboardLayout>
  );
}
