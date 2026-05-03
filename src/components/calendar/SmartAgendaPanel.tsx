import { useEffect, useState } from 'react';
import { Lightbulb, Calendar, Clock, User, Star, ChevronRight, Loader2 } from 'lucide-react';
import { getAgendaSuggestions, SuggestedSlot } from '../../services/agendaService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SmartAgendaPanelProps {
  patientId?: string;
  doctorId?: string;
  specialty?: string;
  serviceType?: string;
  onScheduleSlot: (slot: SuggestedSlot) => Promise<void>;
  visible: boolean;
}

export default function SmartAgendaPanel({
  patientId,
  doctorId,
  specialty,
  serviceType,
  onScheduleSlot,
  visible
}: SmartAgendaPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || (!doctorId && !specialty)) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const slots = await getAgendaSuggestions({
          doctorId,
          specialty,
          patientId,
          serviceType,
          maxResults: 5
        });
        setSuggestions(slots);
      } catch (err: any) {
        console.error('[SmartAgenda] Erro ao buscar sugestões:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [visible, doctorId, specialty, patientId, serviceType]);

  if (!visible) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-emerald-400';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-gray-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Ideal';
    if (score >= 75) return 'Ótimo';
    if (score >= 60) return 'Bom';
    return 'Alternativo';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-indigo-600" />
        <h3 className="text-sm font-bold text-indigo-900">
          💡 Horários Sugeridos
        </h3>
        {loading && (
          <span className="text-xs text-indigo-400 animate-pulse">analisando...</span>
        )}
      </div>

      {loading && suggestions.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <p className="text-xs text-indigo-500 text-center py-2">
          Nenhuma sugestão encontrada para os filtros atuais.
        </p>
      )}

      <div className="space-y-2">
        {suggestions.map((slot, index) => {
          const isScheduling = schedulingId === `${slot.date}_${slot.time}_${slot.doctorId}`;
          return (
            <button
              key={`${slot.date}_${slot.time}_${slot.doctorId}_${index}`}
              disabled={isScheduling}
              onClick={async () => {
                const slotId = `${slot.date}_${slot.time}_${slot.doctorId}`;
                console.log('[SmartAgendaPanel] Card clicado:', slotId, slot);
                setSchedulingId(slotId);
                try {
                  await onScheduleSlot(slot);
                  console.log('[SmartAgendaPanel] onScheduleSlot resolveu com sucesso');
                } catch (err: any) {
                  console.error('[SmartAgendaPanel] onScheduleSlot rejeitou:', err);
                  throw err;
                } finally {
                  setSchedulingId(null);
                }
              }}
              className="w-full text-left bg-white hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 rounded-lg p-3 transition-all duration-200 group disabled:opacity-60"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`${getScoreColor(slot.score)} text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[48px] text-center`}>
                    {isScheduling ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : getScoreLabel(slot.score)}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-800">
                        {format(parseISO(slot.date), 'EEE, dd/MM', { locale: ptBR })}
                      </span>
                      <Clock className="w-3.5 h-3.5 text-gray-500 ml-1" />
                      <span className="text-sm font-semibold text-gray-800">{slot.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{slot.doctorName}</span>
                      {slot.isPreferredDoctor && (
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                      {slot.isPreferredTime && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">horário habitual</span>
                      )}
                    </div>
                  </div>
                </div>

                {isScheduling ? (
                  <span className="text-[10px] text-indigo-500 font-medium">agendando...</span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                )}
              </div>

              <p className="text-[11px] text-indigo-500 mt-1 ml-[60px]">
                {slot.reason}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
