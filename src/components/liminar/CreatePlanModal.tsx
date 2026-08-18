import { Plus, Trash2, X, Clock, DollarSign, Calendar, FileText, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import liminarContractService from '../../services/liminarContractService';
import doctorService from '../../services/doctorService';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';

import { SPECIALTY_OPTIONS } from '../../constants/specialties';
import { TherapeuticPlan } from '../../services/liminarContractService';

// Lista completa e canônica de especialidades do sistema (mesma fonte usada em
// Package/Appointment) — antes esta tela tinha uma lista própria, menor e
// desatualizada, que travava a edição do plano de liminar só nas especialidades
// já geradas originalmente (achado 2026-08-18).
const SPECIALTIES = SPECIALTY_OPTIONS;

const WEEKDAYS = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
];

interface TherapyEntry {
  specialty: string;
  doctor: string;
  sessionValue: number;
  sessionDurationMinutes: number;
  slots: Array<{ dayOfWeek: number | ''; time: string }>;
  notes: string;
}

function emptyEntry(): TherapyEntry {
  return { specialty: '', doctor: '', sessionValue: 0, sessionDurationMinutes: 40, slots: [{ dayOfWeek: '', time: '' }], notes: '' };
}

// "Nova versão" deve clonar o plano vigente, não nascer em branco — reconstruir
// especialidades já existentes manualmente é operação de risco (perda silenciosa
// de terapia esquecida). Ver memória de projeto: therapeuticplan_new_version_ux_flaw.
function entriesFromPlan(plan?: TherapeuticPlan | null): TherapyEntry[] {
  if (!plan?.therapies || Object.keys(plan.therapies).length === 0) return [emptyEntry()];
  return Object.entries(plan.therapies).map(([specialty, config]) => ({
    specialty,
    doctor: (config.doctor as any)?._id ?? config.doctor ?? '',
    sessionValue: config.sessionValue ?? 0,
    sessionDurationMinutes: config.sessionDurationMinutes ?? 40,
    slots: config.slots?.length ? config.slots.map((s) => ({ dayOfWeek: s.dayOfWeek, time: s.time })) : [{ dayOfWeek: '', time: '' }],
    notes: config.notes ?? '',
  }));
}

interface Props {
  contractId: string;
  activePlan?: TherapeuticPlan | null;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePlanModal({ contractId, activePlan, onClose, onCreated }: Props) {
  const [entries, setEntries] = useState<TherapyEntry[]>(() => entriesFromPlan(activePlan));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Array<{ _id: string; fullName: string; specialty?: string; specialties?: string[] }>>([]);

  useEffect(() => {
    doctorService.getActiveDoctors().then((res: any) => {
      setDoctors(res?.data ?? []);
    }).catch(() => {});
  }, []);

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
        e.doctor &&
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
        doctor: entry.doctor || undefined,
        sessionValue: entry.sessionValue,
        sessionDurationMinutes: entry.sessionDurationMinutes,
        slots: entry.slots.map((s) => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
        notes: entry.notes || null,
      };
    }

    try {
      await liminarContractService.createPlan(contractId, { therapies, notes: notes || undefined });
      toast.success(activePlan ? 'Nova versão do plano criada!' : 'Plano terapêutico criado!');
      onCreated();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao criar plano');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
        {/* Header premium */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activePlan ? `Nova versão do plano` : 'Criar Plano Terapêutico'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
            {activePlan && (
              <p className="text-xs px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                Esta versão foi criada a partir da versão anterior (v{activePlan.version}) — as especialidades já vêm preenchidas abaixo. Edite apenas o que deseja alterar.
              </p>
            )}
            {entries.map((entry, eIdx) => (
              <div
                key={eIdx}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <div className="w-5 h-5 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <span className="text-emerald-600 text-xs font-bold">{eIdx + 1}</span>
                    </div>
                    Especialidade
                  </h3>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(eIdx)}
                      className="text-rose-400 hover:text-rose-600 p-1 rounded-full hover:bg-rose-50 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      Especialidade *
                    </label>
                    <select
                      value={entry.specialty}
                      onChange={(e) => {
                        updateEntry(eIdx, 'specialty', e.target.value);
                        updateEntry(eIdx, 'doctor', '');
                      }}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <UserCheck size={12} /> Profissional *
                    </label>
                    <select
                      value={entry.doctor}
                      onChange={(e) => updateEntry(eIdx, 'doctor', e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
                      required
                    >
                      <option value="">
                        {entry.specialty ? 'Selecione o profissional' : 'Selecione a especialidade primeiro'}
                      </option>
                      {doctors
                        .filter((d) => {
                          if (!entry.specialty) return true;
                          const target = entry.specialty.toLowerCase();
                          const allowed = [d.specialty, ...(d.specialties || [])].map((s) => (s || '').toLowerCase());
                          return allowed.includes(target);
                        })
                        .map((d) => (
                          <option key={d._id} value={d._id}>{d.fullName}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <DollarSign size={12} /> Valor por sessão (R$) *
                    </label>
                    <InputCurrency
                      value={entry.sessionValue}
                      onChange={(e) => updateEntry(eIdx, 'sessionValue', Number(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Clock size={12} /> Duração (min)
                    </label>
                    <input
                      type="number"
                      value={entry.sessionDurationMinutes}
                      onChange={(e) => updateEntry(eIdx, 'sessionDurationMinutes', Number(e.target.value))}
                      min="15"
                      max="180"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Calendar size={12} /> Horários semanais *
                  </p>
                  <div className="space-y-2">
                    {entry.slots.map((slot, sIdx) => (
                      <div key={sIdx} className="flex gap-2 items-center">
                        <select
                          value={slot.dayOfWeek}
                          onChange={(e) => updateSlot(eIdx, sIdx, 'dayOfWeek', e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
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
                          className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
                          required
                        />
                        {entry.slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(eIdx, sIdx)}
                            className="text-rose-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => addSlot(eIdx)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar horário
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <FileText size={12} /> Observações desta especialidade (opcional)
                  </label>
                  <textarea
                    value={entry.notes}
                    onChange={(e) => updateEntry(eIdx, 'notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
                    placeholder="Ex: orientação parental, atendida pela responsável..."
                  />
                </div>
              </div>
            ))}

            {entries.length < SPECIALTIES.length && (
              <button
                type="button"
                onClick={addEntry}
                className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-600 hover:bg-emerald-50 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> Adicionar especialidade
              </button>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                <FileText size={12} /> Observações gerais do plano (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-400 transition-all"
                placeholder="Anotações sobre o plano..."
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 pt-4 border-t border-slate-200 bg-white flex-shrink-0">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium"
            >
              Cancelar
            </Button>
            <button
              type="submit"
              disabled={!isValid() || loading}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all ${
                isValid() && !loading
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="small" color="border-white" />
                  Salvando...
                </span>
              ) : (
                activePlan ? 'Salvar nova versão' : 'Criar Plano'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}