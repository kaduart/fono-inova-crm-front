import { Check } from 'lucide-react';
import { useState } from 'react';
import { IPatient } from '../../utils/types/types';

interface TimeMultiSelectProps {
  selected?: string[];
  availableTimes?: string[];
  selectedDate?: Date | null;
  patients: IPatient[];
  selectedDoctorId?: string;
  onChange: (selected: string[]) => void;
  onSubmit: (data: { time: string, isBookingModalOpen: boolean }) => void;
}

export function TimeMultiSelect({
  selected = [],
  availableTimes,
  selectedDate,
  selectedDoctorId,
  onChange,
  onSubmit,
}: TimeMultiSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectAvailableTime = (time: string) => {
    if (!selectedDate) return;

    setIsModalOpen(true);
    onSubmit({ time, isBookingModalOpen: true });
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {availableTimes?.map((time) => {
        const isSelected = selected.includes(time);
        return (
          <button
            key={time}
            className={`
              relative overflow-hidden
              rounded-lg p-3
              border transition-all duration-200
              flex items-center justify-center
              ${isSelected 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
              }
            `}
            onClick={() => handleSelectAvailableTime(time)}
          >
            <span className="font-medium">{time}</span>
            
            {isSelected && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white p-1 rounded-bl-lg">
                <Check size={12} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}