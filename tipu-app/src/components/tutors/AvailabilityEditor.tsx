import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getTutorAvailability, setTutorAvailability, WeeklyScheduleSlot } from '@/lib/api/availability';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function AvailabilityEditor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleSlot[]>([]);
  const [timezone, setTimezone] = useState('Europe/London');

  // Fetch existing availability
  const { data: availability, isLoading } = useQuery({
    queryKey: ['availability', user?.uid],
    queryFn: async () => {
      if (!user?.uid) throw new Error('User not authenticated');
      try {
        return await getTutorAvailability(user.uid);
      } catch (error: any) {
        // If 404, availability doesn't exist yet - that's okay
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!user?.uid
  });

  useEffect(() => {
    if (availability) {
      setWeeklySchedule(availability.weeklySchedule || []);
      setTimezone(availability.timezone || 'Europe/London');
    }
  }, [availability]);

  // Save availability
  const saveMutation = useMutation({
    mutationFn: async (data: { timezone: string; weeklySchedule: WeeklyScheduleSlot[] }) => {
      if (!user?.uid) throw new Error('User not authenticated');
      return await setTutorAvailability(user.uid, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability', user?.uid] });
      toast.success('Availability updated successfully');
    },
    onError: () => {
      toast.error('Failed to update availability');
    }
  });

  const toggleDay = (dayOfWeek: number) => {
    const existing = weeklySchedule.find(s => s.dayOfWeek === dayOfWeek);

    if (existing) {
      setWeeklySchedule(prev =>
        prev.map(s =>
          s.dayOfWeek === dayOfWeek
            ? { ...s, isActive: !s.isActive }
            : s
        )
      );
    } else {
      setWeeklySchedule(prev => [
        ...prev,
        {
          dayOfWeek,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true
        }
      ]);
    }
  };

  const updateSlotTime = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setWeeklySchedule(prev =>
      prev.map(s =>
        s.dayOfWeek === dayOfWeek
          ? { ...s, [field]: value }
          : s
      )
    );
  };

  const handleSave = () => {
    saveMutation.mutate({
      timezone,
      weeklySchedule: weeklySchedule.filter(s => s.isActive)
    });
  };

  if (isLoading) {
    return <div>Loading availability...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Availability</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS.map(day => {
            const slot = weeklySchedule.find(s => s.dayOfWeek === day.value);
            const isActive = slot?.isActive || false;

            return (
              <div key={day.value} className="flex items-center gap-4">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={() => toggleDay(day.value)}
                />
                <Label className="w-24">{day.label}</Label>

                {isActive && slot && (
                  <>
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) =>
                        updateSlotTime(day.value, 'startTime', e.target.value)
                      }
                      className="w-32"
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) =>
                        updateSlotTime(day.value, 'endTime', e.target.value)
                      }
                      className="w-32"
                    />
                  </>
                )}
              </div>
            );
          })}

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="mt-4"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
