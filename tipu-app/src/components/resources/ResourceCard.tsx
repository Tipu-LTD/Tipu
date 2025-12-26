import { Download, FileVideo, FileText, BookOpen, StickyNote, File } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { parseFirestoreDate } from '@/utils/date';
import type { Resource } from '@/types/resource';

const RESOURCE_TYPE_ICONS = {
  recording: <FileVideo className="h-5 w-5 text-purple-600" />,
  homework: <FileText className="h-5 w-5 text-blue-600" />,
  guide: <BookOpen className="h-5 w-5 text-green-600" />,
  notes: <StickyNote className="h-5 w-5 text-yellow-600" />,
  other: <File className="h-5 w-5 text-gray-600" />
};

const RESOURCE_TYPE_COLORS = {
  recording: 'bg-purple-100 text-purple-800 border-purple-200',
  homework: 'bg-blue-100 text-blue-800 border-purple-200',
  guide: 'bg-green-100 text-green-800 border-green-200',
  notes: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200'
};

interface ResourceCardProps {
  resource: Resource;
  tutorName?: string;
}

export function ResourceCard({ resource, tutorName }: ResourceCardProps) {
  const handleDownload = () => {
    // Open the file URL in a new tab for download
    window.open(resource.fileUrl, '_blank');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {RESOURCE_TYPE_ICONS[resource.type]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg leading-tight truncate">
                {resource.title}
              </h3>
              {resource.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {resource.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Resource metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={RESOURCE_TYPE_COLORS[resource.type]}>
            {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
          </Badge>

          {resource.level && (
            <Badge variant="outline" className="bg-gray-50">
              {resource.level}
            </Badge>
          )}
        </div>

        {/* File info */}
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>File size:</span>
            <span className="font-medium">{formatFileSize(resource.fileSize)}</span>
          </div>
          {tutorName && (
            <div className="flex items-center justify-between">
              <span>Uploaded by:</span>
              <span className="font-medium">{tutorName}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Date:</span>
            <span className="font-medium">
              {format(parseFirestoreDate(resource.createdAt), 'PPP')}
            </span>
          </div>
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownload}
          className="w-full"
          variant="default"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardContent>
    </Card>
  );
}
