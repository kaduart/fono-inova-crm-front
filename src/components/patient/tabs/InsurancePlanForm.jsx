import React, { useEffect, useState } from 'react';
import { Save, X, Calendar, Plus, Trash2, Clock, User, DollarSign, CalendarDays, AlertTriangle, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import API from '../../../services/api';
import { toast } from '../../../utils/toast';
import { ModalShell, Spinner } from '../../ui/TailwindParts';

import { SPECIALTY_VALUES } from '../../../constants/specialties';

const VALID_SPECIALTIES = SPECIALTY_VALUES;

const DAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' }
];

/**
 * Modal para criar plano de atendimento de convênio
 * Gera appointments + payments pendentes automaticamente
 */
const InsurancePlanForm = ({ open, onClose, guide, plan, patientId, patientName }) => {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPlan, setExistingPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [form, setForm] = useState({
    doctorId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    slots: [{ dayOfWeek: 1, time: '14:00' }],
    sessionValue: 0,
    notes: ''
  });

  // Dados do plano existente podem vir por prop (modo replace via Editar)
  // ou serem carregados via API (modo replace via "Ver sessões" ou fallback)
  const activePlan = plan || existingPlan;
  const mode = activePlan ? 'replace' : 'create';

  useEffect(() => {
    if (open && guide) {
      const base = activePlan || guide;
      setForm(prev => ({
        ...prev,
        slots: activePlan?.slots?.length
          ? activePlan.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time }))
          : [{ dayOfWeek: 1, time: '14:00' }],
        // O plano (InsurancePlan) não armazena sessionValue; a referência é a guia.
        sessionValue: activePlan?.sessionValue ?? guide.sessionValue ?? prev.sessionValue,
        doctorId: activePlan?.doctor?._id || base.doctor?._id || base.doctorId || prev.doctorId,
        startDate: activePlan?.startDate
          ? format(parseISO(activePlan.startDate), 'yyyy-MM-dd')
          : prev.startDate,
        notes: activePlan?.notes ?? prev.notes
      }));
    }
  }, [open, guide, activePlan]);

  useEffect(() => {
    if (!open) return;
    setLoadingDoctors(true);
    API.get('/doctors?status=active')
      .then(res => {
        const docs = res.data?.data?.doctors || res.data?.data || res.data || [];
        setDoctors(Array.isArray(docs) ? docs : []);
      })
      .catch(() => toast.error('Erro ao carregar profissionais'))
      .finally(() => setLoadingDoctors(false));
  }, [open]);

  // Verifica se já existe plano para esta guia
  useEffect(() => {
    if (!open || !guide?._id) {
      setExistingPlan(null);
      return;
    }
    // Se o plano já veio como prop (modo replace), usa-o diretamente
    if (plan) {
      setExistingPlan(plan);
      return;
    }
    setLoadingPlan(true);
    API.get(`/v2/insurance-plans/guide/${guide._id}`)
      .then(res => {
        if (res.data?.data) {
          setExistingPlan(res.data.data);
        } else {
          setExistingPlan(null);
        }
      })
      .catch(() => setExistingPlan(null))
      .finally(() => setLoadingPlan(false));
  }, [open, guide?._id, plan]);

  const handleSlotChange = (idx, field, value) => {
    setForm(prev => {
      const newSlots = [...prev.slots];
      newSlots[idx] = { ...newSlots[idx], [field]: value };
      return { ...prev, slots: newSlots };
    });
  };

  const addSlot = () => {
    if (form.slots.length >= 5) return;
    setForm(prev => ({
      ...prev,
      slots: [...prev.slots, { dayOfWeek: 1, time: '14:00' }]
    }));
  };

  const removeSlot = (idx) => {
    setForm(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== idx)
    }));
  };

  // Ordem do array = prioridade de geração no backend (generateInsurancePlanSessions
  // preenche o orçamento de sessões restantes na ordem de plan.slots, semana a semana).
  // Arrastar as linhas deixa essa prioridade explícita e sob controle do usuário.
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const moveSlot = (fromIdx, toIdx) => {
    setForm(prev => {
      const newSlots = [...prev.slots];
      const [moved] = newSlots.splice(fromIdx, 1);
      newSlots.splice(toIdx, 0, moved);
      return { ...prev, slots: newSlots };
    });
  };

  const handleDragStart = (idx) => (e) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  };

  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      moveSlot(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [replanPreview, setReplanPreview] = useState(null); // null enquanto não carregou / não se aplica
  const [loadingPreview, setLoadingPreview] = useState(false);

  const slotSignature = (arr) => (arr || [])
    .map(s => `${Number(s.dayOfWeek)}-${s.time}`)
    .slice()
    .sort()
    .join('|');

  const handleSubmit = async () => {
    if (!guide?._id) {
      toast.error('Guia não identificada. Recarregue a página e tente novamente.');
      return;
    }
    if (!form.doctorId) {
      toast.error('Selecione um profissional responsável pelo atendimento.');
      return;
    }
    if (form.slots.some(s => !s.dayOfWeek || !s.time)) {
      toast.error('Preencha todos os dias da semana e horários dos atendimentos.');
      return;
    }

    const isReplace = Boolean(existingPlan);

    if (isReplace && (existingPlan.generatedAppointments?.length || 0) > 0) {
      const slotsChanged = slotSignature(existingPlan.slots) !== slotSignature(form.slots);
      setReplanPreview(null);
      setConfirmReplaceOpen(true);

      if (slotsChanged) {
        setLoadingPreview(true);
        try {
          const res = await API.post(`/v2/insurance-plans/${existingPlan._id}/replan-preview`, {
            slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time }))
          });
          setReplanPreview(res.data?.data || null);
        } catch {
          // Preview é só informativo — se falhar, o modal cai no texto genérico e o
          // usuário ainda consegue confirmar; a validação real acontece no PATCH.
          setReplanPreview(null);
        } finally {
          setLoadingPreview(false);
        }
      }
      return;
    }

    performSave();
  };

  const performSave = async () => {
    setConfirmReplaceOpen(false);
    const isReplace = Boolean(existingPlan);

    setSaving(true);
    try {
      let response;

      if (isReplace) {
        // PATCH parcial: só atualiza campos editáveis do plano e sincroniza futuros
        const payload = {
          doctorId: form.doctorId,
          sessionValue: Number(form.sessionValue) || 0,
          slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
          notes: form.notes,
          startDate: form.startDate
        };
        response = await API.patch(`/v2/insurance-plans/${existingPlan._id}`, payload);
        const updated = response?.data?.data?.appointmentsUpdated || 0;
        const canceled = response?.data?.data?.appointmentsCanceled || 0;
        toast.success(`Plano atualizado! ${updated} sessão(ões) ajustada(s)${canceled > 0 ? `, ${canceled} cancelada(s)` : ''}.`);
      } else {
        if (!form.startDate) {
          toast.error('Informe a data de início do plano de atendimento.');
          setSaving(false);
          return;
        }
        const payload = {
          guideId: guide._id,
          doctorId: form.doctorId,
          specialty: guide.specialty,
          sessionsPerWeek: form.slots.length,
          startDate: form.startDate,
          slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
          sessionValue: Number(form.sessionValue) || 0,
          notes: form.notes
        };
        // Criar só grava a configuração do plano — não toca na agenda. Gerar os
        // agendamentos de verdade é um passo separado e explícito (botão "Gerar
        // sessões" no card da guia, mesmo padrão de Pacotes/Liminar), pra quem está
        // criando decidir quando a agenda real é mexida em vez de isso acontecer
        // escondido dentro do "Criar plano".
        response = await API.post('/v2/insurance-plans', payload);
        toast.success('Plano criado! Clique em "Gerar sessões" no card da guia para agendar os atendimentos.', { duration: 7000 });
      }

      onClose(true);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';

      if (status === 400) {
        if (message.includes('sessões restantes')) {
          toast.error(`Não é possível criar o plano: ${message}`);
        } else if (message.includes('não encontrad')) {
          toast.error(`Dados inválidos: ${message}. Verifique as informações e tente novamente.`);
        } else {
          toast.error(`Erro de validação: ${message}`);
        }
      } else if (status === 409) {
        // Texto corrido escondia exatamente a parte que importa pra decidir o que
        // fazer (com quem é o conflito, de qual guia, quando) — negrito nos dados,
        // não na frase inteira.
        const conflict = err?.response?.data?.conflict;
        const errorCode = err?.response?.data?.errorCode;
        if (conflict?.withWhom) {
          toast.error(
            <span>
              Conflito de agenda com <strong>{conflict.withWhom}</strong>
              {conflict.guideNumber ? <> (guia <strong>{conflict.guideNumber}</strong>)</> : null} em{' '}
              <strong>{conflict.date}</strong> às <strong>{conflict.time}</strong>. Escolha outro horário.
            </span>,
            { duration: 9000 }
          );
        } else if (errorCode === 'PLAN_HAS_ASSOCIATED_RECORDS') {
          // Mensagem própria — "recarregue a página" não se aplica aqui, a ação
          // certa é usar "Gerar sessões" no plano existente, não tentar de novo.
          toast.error(message, { duration: 8000 });
        } else {
          toast.error(`Conflito: ${message}. Recarregue a página e tente novamente.`);
        }
      } else if (status === 500) {
        toast.error('Erro interno no servidor. Nosso time foi notificado. Tente novamente em alguns instantes.');
      } else {
        toast.error(message || 'Não foi possível criar o plano. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!guide) return null;

  const fieldCls = 'h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 transition-colors hover:border-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300';
  const helpCls = 'mt-1 block text-[0.7rem] text-slate-500 dark:text-slate-400';

  return (
    <ModalShell open={open} onClose={() => onClose(false)} labelledBy="plan-form-title" className="max-h-[94vh] w-full max-w-xl sm:rounded-3xl">
      {/* Cabeçalho */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <CalendarDays size={20} aria-hidden />
            </div>
            <div>
              <h2 id="plan-form-title" className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {mode === 'replace' ? 'Editar Plano de Atendimento' : 'Novo Plano de Atendimento'}
              </h2>
              {patientName && (
                <p className="flex items-center gap-1 text-[0.8rem] font-bold text-emerald-700 dark:text-emerald-400">
                  <User size={12} aria-hidden /> {patientName}
                </p>
              )}
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Guia #{guide.number} • {guide.specialty.replace('_', ' ')} • {guide.totalSessions} sessões autorizadas
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onClose(false)} aria-label="Fechar"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {mode === 'create' && (
          <div className="mb-5 flex gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.8125rem] font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Clock size={16} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden />
            <p>
              O sistema vai gerar <strong>{guide.totalSessions} agendamentos</strong> automaticamente
              e criar os pagamentos como <strong>pendentes</strong> do convênio.
            </p>
          </div>
        )}

        {loadingPlan && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[0.8125rem] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            <Spinner size={12} /> Verificando plano existente...
          </div>
        )}

        {existingPlan && !loadingPlan && (
          <div role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.8125rem] font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <strong>⚠️ Edição de plano ativo.</strong><br />
            As alterações serão aplicadas apenas às <strong>sessões futuras</strong> (a partir de hoje). Sessões já realizadas não serão alteradas.
            {existingPlan.generatedAppointments?.length > 0 && (
              <>
                <br />
                Sessões geradas no plano: <strong>{existingPlan.generatedAppointments.length}</strong>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Linha 1: Profissional + Data início */}
          <div className="flex gap-3">
            <label className="min-w-0 flex-1">
              <span className={labelCls}>Profissional responsável *</span>
              <span className="relative block">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <select value={form.doctorId} onChange={(e) => setForm(prev => ({ ...prev, doctorId: e.target.value }))}
                  disabled={loadingDoctors} className={`${fieldCls} pl-9`}>
                  {loadingDoctors ? (
                    <option value={form.doctorId}>Carregando...</option>
                  ) : (
                    <>
                      <option value="" disabled>Selecione</option>
                      {doctors.map(doc => (
                        <option key={doc._id} value={doc._id}>
                          {doc.fullName} {doc.specialty ? `(${doc.specialty})` : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </span>
            </label>
            <label className="w-[38%] min-w-[150px]">
              <span className={labelCls}>Início *</span>
              <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))} className={fieldCls} />
              {mode === 'replace' && <span className={helpCls}>Sessões antes desta data não são geradas</span>}
            </label>
          </div>

          {/* Linha 2: Frequência semanal (derivada dos horários) + Valor por sessão */}
          <div className="flex gap-3">
            <label className="flex-1">
              <span className={labelCls}>Frequência semanal</span>
              <input type="text" value={`${form.slots.length}x por semana`} disabled className={fieldCls} />
              <span className={helpCls}>Definida pela quantidade de horários abaixo</span>
            </label>
            <label className="flex-1">
              <span className={labelCls}>Valor/sessão</span>
              <span className="relative block">
                <DollarSign size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                <input type="number" min={0} step={0.01} value={form.sessionValue}
                  onChange={(e) => setForm(prev => ({ ...prev, sessionValue: e.target.value }))} className={`${fieldCls} pl-8`} />
              </span>
            </label>
          </div>

          {/* Dias e horários */}
          <div>
            <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Clock size={14} aria-hidden /> Dias e horários da semana *
            </p>
            {form.slots.length > 1 && (
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Arraste para definir a ordem de prioridade na geração das sessões</p>
            )}
            <div className="flex flex-col gap-3">
              {form.slots.map((slot, idx) => (
                <div
                  key={idx}
                  draggable={form.slots.length > 1}
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDrop={handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 rounded-2xl border bg-slate-50 p-2.5 transition hover:border-slate-300 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 ${dragOverIdx === idx && draggedIdx !== idx ? 'border-emerald-600' : 'border-slate-100 dark:border-slate-700'} ${draggedIdx === idx ? 'opacity-40' : ''}`}
                >
                  {form.slots.length > 1 && (
                    <span className="flex cursor-grab items-center text-slate-400 active:cursor-grabbing" aria-hidden>
                      <GripVertical size={16} />
                    </span>
                  )}
                  <select aria-label={`Dia do horário ${idx + 1}`} value={slot.dayOfWeek}
                    onChange={(e) => handleSlotChange(idx, 'dayOfWeek', Number(e.target.value))} className={`${fieldCls} flex-1 bg-white`}>
                    {DAYS.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <input type="time" aria-label={`Hora do horário ${idx + 1}`} value={slot.time}
                    onChange={(e) => handleSlotChange(idx, 'time', e.target.value)} className={`${fieldCls} flex-1 bg-white`} />
                  {form.slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)} aria-label={`Remover horário ${idx + 1}`}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
              {form.slots.length < 5 && (
                <button type="button" onClick={addSlot}
                  className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                  <Plus size={14} aria-hidden /> Adicionar horário
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/40">
        <button type="button" onClick={() => onClose(false)} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">
          <X size={16} aria-hidden /> Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? <Spinner size={16} light /> : <Save size={16} aria-hidden />}
          {saving
            ? (existingPlan ? 'Substituindo plano...' : 'Gerando plano...')
            : (existingPlan ? 'Salvar alterações' : 'Criar plano')}
        </button>
      </div>

      <ModalShell open={confirmReplaceOpen} onClose={() => setConfirmReplaceOpen(false)} labelledBy="plan-confirm-title" className="w-full max-w-sm rounded-2xl">
        <div className="flex items-start gap-3 px-6 pb-2 pt-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertTriangle size={18} aria-hidden />
          </div>
          <div>
            <h3 id="plan-confirm-title" className="mb-1 text-[0.95rem] font-bold text-slate-800 dark:text-slate-100">Confirmar edição do plano ativo</h3>

            {loadingPreview && (
              <p className="flex items-center gap-2 text-[0.825rem] text-slate-600 dark:text-slate-300">
                <Spinner size={14} /> Calculando impacto da mudança...
              </p>
            )}

            {!loadingPreview && (
              <p className="text-[0.825rem] leading-relaxed text-slate-600 dark:text-slate-300">
                Este plano já tem <strong>{existingPlan?.generatedAppointments?.length || 0} agendamento(s)</strong> gerado(s).
                As alterações serão aplicadas apenas às <strong>sessões futuras</strong> (a partir de hoje). Sessões já realizadas não serão alteradas.
                {replanPreview?.slotsChanged && (
                  <> A frequência/horário mudou: sincronize a agenda pelo botão <strong>"Gerar sessões"</strong> no card.</>
                )}
                {replanPreview?.eligible === false && (
                  <span className="mt-1 block font-bold text-red-700 dark:text-red-400">
                    ⚠ {replanPreview.eligibilityMessage || 'Guia pode não estar elegível para gerar novas sessões.'}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5 pt-3">
          <button type="button" onClick={() => setConfirmReplaceOpen(false)}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button type="button" onClick={performSave} disabled={loadingPreview}
            className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
            Confirmar e salvar
          </button>
        </div>
      </ModalShell>
    </ModalShell>
  );
};

export default InsurancePlanForm;