import { useEffect, useState } from 'react';
import { weeklyAvailabilityService, WeeklyDay } from '../services/weeklyAvailabilityService';
import { Calendar, ChevronLeft, ChevronRight, Clock, UserX } from 'lucide-react';
import dayjs from 'dayjs';

interface Props {
  specialty: string;
}

export default function WeeklyAvailabilityCalendar({ specialty }: Props) {
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week').add(1, 'day')); // Segunda
  const [data, setData] = useState<WeeklyDay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await weeklyAvailabilityService.fetch({
          startDate: weekStart.format('YYYY-MM-DD'),
          specialty,
          days: 5, // seg a sex
        });
        setData(res.availability || []);
      } catch (err) {
        console.error('Erro ao buscar disponibilidade:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [weekStart, specialty]);

  const handlePrev = () => setWeekStart(weekStart.subtract(7, 'day'));
  const handleNext = () => setWeekStart(weekStart.add(7, 'day'));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrev} className="p-2 rounded hover:bg-gray-100">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold">
          Disponibilidade — {weekStart.format('DD/MM')} a {weekStart.add(4, 'day').format('DD/MM')}
        </h2>
        <button onClick={handleNext} className="p-2 rounded hover:bg-gray-100">
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.map((day) => (
            <div
              key={day.date}
              className="bg-gray-900 rounded-xl p-4 border border-gray-800"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {day.dayLabel}
                </span>
                <span className="text-gray-400 text-sm">
                  {dayjs(day.date).format('DD/MM')}
                </span>
              </div>

              {day.professionals.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <UserX className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {day.message || 'Nenhum horário disponível para este dia'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {day.professionals.map((prof) => {
                    const availableCount = prof.slots.filter(s => s.available).length;
                    return (
                      <div key={prof.professionalId} className="border-b border-gray-800 last:border-0 pb-2 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{prof.professionalName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            availableCount > 0 
                              ? 'bg-emerald-900 text-emerald-400' 
                              : 'bg-red-900 text-red-400'
                          }`}>
                            {availableCount} vaga{availableCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prof.slots.filter(s => s.available).map(slot => (
                            <span
                              key={slot.time}
                              className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded"
                            >
                              {slot.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
