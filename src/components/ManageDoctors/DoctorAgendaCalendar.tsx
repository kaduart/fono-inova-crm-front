'use client';

import { addDays, format, formatISO, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeftIcon, ChevronRightIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IPatient } from '../../utils/types/types';
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
    <div className="mt-6 space-y-6">
      {/* Header com navegação entre semanas */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={handlePrevWeek}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-50"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Semana anterior</span>
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-gray-500">Semana de</p>
          <p className="text-lg font-semibold text-gray-800">
            {format(weekStart, 'dd MMM')} - {format(addDays(weekStart, 6), 'dd MMM yyyy')}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-gray-50"
        >
          <span>Próxima semana</span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => {
          const date = addDays(weekStart, index);
          const formattedDate = formatISO(date, { representation: 'date' });
          const slotsForThisDate = daySlots.find((d) => d.date === formattedDate)?.slots || [];
          const dayOfWeek = format(date, 'EEE', { locale: ptBR });
          const dayNumber = format(date, 'd');
          const isToday = isSameDay(date, new Date());

          return (
            <div
              key={index}
              onClick={() => handleDayClick(date)}
              className={`
              flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all
              ${isSelected(date)
                  ? 'bg-blue-50 border-blue-300 shadow-md'
                  : 'border-transparent hover:bg-gray-50'
                }
              ${isToday ? 'ring-2 ring-blue-200' : ''}
            `}
            >
              <span className={`text-sm font-medium ${isToday
                ? 'text-blue-600'
                : isSelected(date)
                  ? 'text-gray-800'
                  : 'text-gray-500'
                }`}>
                {dayOfWeek}
              </span>
              <span className={`
              mt-1 text-lg font-semibold 
              ${isToday
                  ? 'text-white bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center'
                  : isSelected(date)
                    ? 'text-gray-900'
                    : 'text-gray-700'
                }`}
              >
                {dayNumber}
              </span>

              {slotsForThisDate.length > 0 && (
                <span className={`
                mt-2 text-xs px-2 py-1 rounded-full 
                ${isSelected(date)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                  }
              `}>
                  {slotsForThisDate.length} horário{slotsForThisDate.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Painel expansível de horários */}
      {expandedDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800">
                Horários para {format(expandedDate, 'EEEE, d MMMM', { locale: ptBR })}
              </h4>
              <button
                onClick={() => setExpandedDate(null)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <XIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Adicione esta verificação */}
            {daySlots.find((d) => d.date === expandedDate)?.slots?.length ? (
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
            ) : (
              <EmptyAgendaMessage />
            )}
          </div>
        </motion.div>
      )}

      {/* Adicione esta verificação para quando não há slots na semana */}
      {daySlots.length === 0 && !expandedDate && (
        <EmptyAgendaMessage />
      )}
    </div>
  );

};
const EmptyAgendaMessage = () => (
  <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 text-center">
    <Calendar className="mx-auto h-10 w-10 text-gray-400" />
    <h3 className="mt-3 text-lg font-medium text-gray-900">Nenhuma disponibilidade</h3>
    <p className="mt-1 text-gray-500">
      Não há horários disponíveis para agendamento nesta data
    </p>
  </div>
);

export default DoctorAgendaCalendar;
