import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import liminarContractService from '../../services/liminarContractService';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const SPECIALTIES = [
  { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
  { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
  { value: 'psicologia', label: 'Psicologia' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'psicomotricidade', label: 'Psicomotricidade' },
  { value: 'musicoterapia', label: 'Musicoterapia' },
  { value: 'psicopedagogia', label: 'Psicopedagogia' },
  { value: 'neuropediatria', label: 'Neuropediatria' },
];

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
];

interface TherapyEntry {
  specialty: string;
  sessionValue: number;
  sessionDurationMinutes: number;
  slots: Array<{ dayOfWeek: number | ''; time: string }>;
}

function emptyEntry(): TherapyEntry {
  return { specialty: '', sessionValue: 0, sessionDurationMinutes: 50, slots: [{ dayOfWeek: '', time: '' }] };
}

interface Props {
  contractId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePlanModal({ contractId, onClose, onCreated }: Props) {
  const [entries, setEntries] = useState<TherapyEntry[]>([emptyEntry()]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const usedSpecialties = entries.map((e) => e.specialty).filter(Boolean);

  function updateEntry(idx: number, field: keyof TherapyEntry, value: any) {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  function addSlot(entryIdx: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIdx ? { ...e, slots: [...e.slots, { dayOfWeek: '', time: '' }] } : e
      )
    );
  }

  function removeSlot(entryIdx: number, slotIdx: number) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === entryIdx ? { ...e, slots: e.slots.filter((_, si) => si !== slotIdx) } : e
      )
    );
  }

  function updateSlot(entryIdx: number, slotIdx: number, field: 'dayOfWeek' | 'time', value: any) {
    setEntries((prev) =>
      prev.map((e, i) =>
        i !== entryIdx
          ? e
          : {
              ...e,
              slots: e.slots.map((s, si) => (si === slotIdx ? { ...s, [field]: value } : s)),
            }
      )
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, emptyEntry()]);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function isValid() {
    return entries.every(
      (e) =>
        e.specialty &&
        e.sessionValue > 0 &&
        e.slots.length > 0 &&
        e.slots.every((s) => s.dayOfWeek !== '' && s.time)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid()) return;
    setLoading(true);

    const therapies: Record<string, any> = {};
    for (const entry of entries) {
      therapies[entry.specialty] = {
        sessionValue: entry.sessionValue,
        sessionDurationMinutes: entry.sessionDurationMinutes,
        slots: entry.slots.map((s) => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
      };
    }

    try {
      await liminarContractService.createPlan(contractId, { therapies, notes: notes || undefined });
      toast.success('Plano terapêutico criado!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-5 text-white rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold">Criar Plano Terapêutico</h2>
          <button onClick={onClose} className="hover:text-emerald-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {entries.map((entry, eIdx) => (
              <div key={eIdx} className="border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">
                    Especialidade {eIdx + 1}
                  </h3>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(eIdx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Especialidade *
                    </label>
                    <select
                      value={entry.specialty}
                      onChange={(e) => updateEntry(eIdx, 'specialty', e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Selecione</option>
                      {SPECIALTIES.map((s) => (
                        <option
                          key={s.value}
                          value={s.value}
                          disabled={usedSpecialties.includes(s.value) && entry.specialty !== s.value}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Valor por sessão (R$) *
                    </label>
                    <InputCurrency
                      value={entry.sessionValue}
                      onChange={(e) => updateEntry(eIdx, 'sessionValue', Number(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Duração (min)
                    </label>
                    <input
                      type="number"
                      value={entry.sessionDurationMinutes}
                      onChange={(e) => updateEntry(eIdx, 'sessionDurationMinutes', Number(e.target.value))}
                      min="15"
                      max="180"
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">Horários semanais *</p>
                  {entry.slots.map((slot, sIdx) => (
                    <div key={sIdx} className="flex gap-2 items-center">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => updateSlot(eIdx, sIdx, 'dayOfWeek', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                        required
                      >
                        <option value="">Dia</option>
                        {WEEKDAYS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateSlot(eIdx, sIdx, 'time', e.target.value)}
                        className="w-32 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                      {entry.slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(eIdx, sIdx)}
                          className="text-red-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSlot(eIdx)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 flex items-center gap-1 mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar horário
                  </button>
                </div>
              </div>
            ))}

            {entries.length < SPECIALTIES.length && (
              <button
                type="button"
                onClick={addEntry}
                className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar especialidade
              </button>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="Anotações sobre o plano..."
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 flex-shrink-0">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={!isValid() || loading}
              className={`flex-1 py-2.5 rounded-xl font-medium text-white transition-all ${
                isValid() && !loading
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="small" color="border-white" />
                  Salvando...
                </span>
              ) : (
                'Criar Plano'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
