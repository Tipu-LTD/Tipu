import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api/users';
import { Subject } from '@/types/user';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TutorCard } from '@/components/tutors/TutorCard';
import { TutorFilters } from '@/components/tutors/TutorFilters';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Tutors() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'All'>('All');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc'>('price-asc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['tutors'],
    queryFn: () => usersApi.getAllTutors(),
  });

  if (error) {
    toast.error('Failed to load tutors', {
      description: 'Please try again later'
    });
  }

  const tutors = data?.tutors || [];
  
  // Filter only approved tutors
  const approvedTutors = tutors.filter(tutor => tutor.isApproved === true);

  // Apply search filter
  const filteredBySearch = approvedTutors.filter(tutor =>
    tutor.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply subject filter
  const filteredBySubject = selectedSubject === 'All'
    ? filteredBySearch
    : filteredBySearch.filter(tutor =>
        tutor.subjects?.includes(selectedSubject)
      );

  // Apply sorting
  const sortedTutors = [...filteredBySubject].sort((a, b) => {
    const priceA = a.hourlyRates?.GCSE || 0;
    const priceB = b.hourlyRates?.GCSE || 0;
    return sortBy === 'price-asc' ? priceA - priceB : priceB - priceA;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubject('All');
    setSortBy('price-asc');
  };

  const hasActiveFilters = searchQuery !== '' || selectedSubject !== 'All' || sortBy !== 'price-asc';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Find a Tutor</h1>
          <p className="text-muted-foreground mt-2">
            Browse our expert tutors and book your next lesson
          </p>
        </div>

        {/* Filters */}
        <TutorFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSubject={selectedSubject}
          onSubjectChange={setSelectedSubject}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClearFilters={handleClearFilters}
        />

        {/* Results Count */}
        {!isLoading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {sortedTutors.length} {sortedTutors.length === 1 ? 'tutor' : 'tutors'}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center space-y-4">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2 w-full">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tutor Grid */}
        {!isLoading && sortedTutors.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedTutors.map(tutor => (
              <TutorCard key={tutor.uid} tutor={tutor} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedTutors.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tutors found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or search query
            </p>
            <Button onClick={handleClearFilters}>Clear Filters</Button>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
