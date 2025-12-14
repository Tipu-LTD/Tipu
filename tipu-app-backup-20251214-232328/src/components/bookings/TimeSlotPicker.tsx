import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAvailableSlots, TimeSlot } from '@/lib/api/availability';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';

interface TimeSlotPickerProps {
  tutorId: string;
  onSelect: (dateTime: Date) => void;
}

export default function TimeSlotPicker({ tutorId, onSelect }: TimeSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Fetch available slots for selected date
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['availability-slots', tutorId, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;

      const dateStr = selectedDate.toISOString().split('T')[0];
      return await getAvailableSlots(tutorId, dateStr);
    },
    enabled: !!selectedDate
  });

  const handleSlotClick = (slot: TimeSlot) => {
    if (!selectedDate) return;

    const [hours, minutes] = slot.startTime.split(':').map(Number);
    const dateTime = new Date(selectedDate);
    dateTime.setHours(hours, minutes, 0, 0);

    setSelectedSlot(slot.startTime);
    onSelect(dateTime);
  };

  const availableSlots = slotsData?.slots.filter(s => s.isAvailable) || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select Date</h3>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={(date) => {
            // Disable past dates
            return date < new Date(new Date().setHours(0, 0, 0, 0));
          }}
          className="rounded-md border"
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Available Time Slots</h3>
          {isLoading ? (
            <p>Loading slots...</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-slate-500">No slots available on this date</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <Button
                  key={slot.startTime}
                  variant={selectedSlot === slot.startTime ? 'default' : 'outline'}
                  onClick={() => handleSlotClick(slot)}
                  className="text-sm"
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
