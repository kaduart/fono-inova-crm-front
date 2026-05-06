import { Check, Calendar, AlertTriangle, Lock } from 'lucide-react';
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
  onSubmit: (data: {
    time: string;
    date: string;
    doctorId: string;
    specialty: string;
    isBookingModalOpen: boolean;
    shadow?: {
      patientId: string;
      patientName: string;
      occurrences: number;
      lastDates: string[];
      confidence: number;
    };
  }) => void;
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

  const handleSelectAvailableTime = (time: string, shadow?: SlotAvailability['shadow']) => {
    if (!selectedDate || !selectedDoctorId) return;

    const date = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

    const selectedDoctor = patients.find((d) => d._id === selectedDoctorId);

    onSubmit({
      time,
      date,
      doctorId: selectedDoctorId,
      specialty: selectedDoctor?.specialty || 'fonoaudiologia',
      isBookingModalOpen: true,
      ...(shadow ? { shadow } : {}),
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

  const getSlotReason = (slot: string | SlotAvailability): string | undefined => {
    return typeof slot === 'string' ? undefined : slot.reason;
  };

  const getSlotShadow = (slot: string | SlotAvailability): SlotAvailability['shadow'] | undefined => {
    return typeof slot === 'string' ? undefined : slot.shadow;
  };

  const isSlotShadow = (slot: string | SlotAvailability): boolean => {
    return typeof slot === 'string' ? false : !!slot.signals?.isShadow;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {availableTimes?.map((slot) => {
        const time = getSlotTime(slot);
        const isAvailable = isSlotAvailable(slot);
        const label = getSlotLabel(slot);
        const reason = getSlotReason(slot);
        const shadow = getSlotShadow(slot);
        const hasShadow = isSlotShadow(slot);
        const isSelected = selected.includes(time);

        // Slot indisponível — shadow lock (reservado)
        if (!isAvailable && reason === 'shadow_lock') {
          return (
            <div
              key={time}
              className="relative overflow-hidden rounded-lg p-3 border border-blue-100 bg-blue-50 text-blue-500 flex flex-col items-center justify-center cursor-not-allowed"
              title={label}
            >
              <span className="font-medium line-through">{time}</span>
              {label && (
                <span className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  <Lock size={10} />
                  {label}
                </span>
              )}
              <div className="absolute top-1 right-1">
                <Lock size={12} className="text-blue-300" />
              </div>
            </div>
          );
        }

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
                <XIcon size={12} className="text-gray-300" />
              </div>
            </div>
          );
        }

        // Slot disponível com shadow (recorrência detectada)
        if (hasShadow && shadow) {
          return (
            <button
              key={time}
              className={`
                relative overflow-hidden
                rounded-lg p-3
                border-2 transition-all duration-200
                flex flex-col items-center justify-center
                ${isSelected
                  ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-500 hover:bg-amber-100'
                }
              `}
              onClick={() => handleSelectAvailableTime(time, shadow)}
              title={`Paciente recorrente: ${shadow.patientName} (${shadow.occurrences}x neste horário)`}
            >
              <span className="font-medium">{time}</span>
              <span className="text-[10px] font-semibold text-amber-700 mt-0.5 flex items-center gap-1">
                <AlertTriangle size={10} />
                {shadow.patientName}
              </span>

              {isSelected && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white p-1 rounded-bl-lg">
                  <Check size={12} />
                </div>
              )}
            </button>
          );
        }

        // Slot disponível normal
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

// Icone X local para evitar import conflito com lucide-react X (já usado no calendar)
function XIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
