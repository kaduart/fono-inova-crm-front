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
  onSubmit: (data: {
    time: string,
    isBookingModalOpen: boolean
  }) => void;
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
  // const [selectedTime, setSelectedTime] = useState<string>('');

  const handleSelectAvailableTime = (time: string) => {
    if (!selectedDate) return;

    setIsModalOpen(true);

    const data = {
      time: time,
      isBookingModalOpen: true
    }

    onSubmit(data);
  };
  return (
    <>
      <div className="grid grid-cols-6 gap-3">
        {availableTimes?.map((time) => {
          const isSelected = selected.includes(time);
          return (
            <button
              key={time}
              className="bg-green-500 hover:bg-green-200 rounded text-white px-3 py-2"
              onClick={() => handleSelectAvailableTime(time)}
            >
              <span>
                <b>
                  {time}
                </b>
              </span>
              {isSelected && <Check size={16} className="ml-2" />}
            </button>
          );
        })}
      </div>
    </>
  );
}
