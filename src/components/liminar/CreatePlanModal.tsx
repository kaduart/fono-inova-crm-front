import { Plus, Trash2, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '../../utils/toast';
import liminarContractService from '../../services/liminarContractService';
import doctorService from '../../services/doctorService';
import { Modal } from '../ui/Modal';
import { Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';

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

  async function handleSubmit() {
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

  const ghost = 'inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
  const iconBtn = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors duration-quick hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500';
  const total = entries.reduce((sum, e) => sum + (e.sessionValue || 0), 0);

  return (
    <Modal
      open
      onClose={() => !loading && onClose()}
      labelledBy="plan-modal-title"
      zIndexClass="z-[1300]"
      panelClassName="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
    >
      <ModalHeader
        icon={<FileText className="w-6 h-6" />}
        color="#059669"
        title={activePlan ? 'Nova versão do plano' : 'Criar plano terapêutico'}
        subtitle="Especialidades, valor por sessão e horários da semana"
        onClose={onClose}
        titleId="plan-modal-title"
      />

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        {activePlan && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            Esta versão foi criada a partir da versão anterior (v{activePlan.version}). As especialidades já vêm preenchidas; edite apenas o que deseja alterar.
          </p>
        )}

        {entries.map((entry, eIdx) => (
          <div key={eIdx} className="space-y-4 rounded-2xl border border-gray-200 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Terapia {eIdx + 1}</h3>
              {entries.length > 1 && (
                <button type="button" onClick={() => removeEntry(eIdx)} aria-label="Remover especialidade" className={iconBtn}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Especialidade" required>
                <select
                  value={entry.specialty}
                  onChange={(e) => {
                    updateEntry(eIdx, 'specialty', e.target.value);
                    updateEntry(eIdx, 'doctor', '');
                  }}
                  className={inputClass('emerald')}
                >
                  <option value="">Selecione</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value} disabled={usedSpecialties.includes(s.value) && entry.specialty !== s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profissional" required>
                <select value={entry.doctor} onChange={(e) => updateEntry(eIdx, 'doctor', e.target.value)} className={inputClass('emerald')}>
                  <option value="">{entry.specialty ? 'Selecione o profissional' : 'Escolha a especialidade primeiro'}</option>
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
              </Field>
              <Field label="Valor por sessão" required>
                <MoneyInput
                  value={entry.sessionValue > 0 ? entry.sessionValue.toFixed(2) : ''}
                  onChange={(v) => updateEntry(eIdx, 'sessionValue', parseFloat(v) || 0)}
                  accent="emerald"
                />
              </Field>
              <Field label="Duração (min)">
                <input
                  type="number"
                  value={entry.sessionDurationMinutes}
                  onChange={(e) => updateEntry(eIdx, 'sessionDurationMinutes', Number(e.target.value))}
                  min="15"
                  max="180"
                  className={inputClass('emerald')}
                />
              </Field>
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold text-gray-600">Horários semanais <span className="text-red-500">*</span></span>
              <div className="space-y-2">
                {entry.slots.map((slot, sIdx) => (
                  <div key={sIdx} className="grid grid-cols-[1fr_7.5rem_auto] items-center gap-2">
                    <select
                      value={slot.dayOfWeek}
                      onChange={(e) => updateSlot(eIdx, sIdx, 'dayOfWeek', e.target.value)}
                      aria-label="Dia da semana"
                      className={inputClass('emerald')}
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
                      aria-label="Horário"
                      className={inputClass('emerald')}
                    />
                    {entry.slots.length > 1 ? (
                      <button type="button" onClick={() => removeSlot(eIdx, sIdx)} aria-label="Remover horário" className={iconBtn}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : <span className="w-11" />}
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => addSlot(eIdx)} className={`${ghost} mt-1`}>
                <Plus className="w-4 h-4" /> Adicionar horário
              </button>
            </div>

            <Field label="Observações desta especialidade">
              <textarea
                value={entry.notes}
                onChange={(e) => updateEntry(eIdx, 'notes', e.target.value)}
                rows={2}
                className={`${inputClass('emerald')} resize-none`}
                placeholder="Ex.: orientação parental, atendida pela responsável"
              />
            </Field>
          </div>
        ))}

        {entries.length < SPECIALTIES.length && (
          <button
            type="button"
            onClick={addEntry}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Plus className="w-4 h-4" /> Adicionar especialidade
          </button>
        )}

        <Field label="Observações gerais do plano">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${inputClass('emerald')} resize-none`}
            placeholder="Anotações sobre o plano"
          />
        </Field>
      </div>

      <ModalFooter
        accent="emerald"
        onCancel={onClose}
        onSubmit={handleSubmit}
        submitting={loading}
        submitDisabled={!isValid()}
        submitLabel={activePlan ? 'Salvar nova versão' : 'Criar plano'}
        submittingLabel="Salvando..."
        summary={`${entries.length} ${entries.length === 1 ? 'terapia' : 'terapias'}${total > 0 ? ` · ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por semana de sessões` : ''}`}
      />
    </Modal>
  );
}
