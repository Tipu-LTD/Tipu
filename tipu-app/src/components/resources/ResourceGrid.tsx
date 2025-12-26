import { useState, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { ResourceCard } from './ResourceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Resource } from '@/types/resource';

interface ResourceGridProps {
  resources: Resource[];
  tutorNames?: Record<string, string>; // tutorId -> name mapping
}

type ResourceType = Resource['type'] | 'all';
type SortOption = 'newest' | 'oldest' | 'title';

export function ResourceGrid({ resources, tutorNames = {} }: ResourceGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ResourceType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let filtered = [...resources];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(search) ||
        r.description?.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === typeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [resources, searchTerm, typeFilter, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setSortBy('newest');
  };

  const hasActiveFilters = searchTerm || typeFilter !== 'all' || sortBy !== 'newest';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <CardTitle>Filter Resources</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Type filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select value={typeFilter} onValueChange={(value: ResourceType) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="recording">Recordings</SelectItem>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="guide">Guides</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} found
        </p>
      </div>

      {/* Resource grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              tutorName={resource.uploadedBy ? tutorNames[resource.uploadedBy] : undefined}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No Resources Found</CardTitle>
            <CardDescription>
              {hasActiveFilters
                ? 'Try adjusting your filters to see more results.'
                : 'Your tutor hasn\'t shared any resources yet.'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
