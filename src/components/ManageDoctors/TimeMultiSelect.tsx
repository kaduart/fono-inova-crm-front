import { Check, Calendar, X } from 'lucide-react';
import { useState } from 'react';
import { IPatient } from '../../utils/types/types';
import { SlotAvailability } from '../../services/appointmentService';

interface TimeMultiSelectProps {
  selected?: string[];
  availableTimes?: (string | SlotAvailability)[];
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
  patients,
  onChange,
  onSubmit,
}: TimeMultiSelectProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectAvailableTime = (time: string) => {
    if (!selectedDate || !selectedDoctorId) return;

    const date = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const selectedDoctor = patients.find((d) => d._id === selectedDoctorId);

    onSubmit({
      time,
      date,
      doctorId: selectedDoctorId,
      specialty: selectedDoctor?.specialty || 'fonoaudiologia',
      isBookingModalOpen: true,
    });
  };


  // 🆕 Helper para extrair time do slot (suporta formato antigo e novo)
  const getSlotTime = (slot: string | SlotAvailability): string => {
    return typeof slot === 'string' ? slot : slot.time;
  };

  const isSlotAvailable = (slot: string | SlotAvailability): boolean => {
    return typeof slot === 'string' ? true : slot.available;
  };

  const getSlotLabel = (slot: string | SlotAvailability): string | undefined => {
    return typeof slot === 'string' ? undefined : slot.label;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {availableTimes?.map((slot) => {
        const time = getSlotTime(slot);
        const isAvailable = isSlotAvailable(slot);
        const label = getSlotLabel(slot);
        const isSelected = selected.includes(time);

        // Slot indisponível (feriado, ocupado, etc)
        if (!isAvailable) {
          return (
            <div
              key={time}
              className="relative overflow-hidden rounded-lg p-3 border border-gray-100 bg-gray-50 text-gray-400 flex flex-col items-center justify-center cursor-not-allowed"
              title={label}
            >
              <span className="font-medium line-through">{time}</span>
              {label && (
                <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Calendar size={10} />
                  {label}
                </span>
              )}
              <div className="absolute top-1 right-1">
                <X size={12} className="text-gray-300" />
              </div>
            </div>
          );
        }

        // Slot disponível
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