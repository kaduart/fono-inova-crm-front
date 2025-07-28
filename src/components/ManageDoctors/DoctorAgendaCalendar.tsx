'use client';

import { addDays, format, formatISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { IPatient } from '../../utils/types/types';
import { Button } from '../ui/Button';
import { TimeMultiSelect } from './TimeMultiSelect';

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

interface DoctorAgendaCalendarProps {
  daySlots?: { date: string; slots: string[] }[];
  selectedDoctorId?: string;
  patients?: IPatient[];
  selectedDate?: dayjs.Dayjs | null;
  onDateChange: (date: dayjs.Dayjs) => void;
  onDaySelect: (date: string) => void;

  onSubmitSlotBooking?: (data: {
    time: string,
    isBookingModalOpen: boolean
  }) => void;
}


const DoctorAgendaCalendar = ({
  daySlots = [],
  selectedDoctorId,
  onDaySelect,
  selectedDate,
  patients = [],
  onDateChange,
  onSubmitSlotBooking,
}: DoctorAgendaCalendarProps) => {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<{ [key: string]: string[] }>({});

  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const isSelected = (date: Date) =>
    selectedDate && dayjs(date).isSame(selectedDate, 'day');

  const handleDayClick = (date: Date) => {
    if (!selectedDoctorId) return;

    const formatted = format(date, 'yyyy-MM-dd');
    onDateChange(dayjs(date));
    onDaySelect(formatted);         // dispara busca por horários
    // NÃO expande ainda — espera os dados chegarem via props
  };

  useEffect(() => {
    if (!selectedDate) return;
    const formatted = selectedDate.format('YYYY-MM-DD');

    if (!Array.isArray(daySlots) || typeof daySlots[0] !== 'object') {
      console.warn('Formato inválido de daySlots:', daySlots);
      return;
    }

    const slotData = daySlots.find((d) => d.date === formatted);
    if (slotData && slotData.slots.length > 0) {
      setExpandedDate(formatted);
    } else {
      setExpandedDate(null);
    }
  }, [daySlots, selectedDate]);


  const now = new Date();
  now.setHours(12, 0, 0, 0); // corrige problemas de timezone
  const weekStartOn = startOfWeek(now, { weekStartsOn: 1 });

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <Button variant="outline" onClick={handlePrevWeek}>
          ← Semana Anterior
        </Button>
        <p className="text-center font-medium">
          {format(weekStart, 'dd/MM/yyyy')} - {format(addDays(weekStart, 6), 'dd/MM/yyyy')}
        </p>
        <Button variant="outline" onClick={handleNextWeek}>
          Próxima Semana →
        </Button>
      </div>


      <div className="grid grid-cols-5 gap-6 justify-center">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => {
          const date = addDays(weekStart, index);
          const formattedDate = formatISO(date, { representation: 'date' });
          const slotsForThisDate = daySlots.find((d) => d.date === formattedDate)?.slots || [];
          const monthName = format(date, 'MMMM', { locale: ptBR });

          const dayLabel = format(date, 'EEE', { locale: ptBR });
          return (
            <div key={index} className="flex justify-center">
              <div className="col-span-1 flex justify-center ">
                <div
                  onClick={() => handleDayClick(date)}
                  className={`rounded-xl p-4 w-28 h-28  flex flex-col items-center justify-center cursor-pointer border shadow-md transition-all duration-200
                ${isSelected(date) ? 'bg-blue-50 border-blue-600' : 'bg-green-100 hover:bg-gray-50'}`}
                >
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 mb-0 capitalize">
                      {monthName}
                    </h2>
                    <p className="text-sm font-bold text-gray-800">{dayLabel}</p>
                    <p className="text-xs text-gray-500">{format(date, 'dd/MM')}</p>
                  </div>

                  <div className="text-sm text-center mt-2">
                    {isSelected(date) ? (
                      slotsForThisDate.length > 0 ? (
                        <p className="text-blue-700 font-semibold text-xs">{slotsForThisDate.length} horário(s)</p>
                      ) : (
                        <p className="text-gray-400 italic text-xs">Sem disponibilidade</p>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* ⬇️ EXPANSÃO ABAIXO DA GRADE COMPLETA */}
      {expandedDate && (
        <div className="mt-4 border rounded-lg p-4 bg-gray-50 shadow-inner">
          <h4 className="text-md font-semibold mb-2 text-gray-700">
            Horários disponíveis para {dayjs(expandedDate).format('DD/MM/YYYY')}
          </h4>
          <TimeMultiSelect
            availableTimes={daySlots.find((d) => d.date === expandedDate)?.slots || []}
            selectedDate={selectedDate?.toDate() || null}
            patients={patients}
            selectedDoctorId={selectedDoctorId}
            onChange={(times) =>
              setSelectedTimes((prev) => ({
                ...prev,
                [expandedDate]: times,
              }))
            }
            onSubmit={(data) => {
              if (onSubmitSlotBooking) {
                onSubmitSlotBooking(data);
              }
            }}
          />

        </div>
      )}

    </div>
  );
};

export default DoctorAgendaCalendar;
