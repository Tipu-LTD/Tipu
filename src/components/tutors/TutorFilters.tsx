import { Subject } from '@/types/user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface TutorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSubject: Subject | 'All';
  onSubjectChange: (subject: Subject | 'All') => void;
  sortBy: 'price-asc' | 'price-desc';
  onSortChange: (sort: 'price-asc' | 'price-desc') => void;
  onClearFilters: () => void;
}

const subjects: Array<Subject | 'All'> = ['All', 'Maths', 'Physics', 'Computer Science', 'Python'];

export function TutorFilters({
  searchQuery,
  onSearchChange,
  selectedSubject,
  onSubjectChange,
  sortBy,
  onSortChange,
  onClearFilters,
}: TutorFiltersProps) {
  const hasActiveFilters = searchQuery !== '' || selectedSubject !== 'All' || sortBy !== 'price-asc';

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search tutors by name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Subject Filter */}
        <div className="w-full md:w-48 space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select value={selectedSubject} onValueChange={(value) => onSubjectChange(value as Subject | 'All')}>
            <SelectTrigger id="subject">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map(subject => (
                <SelectItem key={subject} value={subject}>
                  {subject === 'All' ? 'All Subjects' : subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Dropdown */}
        <div className="w-full md:w-48 space-y-2">
          <Label htmlFor="sort">Sort by</Label>
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as 'price-asc' | 'price-desc')}>
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <Button variant="outline" onClick={onClearFilters} className="w-full md:w-auto">
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
