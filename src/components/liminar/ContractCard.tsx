import dayGridPlugin from '@fullcalendar/daygrid';
import AnimatedValue from '../ui/insight/AnimatedValue';
import { AppointmentOrigin } from '../patients/AppointmentOrigin';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Clock,
  DollarSign,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../../utils/toast';
import { Modal } from '../ui/Modal';
import { Field, ModalHeader, ModalFooter, ChoiceChips, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';
import { ContractWithPlan } from '../../hooks/useLiminarContracts';
import { appointmentService } from '../../services/appointmentService';
import doctorService from '../../services/doctorService';
import liminarContractService, { ContractIntegrity } from '../../services/liminarContractService';
import { IDoctor, SelectedEvent } from '../../utils/types/types';
import { getSpecialtyTheme } from '../../constants/specialtyThemes';
import InactivateEntityModal from '../common/InactivateEntityModal';
import AppointmentDetailModal from '../calendar/appointmentDetailModal';
import CreatePlanModal from './CreatePlanModal';
import GenerationCancellationFlow from '../common/GenerationCancellationFlow';

// Cor de "faltando/pendente de agenda" — neutra de propósito: não deve competir visualmente
// com laranja/vermelho de risco real (saldo baixo, vencimento), que têm significado diferente.
const NEUTRAL_MISSING_COLOR = { bar: 'var(--fx-slate-400)', text: 'var(--fx-slate-600)', dot: 'var(--fx-slate-400)' };

const SHORT_SPECIALTY: Record<string, string> = {
  fonoaudiologia: 'fono', psicologia: 'psicologia', psicopedagogia: 'psicopedagogia',
  terapia_ocupacional: 'TO', fisioterapia: 'fisio', psicomotricidade: 'psicomotricidade',
  neuropsicologia: 'neuropsicologia', musicoterapia: 'musicoterapia',
};

const DAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

const PALETTES = [
  { from: 'var(--fx-amber-700)', to: '#D97706', bar: 'linear-gradient(90deg,#D97706aa,#D97706)', icon: '#D97706', badge: 'var(--fx-orange-50)', badgeText: 'var(--fx-amber-800)', badgeBorder: 'var(--fx-amber-200)' },
  { from: '#0E7490', to: '#0891B2', bar: 'linear-gradient(90deg,#0891B2aa,#0891B2)', icon: '#0891B2', badge: '#ECFEFF', badgeText: '#164E63', badgeBorder: '#A5F3FC' },
  { from: 'var(--fx-violet-700)', to: '#7C3AED', bar: 'linear-gradient(90deg,#7C3AEDaa,#7C3AED)', icon: '#7C3AED', badge: 'var(--fx-violet-50)', badgeText: '#4C1D95', badgeBorder: 'var(--fx-violet-200)' },
  { from: 'var(--fx-emerald-700)', to: '#059669', bar: 'linear-gradient(90deg,#059669aa,#059669)', icon: '#059669', badge: 'var(--fx-emerald-50)', badgeText: 'var(--fx-emerald-900)', badgeBorder: 'var(--fx-emerald-200)' },
  { from: 'var(--fx-red-700)', to: '#DC2626', bar: 'linear-gradient(90deg,#DC2626aa,#DC2626)', icon: '#DC2626', badge: 'var(--fx-red-50)', badgeText: 'var(--fx-red-900)', badgeBorder: 'var(--fx-red-200)' },
  { from: 'var(--fx-blue-700)', to: '#2563EB', bar: 'linear-gradient(90deg,#2563EBaa,#2563EB)', icon: '#2563EB', badge: 'var(--fx-blue-50)', badgeText: 'var(--fx-blue-900)', badgeBorder: 'var(--fx-blue-200)' },
];

interface Props {
  data: ContractWithPlan;
  colorIndex?: number;
  onRefresh: () => void;
  /** Detalhes controlado pelo painel: abre/fecha todos os cards da linha juntos. */
  detailsExpanded?: boolean;
  onToggleDetails?: () => void;
}

function lastDigits(processNumber: string, n = 6) {
  const digits = processNumber.replace(/\D/g, '');
  return digits.length > n ? `…${digits.slice(-n)}` : processNumber;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


type SpecialtyMeta = { key: string; label: string; slotsPerWeek: number; sessionValue: number };

type ConfirmState = {
  open: true;
  weeks: number;
  startDate: string;
  allSpecialties: SpecialtyMeta[];
  selectedSpecialties: string[];
  pendingBySpecialty: Record<string, number>;
  pendingLoading: boolean;
} | { open: false };

function todayIsoDate(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// Theming do FullCalendar via CSS custom properties (v6+), escopado ao wrapper
// do modal de sessões — mesmo tratamento usado em PatientMiniCalendar.tsx.
const CALENDAR_THEME_VARS = {
  '--fc-border-color': 'var(--fx-gray-200)',
  '--fc-page-bg-color': '#FFFFFF',
  '--fc-neutral-bg-color': 'var(--fx-gray-50)',
  '--fc-today-bg-color': 'var(--fx-blue-50)',
  '--fc-now-indicator-color': '#2563EB',
} as React.CSSProperties;

export async function completeLiminarAppointment(
  id: string,
  completeData: Parameters<typeof appointmentService.complete>[1],
  onSuccess: () => void,
) {
  await appointmentService.complete(id, completeData);
  onSuccess();
}

export default function ContractCard({ data, onRefresh, detailsExpanded, onToggleDetails }: Props) {
  const { contract, plan, planError, committed } = data;
  // Liminar é sempre roxo (identidade do tipo de cobertura em todo o painel do paciente).
  const palette = PALETTES[2];

  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [generateWeeks, setGenerateWeeks] = useState<number>(4);
  const [generating, setGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localExpanded, setLocalExpanded] = useState(false);
  const planExpanded = detailsExpanded ?? localExpanded;
  const togglePlanExpanded = () => (onToggleDetails ? onToggleDetails() : setLocalExpanded(v => !v));
  const [expandedTherapyCard, setExpandedTherapyCard] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeReason, setRechargeReason] = useState('');
  const [rechargingLoading, setRechargingLoading] = useState(false);

  const [showInactivateModal, setShowInactivateModal] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);

  const [specialtyModal, setSpecialtyModal] = useState<{ open: boolean; specialty: string; sessions: any[]; loading: boolean }>({
    open: false, specialty: '', sessions: [], loading: false,
  });
  const [editingAppointment, setEditingAppointment] = useState<SelectedEvent | null>(null);

  const [integrity, setIntegrity] = useState<ContractIntegrity | null>(null);

  useEffect(() => {
    liminarContractService.getIntegrity(contract._id)
      .then(setIntegrity)
      .catch(() => {});
  }, [contract._id]);

  const [editTherapyModal, setEditTherapyModal] = useState<{
    open: boolean;
    specialty: string;
    doctorId: string;
    sessionValue: number;
    sessionDurationMinutes: number;
    slots: Array<{ dayOfWeek: number | ''; time: string }>;
    notes: string;
  }>({ open: false, specialty: '', doctorId: '', sessionValue: 0, sessionDurationMinutes: 40, slots: [], notes: '' });
  const [modalDoctors, setModalDoctors] = useState<Array<{ _id: string; fullName: string; specialty?: string }>>([]);
  const [modalDoctorsLoading, setModalDoctorsLoading] = useState(false);
  const [savingTherapy, setSavingTherapy] = useState(false);

  const available = committed?.available ?? contract.creditBalance;
  const balancePct = contract.totalCredit > 0
    ? Math.max(0, Math.min(100, (available / contract.totalCredit) * 100))
    : 0;
  // Cor da barra pela saúde do saldo, não pela ordem do card.
  const balanceHealth: 'ok' | 'mid' | 'low' = balancePct >= 50 ? 'ok' : balancePct >= 25 ? 'mid' : 'low';
  const barColor = balanceHealth === 'ok' ? '#7C3AED' : balanceHealth === 'mid' ? '#D97706' : available < 0 ? '#DC2626' : '#EA580C';
  // Composição do total liberado (valores do back): usado + reservado na agenda + livre.
  const reserved = Math.max(0, committed?.committed ?? 0);
  const pctOf = (v: number) => (contract.totalCredit > 0 ? Math.max(0, Math.min(100, (v / contract.totalCredit) * 100)) : 0);
  const usedPct = pctOf(contract.usedCredit);
  const reservedPct = Math.min(pctOf(reserved), 100 - usedPct);
  // Quantas sessões o valor livre ainda paga, por especialidade do plano (o crédito é único, não dividido).
  const sessionsLeft = Object.entries(plan?.therapies ?? {})
    .filter(([, cfg]) => cfg?.sessionValue > 0)
    .map(([sp, cfg]) => ({ label: SHORT_SPECIALTY[sp] ?? sp.replace(/_/g, ' '), count: Math.floor(Math.max(0, available) / cfg.sessionValue) }));

  const handleInactivate = async () => {
    setIsInactivating(true);
    try {
      const result = await liminarContractService.inactivate(contract._id);
      toast.success(`Contrato inativado — ${result.sessionsCanceled ?? 0} sessão(ões) cancelada(s)`);
      setShowInactivateModal(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Erro ao inativar contrato');
    } finally {
      setIsInactivating(false);
    }
  };

  const statusLabel = contract.status === 'active' ? 'Ativo'
    : contract.status === 'exhausted' ? 'Esgotado' : 'Cancelado';

  // Esc fecha o modal do topo (o de edição de agendamento cuida do próprio Esc).
  useEffect(() => {
    const anyOpen = showRecharge || confirm.open || editTherapyModal.open || specialtyModal.open || menuOpen;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || editingAppointment) return;
      if (menuOpen) setMenuOpen(false);
      else if (editTherapyModal.open) { if (!savingTherapy) setEditTherapyModal(p => ({ ...p, open: false })); }
      else if (confirm.open) { if (!generating) setConfirm({ open: false }); }
      else if (showRecharge) { if (!rechargingLoading) setShowRecharge(false); }
      else if (specialtyModal.open) setSpecialtyModal(p => ({ ...p, open: false }));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showRecharge, confirm.open, editTherapyModal.open, specialtyModal.open, menuOpen, editingAppointment, savingTherapy, generating, rechargingLoading]);

  async function openConfirm(weeks: number) {
    if (!plan) return;
    const allSpecialties: SpecialtyMeta[] = Object.entries(plan.therapies ?? {}).map(([key, cfg]: [string, any]) => ({
      key,
      label: key.replace(/_/g, ' '),
      slotsPerWeek: (cfg.slots ?? []).length,
      sessionValue: cfg.sessionValue ?? 0,
    }));
    setConfirm({
      open: true, weeks,
      startDate: todayIsoDate(),
      allSpecialties,
      selectedSpecialties: allSpecialties.map(s => s.key),
      pendingBySpecialty: {},
      pendingLoading: true,
    });
    // Carrega pendentes em background
    try {
      const sessions = await liminarContractService.getSessions(contract._id);
      const pending: Record<string, number> = {};
      for (const s of sessions) {
        if (!['canceled', 'completed', 'force_cancelled'].includes(s.operationalStatus)) {
          pending[s.specialty] = (pending[s.specialty] ?? 0) + 1;
        }
      }
      setConfirm(prev => prev.open ? { ...prev, pendingBySpecialty: pending, pendingLoading: false } : prev);
    } catch {
      setConfirm(prev => prev.open ? { ...prev, pendingLoading: false } : prev);
    }
  }

  async function handleConfirmGenerate() {
    if (!confirm.open || !plan) return;
    setGenerating(true);
    setConfirm({ open: false });
    try {
      const res = await liminarContractService.generateSessions(contract._id, plan._id, {
        mode: 'append',
        weeks: confirm.weeks,
        startDate: confirm.startDate,
        specialties: confirm.selectedSpecialties,
      });

      if (res.created > 0) {
        const revivedNote = res.revived ? ` (${res.revived} reaproveitada${res.revived !== 1 ? 's' : ''} de canceladas)` : '';
        toast.success(`✅ ${res.created} sessões criadas${revivedNote}  |  💰 R$ ${fmt(res.totalCost)}`);
      }

      if (res.conflicts > 0 && res.conflictSlots?.length > 0) {
        const msgs = res.conflictSlots.map((c: any) => c.message ?? `${c.time} — indisponível`);
        const preview = msgs.slice(0, 3).join('\n');
        const extra = msgs.length > 3 ? `\n...e mais ${msgs.length - 3} conflito(s)` : '';
        toast.warn(
          `⚠️ ${res.conflicts} slot(s) não criados por conflito de agenda:\n${preview}${extra}`,
          { autoClose: 10000, style: { whiteSpace: 'pre-line' } }
        );
      }

      if (res.created === 0 && res.conflicts === 0) {
        toast.info('Nenhuma sessão nova gerada — todos os slots já existiam.');
      }

      onRefresh();
      liminarContractService.getIntegrity(contract._id).then(setIntegrity).catch(() => {});
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao gerar sessões');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRecharge(e?: React.FormEvent) {
    e?.preventDefault();
    const amount = parseFloat(rechargeAmount.replace(',', '.'));
    if (!amount || amount <= 0) return;
    setRechargingLoading(true);
    try {
      await liminarContractService.recharge(contract._id, amount, rechargeReason || undefined);
      toast.success(`Crédito de R$ ${fmt(amount)} adicionado!`);
      setShowRecharge(false);
      setRechargeAmount('');
      setRechargeReason('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao adicionar crédito');
    } finally {
      setRechargingLoading(false);
    }
  }

  async function openSpecialtyModal(specialty: string) {
    setSpecialtyModal({ open: true, specialty, sessions: [], loading: true });
    try {
      const sessions = await liminarContractService.getSessions(contract._id, { specialty });
      setSpecialtyModal((prev) => ({ ...prev, sessions, loading: false }));
    } catch {
      toast.error('Erro ao carregar sessões');
      setSpecialtyModal((prev) => ({ ...prev, loading: false }));
    }
  }

  function sessionToEvent(s: any): SelectedEvent {
    const dateObj = new Date(s.date);
    return {
      id: s._id,
      patient: { id: s.patient?._id ?? s.patient, fullName: s.patient?.fullName ?? '' },
      doctor: { id: s.doctor?._id ?? s.doctor, fullName: s.doctor?.fullName ?? '' },
      date: dateObj,
      startTime: s.time,
      formattedDate: dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      start: `${s.date.slice(0, 10)}T${s.time}`,
      operationalStatus: s.operationalStatus,
      clinicalStatus: s.clinicalStatus,
      reason: s.reason || s.notes || '',
      sessionValue: s.sessionValue,
      paymentAmount: s.paymentAmount,
      specialty: s.specialty,
      serviceType: s.serviceType,
      // 🛡️ Dados financeiros: sempre popular para evitar downgrade acidental
      billingType: s.billingType,
      paymentMethod: s.paymentMethod,
      insuranceProvider: s.insuranceProvider,
      insuranceValue: s.insuranceValue,
      authorizationCode: s.authorizationCode,
      // 🛡️ Referências de guia/plano: preservar ao editar
      insuranceGuide: s.insuranceGuide ?? null,
      insuranceGuideId: s.insuranceGuide?._id?.toString?.() ?? s.insuranceGuide?.toString?.() ?? s.insuranceGuideId ?? null,
      insuranceGuideNumber: s.insuranceGuide?.number ?? s.insuranceGuideNumber ?? null,
      insurancePlan: s.insurancePlan ?? null,
      liminarContract: s.liminarContract ?? null,
      package: s.package ?? null,
      // pre_agendado aqui é um Appointment real (gerado pelo plano/guia), não o "interesse" legado
      // (coleção PreAgendamento). Marcar __isPreAgendamento levava o modal ao botão "Converter em
      // Agendamento", que ninguém liga aqui → "Funcionalidade de conversão não disponível" e não dava
      // para finalizar (Daiane, 09/11/2026). Na agenda já é assim: pre_agendado vai direto para "Realizar Atendimento".
      __isPreAgendamento: false,
    };
  }

  async function openEditTherapyModal(specialty: string, config?: any) {
    setEditTherapyModal({
      open: true,
      specialty,
      doctorId: config?.doctor ?? '',
      sessionValue: config?.sessionValue ?? 0,
      sessionDurationMinutes: config?.sessionDurationMinutes ?? 40,
      slots: (config?.slots ?? [{ dayOfWeek: '', time: '' }]).map((s: any) => ({ ...s })),
      notes: config?.notes ?? '',
    });
    setModalDoctorsLoading(true);
    try {
      const res = await doctorService.getActiveDoctors();
      setModalDoctors(res?.data ?? []);
    } catch {}
    finally { setModalDoctorsLoading(false); }
  }

  async function handleSaveTherapy() {
    if (!plan) return;
    setSavingTherapy(true);
    try {
      const result = await liminarContractService.updateTherapy(
        contract._id, plan._id, editTherapyModal.specialty, {
          doctorId: editTherapyModal.doctorId || undefined,
          sessionValue: editTherapyModal.sessionValue,
          sessionDurationMinutes: editTherapyModal.sessionDurationMinutes,
          slots: editTherapyModal.slots
            .filter(s => s.dayOfWeek !== '' && s.time)
            .map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
          notes: editTherapyModal.notes || null,
        }
      );
      const parts: string[] = [];
      if (result.appointmentsUpdated > 0) parts.push(`${result.appointmentsUpdated} sessão(ões) atualizada(s)`);
      if (result.appointmentsCanceled > 0) parts.push(`${result.appointmentsCanceled} sessão(ões) órfã(s) canceladas (dia removido)`);
      const msg = parts.length > 0 ? `Terapia atualizada! ${parts.join(' · ')}.` : 'Terapia atualizada no plano.';
      toast.success(msg);
      setEditTherapyModal(p => ({ ...p, open: false }));
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Erro ao atualizar terapia');
    } finally {
      setSavingTherapy(false);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-violet-600 bg-white text-left shadow-sm transition-shadow duration-quick hover:shadow-md dark:border-slate-700 dark:border-l-violet-500 dark:bg-slate-900"
    >
      {/* ══ Camada 1: Header — identidade do contrato ══ */}
      <div
        className="relative px-4 pb-2.5 pt-3 sm:px-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: palette.badge }}>
              <Scale className="h-4 w-4 flex-shrink-0" style={{ color: palette.to }} />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">Contrato liminar</span>
              {(contract.processNumber || contract.court) && (
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {[contract.processNumber ? `Proc. ${lastDigits(contract.processNumber)}` : null, contract.court].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${contract.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30' : 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}`}>
              {statusLabel}
            </span>
            {contract.status === 'active' && (available < 0 || balanceHealth === 'low') && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${available < 0 ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30' : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30'}`}>
                {available < 0 ? 'Saldo excedido' : 'Saldo baixo'}
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Mais ações do contrato"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(v => !v)}
                className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 z-20 rounded-2xl shadow-xl py-1 min-w-max"
                  style={{ top: '110%', background: 'var(--fx-white)', border: '1px solid #EDF2F7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <button
                    onClick={() => { setMenuOpen(false); setShowRecharge(true); }}
                    className="flex items-center gap-2 w-full text-left text-xs font-medium px-4 py-2 hover:bg-slate-50 transition-colors"
                    style={{ color: '#1A2C3E' }}
                  >
                    <DollarSign className="w-3.5 h-3.5" style={{ color: '#D97706' }} /> Adicionar crédito
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onRefresh(); }}
                    className="flex items-center gap-2 w-full text-left text-xs font-medium px-4 py-2 hover:bg-slate-50 transition-colors"
                    style={{ color: '#1A2C3E' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" style={{ color: '#5B6E8C' }} /> Atualizar
                  </button>
                  {contract.status === 'active' && (
                    <button
                      role="menuitem"
                      onClick={() => { setMenuOpen(false); setShowInactivateModal(true); }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Inativar contrato…
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Camada 2: Summary — saldo do contrato (valores do back, só reorganizados) ══ */}
      <div className="space-y-3 px-4 pb-4 pt-1 sm:px-5">
        {/* Onde está o dinheiro da liminar: usado + reservado na agenda + livre = total liberado. */}
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Livre para novas sessões</p>
          <p className="mt-0.5 flex items-baseline gap-2 whitespace-nowrap">
            <span className={`text-2xl font-bold leading-none tabular-nums ${available < 0 ? 'text-red-600 dark:text-red-400' : balanceHealth === 'low' ? 'text-amber-600 dark:text-amber-400' : 'text-violet-700 dark:text-violet-300'}`}>
              <AnimatedValue value={`R$ ${fmt(available)}`} />
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">de R$ {fmt(contract.totalCredit)} liberados</span>
          </p>
          {reserved > 0 && (
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Saldo do contrato <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">R$ {fmt(contract.creditBalance)}</span>, dos quais <span className="tabular-nums">R$ {fmt(reserved)}</span> já estão na agenda
            </p>
          )}
        </div>
        <div
          className="flex h-3 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/15"
          role="img"
          aria-label={`Usado ${usedPct.toFixed(0)}%, reservado na agenda ${reservedPct.toFixed(0)}%, livre ${balancePct.toFixed(0)}%`}
        >
          <div style={{ width: `${usedPct}%`, background: '#6D28D9', transition: 'width 0.5s' }} />
          <div style={{ width: `${reservedPct}%`, background: 'repeating-linear-gradient(135deg, #F59E0B 0 4px, #FBBF24 4px 8px)', transition: 'width 0.5s' }} />
          <div style={{ width: `${balancePct}%`, background: barColor, opacity: 0.35, transition: 'width 0.5s' }} />
        </div>
        <dl className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          {[
            { k: 'Usado', v: contract.usedCredit, swatch: { background: '#6D28D9' } },
            { k: 'Reservado', v: reserved, swatch: { background: 'repeating-linear-gradient(135deg, #F59E0B 0 3px, #FBBF24 3px 6px)' } },
            { k: 'Livre', v: available, swatch: { background: barColor, opacity: 0.35 } },
          ].map(row => (
            <div key={row.k} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={row.swatch} aria-hidden />
              <dt>{row.k}</dt>
              <dd className={`font-semibold tabular-nums ${row.v < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>R$ {fmt(row.v)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ── Ações: a principal é o próximo passo do contrato ── */}
      {(() => {
        const isActive = contract.status === 'active';
        const primary = !isActive ? null
          : !plan ? { label: 'Criar plano terapêutico', onClick: () => setShowCreatePlan(true) }
          : balanceHealth === 'low' ? { label: 'Adicionar crédito', onClick: () => setShowRecharge(true) }
          : (committed?.committed ?? 0) <= 0 ? { label: generating ? 'Gerando…' : 'Gerar sessões', onClick: () => openConfirm(generateWeeks) }
          : null;
        return (
          <div className="mt-auto flex items-center gap-2 border-b border-slate-100 px-4 pb-3.5 pt-1 sm:px-5 dark:border-slate-800">
            {primary && (
              <button type="button" onClick={primary.onClick} disabled={generating}
                className="flex-1 truncate rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:opacity-50">
                {primary.label}
              </button>
            )}
            <button type="button" onClick={togglePlanExpanded} aria-expanded={planExpanded}
              className={`flex shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${primary ? '' : 'flex-1'}`}>
              Detalhes
              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-quick" style={{ transform: planExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
          </div>
        );
      })()}

      {/* ══ Detalhes: avisos, ritmo, passos e previsão (saem do cartão, nada some) ══ */}
      {planExpanded && (
        <div className="space-y-3 px-4 pt-4 sm:px-5">
          {committed?.projection && contract.creditBalance > 0 && (() => {
            const proj = committed.projection;
            const end = new Date(proj.estimatedExhaustionDate);
            if (Number.isNaN(end.getTime())) return null;
            const day = end.getDate();
            const part = day <= 10 ? 'início' : day <= 20 ? 'meados' : 'fim';
            const month = end.toLocaleDateString('pt-BR', { month: 'long' });
            const perWeek = Math.round(proj.averageSessionsPerWeek);
            return (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                No ritmo atual, de umas {perWeek} {perWeek === 1 ? 'sessão' : 'sessões'} por semana, o saldo dura até{' '}
                <span className="font-semibold text-slate-900 dark:text-slate-100">{part} de {month} de {end.getFullYear()}</span>.
              </p>
            );
          })()}

        {sessionsLeft.length > 0 && available > 0 && (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            O valor livre paga cerca de{' '}
            {sessionsLeft.map((s, i) => (
              <span key={s.label}>
                {i > 0 && (i === sessionsLeft.length - 1 ? ' ou ' : ', ')}
                <b className="font-semibold text-slate-900 dark:text-slate-100">{s.count} de {s.label}</b>
              </span>
            ))}
            .
          </p>
        )}
        {contract.status === 'active' && balanceHealth === 'low' && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Saldo baixo: avise a família e o jurídico para pedir novo crédito antes de acabar.
          </p>
        )}
        {(() => {
          const steps = [
            { k: 'Contrato', state: contract.status === 'active' ? 'done' : 'warn', sub: contract.processNumber ? `proc. ${lastDigits(contract.processNumber)}` : statusLabel.toLowerCase() },
            { k: 'Plano', state: plan ? 'done' : contract.status === 'active' ? 'current' : 'todo', sub: plan ? 'ativo' : 'falta criar' },
            { k: 'Sessões', state: (committed?.committed ?? 0) > 0 ? 'done' : plan ? 'current' : 'todo', sub: (committed?.committed ?? 0) > 0 ? 'agendadas' : plan ? 'gerar' : '—' },
            { k: 'Consumo', state: balanceHealth === 'low' ? 'warn' : 'current', sub: `${usedPct.toFixed(0)}% usado` },
          ];
          const dot: Record<string, string> = { done: 'bg-violet-600 text-white', current: 'bg-white text-violet-700 ring-2 ring-violet-600 dark:bg-slate-900 dark:text-violet-300', warn: 'bg-amber-500 text-white', todo: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
          return (
            <ol className="grid grid-cols-4 gap-1" aria-label="Etapas do contrato">
              {steps.map((st, i) => (
                <li key={st.k} className="flex min-w-0 flex-col items-center text-center">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-3xs font-bold ${dot[st.state]}`}>{st.state === 'done' ? '✓' : i + 1}</span>
                  <span className="mt-1 truncate text-2xs font-semibold text-slate-700 dark:text-slate-200">{st.k}</span>
                  <span className="truncate text-3xs text-slate-500 dark:text-slate-400">{st.sub}</span>
                </li>
              ))}
            </ol>
          );
        })()}
        </div>
      )}
      {planExpanded && (
        <div className="mt-4">
      {committed?.projection && (() => {
        const proj = committed.projection;
        const confidenceLabel = proj.confidence === 'high' ? 'alta' : proj.confidence === 'medium' ? 'média' : 'baixa';
        const confidenceDot = proj.confidence === 'high' ? '#10B981' : proj.confidence === 'medium' ? '#F59E0B' : '#EF4444';
        const confidenceColor = proj.confidence === 'high'
          ? { bg: 'var(--fx-emerald-100)', text: 'var(--fx-emerald-800)' }
          : proj.confidence === 'medium'
            ? { bg: 'var(--fx-amber-100)', text: 'var(--fx-amber-800)' }
            : { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)' };
        const methodologyLabel = proj.methodology === 'scheduled_plan'
          ? 'agenda confirmada'
          : `histórico das últimas ${proj.sampleWeeks} semanas`;
        const startLabel = proj.treatmentStartDate
          ? new Date(proj.treatmentStartDate).toLocaleDateString('pt-BR')
          : '—';
        const endLabel = new Date(proj.estimatedExhaustionDate).toLocaleDateString('pt-BR');
        const roundedRemaining = Math.round(proj.remainingSessions);

        return (
          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/30">
            <span className="block text-xs font-semibold mb-2" style={{ color: '#5B6E8C' }}>Previsão de término</span>

            <div className="flex items-end justify-between mb-3">
              <span className="font-bold text-2xl" style={{ color: '#1A2C3E' }}>{endLabel}</span>
              <span
                className="text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 flex-shrink-0"
                style={{ background: confidenceColor.bg, color: confidenceColor.text }}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: confidenceDot }} />
                confiança {confidenceLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <span className="block text-3xs font-medium " style={{ color: '#A0AABF' }}>Ritmo atual</span>
                <span className="text-sm font-semibold" style={{ color: '#1A2C3E' }}>{proj.averageSessionsPerWeek} sess./sem</span>
              </div>
              <div>
                <span className="block text-3xs font-medium " style={{ color: '#A0AABF' }}>Consumo/sem</span>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#1A2C3E' }}>R$ {fmt(proj.weeklyConsumption)}</span>
              </div>
              <div>
                <span className="block text-3xs font-medium " style={{ color: '#A0AABF' }}>Restantes</span>
                <span className="text-sm font-semibold" style={{ color: '#1A2C3E' }}>≈{roundedRemaining} sessões</span>
              </div>
            </div>

            <div className="text-xs mb-1 text-slate-500 dark:text-slate-400">Base: {methodologyLabel}</div>

            <div className="text-xs text-slate-500 dark:text-slate-400">Período analisado: {startLabel} até {endLabel}</div>
          </div>
        );
      })()}

        </div>
      )}

      {/* ══ Camada 3: Breakdown — plano terapêutico por especialidade (accordion, controlado pelo header) ══ */}
      {planExpanded && (
        <div className="p-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4" style={{ color: '#2E7A5E' }} />
              <span className="font-bold text-sm" style={{ color: '#1A2C3E' }}>
                {plan ? `Plano Terapêutico` : 'Plano Terapêutico'}
              </span>
              {integrity && (() => {
                const pct = integrity.summary.integrityPercent;
                const color = pct >= 95 ? { bg: 'var(--fx-emerald-100)', text: 'var(--fx-emerald-800)' }
                  : pct >= 75 ? { bg: 'var(--fx-amber-100)', text: 'var(--fx-amber-800)' }
                  : { bg: 'var(--fx-red-100)', text: 'var(--fx-red-800)' };
                return (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: color.bg, color: color.text }}>
                    {pct >= 95 ? '🟢' : pct >= 75 ? '🟡' : '🔴'} {pct}%
                  </span>
                );
              })()}
            </div>
            <button
              onClick={() => setShowCreatePlan(true)}
              className="text-xs font-semibold px-3 py-1 rounded-full border transition-all hover:opacity-80"
              style={{ color: '#2E7A5E', borderColor: '#C6E6DA', background: '#EFF9F6' }}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              {plan ? 'Nova versão' : 'Criar plano'}
            </button>
          </div>


          {plan ? (
            <>
                <div className="space-y-2 mb-2">
                  {Object.entries(plan.therapies ?? {}).map(([specialty, config]: [string, any], specialtyIndex) => {
                    const intSp = integrity?.specialties?.[specialty];
                    const completed  = intSp?.completed ?? 0;
                    const generated  = intSp?.generated ?? 0;
                    const canceled   = intSp?.canceled ?? 0;
                    const missing    = intSp?.missing   ?? 0;
                    const expected   = intSp?.expected  ?? 0;
                    const totalAuth  = config.totalSessions ?? generated ?? expected ?? 0;
                    const scheduled  = generated - completed;
                    const base       = totalAuth > 0 ? totalAuth : generated > 0 ? generated : expected;
                    const pctComp    = base > 0 ? Math.min((completed / base) * 100, 100) : 0;
                    const pctPend    = base > 0 ? Math.min((scheduled / base) * 100, 100 - pctComp) : 0;
                    const missingPct = base > 0 ? Math.max(0, (base - generated) / base) * 100 : 0;
                    const spTheme    = getSpecialtyTheme(specialty);

                    return (
                      <div
                        key={specialty}
                        className="rounded-xl p-3 space-y-2"
                        style={{ background: spTheme.light, border: `1px solid ${spTheme.border}` }}
                      >
                        {/* Linha 1: nome + meta + ações */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs capitalize flex items-center gap-1.5" style={{ color: spTheme.text }}>
                            <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: spTheme.to }} />
                            Liminar {specialtyIndex + 1} · {specialty.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs" style={{ color: '#8A99B0' }}>
                              {(config.slots ?? []).length > 0
                                ? `${(config.slots ?? []).length}×/sem · R$ ${fmt(config.sessionValue ?? 0)}`
                                : `R$ ${fmt(config.sessionValue ?? 0)}`}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); openSpecialtyModal(specialty); }}
                              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                              title="Ver sessões agendadas"
                            >
                              <Info className="w-3 h-3" style={{ color: '#6366F1' }} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditTherapyModal(specialty, config); }}
                              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
                              title="Editar terapia"
                            >
                              <Pencil className="w-3 h-3" style={{ color: '#A0AABF' }} />
                            </button>
                          </div>
                        </div>

                        {/* Linha 2: barra empilhada + contadores */}
                        {intSp ? (
                          <>
                            <div
                              className="flex rounded-full overflow-hidden"
                              style={{ height: 6, background: '#E9EEF2' }}
                              title={`Autorizado: ${base} | Concluídas: ${completed} | Agendadas: ${scheduled} | Canceladas: ${canceled} | Faltando: ${Math.max(0, base - generated)}`}
                            >
                              <div style={{ width: `${pctComp}%`, background: '#10B981', transition: 'width 0.5s' }} />
                              <div style={{ width: `${pctPend}%`, background: '#6366F1', transition: 'width 0.5s' }} />
                              {base > generated && (
                                <div style={{ width: `${Math.min(missingPct, 100 - pctComp - pctPend)}%`, background: NEUTRAL_MISSING_COLOR.bar, transition: 'width 0.5s' }} />
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                                <span style={{ color: 'var(--fx-emerald-800)' }}><b>{completed}</b> concluídas</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6366F1' }} />
                                <span style={{ color: 'var(--fx-indigo-800)' }}><b>{scheduled}</b> agendadas</span>
                              </span>
                              {canceled > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EF4444' }} />
                                  <span style={{ color: 'var(--fx-red-700)' }}><b>{canceled}</b> canceladas</span>
                                </span>
                              )}
                              {missing > 0 ? (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: NEUTRAL_MISSING_COLOR.dot }} />
                                  <span style={{ color: NEUTRAL_MISSING_COLOR.text }}><b>{missing}</b> faltando</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--fx-emerald-100)', color: 'var(--fx-emerald-800)' }}>
                                  ✓ agenda ok
                                </span>
                              )}
                              <span className="ml-auto text-xs" style={{ color: '#A0AABF' }}>
                                {completed}/{base}
                              </span>
                            </div>

                            {/* Detalhes da especialidade — padrão guia de convênio */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <div
                                className="rounded-lg p-2 text-center"
                                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${spTheme.border}` }}
                              >
                                <p className="text-3xs uppercase tracking-wide font-semibold" style={{ color: '#8A99B0' }}>Valor/sessão</p>
                                <p className="text-xs font-bold" style={{ color: spTheme.text }}>R$ {fmt(config.sessionValue ?? 0)}</p>
                              </div>
                              <div
                                className="rounded-lg p-2 text-center"
                                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${spTheme.border}` }}
                              >
                                <p className="text-3xs uppercase tracking-wide font-semibold" style={{ color: '#8A99B0' }}>Total autorizado</p>
                                <p className="text-xs font-bold" style={{ color: spTheme.text }}>{base} sessões</p>
                                <p className="text-3xs" style={{ color: '#8A99B0' }}>R$ {fmt(base * (config.sessionValue ?? 0))}</p>
                              </div>
                              <div
                                className="rounded-lg p-2 text-center"
                                style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${spTheme.border}` }}
                              >
                                <p className="text-3xs uppercase tracking-wide font-semibold" style={{ color: '#8A99B0' }}>Sessões geradas</p>
                                <p className="text-xs font-bold" style={{ color: spTheme.text }}>{generated}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs italic" style={{ color: '#A0AABF' }}>Carregando integridade...</p>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedTherapyCard(prev => prev === specialty ? null : specialty); }}
                          className="w-full flex items-center justify-center gap-1 pt-1 text-xs font-medium transition-colors hover:opacity-70"
                          style={{ color: spTheme.text }}
                        >
                          Horários
                          <ChevronDown
                            className="w-3 h-3 transition-transform duration-quick"
                            style={{ transform: expandedTherapyCard === specialty ? 'rotate(180deg)' : 'rotate(0deg)' }}
                          />
                        </button>
                        {expandedTherapyCard === specialty && (
                          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                            {(config.slots ?? []).map((slot: any, i: number) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{ background: 'rgba(255,255,255,0.7)', color: spTheme.text, border: `1px solid ${spTheme.border}` }}
                              >
                                {DAY_LABELS[slot.dayOfWeek]} {slot.time}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              {contract.status === 'active' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openConfirm(generateWeeks)}
                    disabled={generating}
                    className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                  >
                    {generating ? '...' : <><Zap className="w-3 h-3 inline mr-1" />Gerar sessões</>}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 rounded-xl" style={{ background: '#F8FAFE' }}>
              <Calendar className="w-7 h-7 mx-auto mb-2" style={{ color: '#A0AABF' }} />
              <p className="text-xs italic" style={{ color: '#8A99B0' }}>
                {planError ?? 'Nenhum plano ativo'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Adicionar Crédito ── */}
      <Modal
        open={showRecharge}
        onClose={() => !rechargingLoading && setShowRecharge(false)}
        labelledBy="recharge-title"
        zIndexClass="z-[1300]"
        panelClassName="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white text-left shadow-2xl sm:rounded-[20px]"
      >
        <>
          <ModalHeader
            icon={<DollarSign className="h-6 w-6" />}
            color="#D97706"
            title="Adicionar crédito"
            subtitle={`Contrato liminar · saldo atual R$ ${fmt(contract.creditBalance)}`}
            onClose={() => setShowRecharge(false)}
            titleId="recharge-title"
          />
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <Field label="Valor a adicionar" required>
              <MoneyInput large accent="emerald" value={rechargeAmount.replace(',', '.')} onChange={setRechargeAmount} />
            </Field>
            <Field label="Motivo (opcional)">
              <input
                type="text"
                value={rechargeReason}
                onChange={(e) => setRechargeReason(e.target.value)}
                placeholder="Ex.: nova decisão judicial"
                className={inputClass('emerald')}
              />
            </Field>
          </div>
          <ModalFooter
            accent="emerald"
            onCancel={() => setShowRecharge(false)}
            onSubmit={() => handleRecharge()}
            submitting={rechargingLoading}
            submitDisabled={!(parseFloat(rechargeAmount.replace(',', '.')) > 0)}
            submitLabel="Confirmar"
            submittingLabel="Salvando..."
            summary={parseFloat(rechargeAmount.replace(',', '.')) > 0
              ? `Saldo: R$ ${fmt(contract.creditBalance)} → R$ ${fmt(contract.creditBalance + parseFloat(rechargeAmount.replace(',', '.')))}`
              : null}
          />
        </>
      </Modal>

      {/* ── Modal: Confirmar Geração ── */}
      {confirm.open && (() => {
        const selected = confirm.selectedSpecialties;
        const estSessions = confirm.allSpecialties
          .filter(s => selected.includes(s.key))
          .reduce((acc, s) => acc + s.slotsPerWeek * confirm.weeks, 0);
        const estCost = confirm.allSpecialties
          .filter(s => selected.includes(s.key))
          .reduce((acc, s) => acc + s.slotsPerWeek * confirm.weeks * s.sessionValue, 0);
        const totalPending = Object.values(confirm.pendingBySpecialty).reduce((a, b) => a + b, 0);

        return (
          <Modal
            open
            onClose={() => setConfirm({ open: false })}
            labelledBy="gen-title"
            zIndexClass="z-[1300]"
            panelClassName="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] bg-white text-left shadow-2xl sm:rounded-[20px]"
          >
            <>
            <ModalHeader
              icon={<Calendar className="h-6 w-6" />}
              color="#059669"
              title="Sessões do plano"
              subtitle="Organize a agenda e registre cancelamentos"
              onClose={() => setConfirm({ open: false })}
              titleId="gen-title"
            />
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">

              {/* Quantidade de semanas + data de início */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
                <div>
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Quantas semanas?</span>
                  <ChoiceChips
                    label="Quantas semanas"
                    fill
                    value={String(confirm.weeks)}
                    onChange={(v) => setConfirm(prev => (prev.open ? { ...prev, weeks: Number(v) } : prev))}
                    options={[2, 4, 8, 12, 24].map(n => ({ value: String(n), label: String(n) }))}
                  />
                </div>
                <label>
                  <span className="mb-1.5 block text-xs font-semibold text-gray-600">Gerar desde</span>
                  <input
                    type="date"
                    min={todayIsoDate()}
                    value={confirm.startDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfirm(prev => (prev.open ? { ...prev, startDate: value || todayIsoDate() } : prev));
                    }}
                    className={inputClass('emerald')}
                  />
                  <span className="mt-1 block text-xs text-slate-500">Cancelamentos existentes serão preservados</span>
                </label>
              </div>

              {/* Aviso sessões pendentes */}
              {!confirm.pendingLoading && totalPending > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <b>{totalPending} sessão(ões) sem completar</b> já agendada(s). Slots existentes serão mantidos — apenas datas/horários novos serão criados.
                  </p>
                </div>
              )}

              {/* Checkboxes de especialidades */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Especialidades a gerar:</p>
                <div className="space-y-2">
                  {confirm.allSpecialties.map(sp => {
                    const pending = confirm.pendingBySpecialty[sp.key] ?? 0;
                    const isChecked = selected.includes(sp.key);
                    return (
                      <label key={sp.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => setConfirm(prev => {
                            if (!prev.open) return prev;
                            const next = isChecked
                              ? prev.selectedSpecialties.filter(k => k !== sp.key)
                              : [...prev.selectedSpecialties, sp.key];
                            return { ...prev, selectedSpecialties: next };
                          })}
                          className="w-4 h-4 accent-indigo-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 capitalize">{sp.label}</p>
                          <p className="text-xs text-slate-500">{sp.slotsPerWeek}×/sem · R$ {fmt(sp.sessionValue)}/sessão</p>
                        </div>
                        {!confirm.pendingLoading && pending > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0">{pending} pend.</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* Resumo */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sessões estimadas:</span>
                  <span className="font-semibold text-slate-800">{estSessions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo estimado:</span>
                  <span className="font-semibold text-amber-700">R$ {fmt(estCost)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Saldo após (est.):</span>
                  <span className={`font-bold ${contract.creditBalance - estCost >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    R$ {fmt(contract.creditBalance - estCost)}
                  </span>
                </div>
              </div>

              {contract.creditBalance < estCost && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">Saldo insuficiente. Sessões serão criadas mas o crédito precisará ser recarregado antes da realização.</p>
                </div>
              )}

              {plan && <GenerationCancellationFlow specialties={confirm.selectedSpecialties}
                contextKey={JSON.stringify([confirm.weeks, confirm.startDate, confirm.selectedSpecialties])}
                disabled={confirm.selectedSpecialties.length === 0}
                onRun={(cancellations, dryRun) => liminarContractService.generateSessions(contract._id, plan._id, {
                  mode: 'append', weeks: confirm.weeks, startDate: confirm.startDate, specialties: confirm.selectedSpecialties, cancellations, dryRun,
                })}
                onApplied={() => { setConfirm({ open: false }); onRefresh(); toast.success('Sessões geradas e cancelamentos registrados.'); }} />}
            </div>
            </>
          </Modal>
        );
      })()}

      {/* ── Modal: Editar Agendamento (cockpit completo) ── */}
      {editingAppointment && (
        <AppointmentDetailModal
          isOpen={!!editingAppointment}
          onClose={() => { setEditingAppointment(null); onRefresh(); }}
          event={editingAppointment}
          doctors={[] as IDoctor[]}
          onCancelAppointment={async (id, reason, extras) => {
            await appointmentService.cancel(id, { reason, cancelRequester: extras?.cancelRequester, cancelRequestedAt: extras?.cancelRequestedAt, notifyPatient: extras?.notifyPatient });
            toast.success('Agendamento cancelado');
            setEditingAppointment(null);
            onRefresh();
          }}
          onCompleteAppointment={async (id, completeData) => {
            await completeLiminarAppointment(id, completeData, () => {
              toast.success('Atendimento realizado com sucesso');
              setEditingAppointment(null);
              onRefresh();
            });
          }}
          onEditAppointment={async (id, data) => {
            await appointmentService.update(id, data);
            toast.success('Agendamento atualizado');
            setEditingAppointment(null);
            onRefresh();
          }}
        />
      )}

      {/* ── Modal: Editar Terapia ── */}
      <Modal
        open={editTherapyModal.open}
        onClose={() => !savingTherapy && setEditTherapyModal(p => ({ ...p, open: false }))}
        labelledBy="edit-therapy-title"
        zIndexClass="z-[1300]"
        panelClassName="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] bg-white text-left shadow-2xl sm:rounded-[20px]"
      >
        <>
          <ModalHeader
            icon={<Pencil className="h-6 w-6" />}
            color="#059669"
            title="Editar terapia"
            subtitle={`${editTherapyModal.specialty.replace(/_/g, ' ')} · Contrato liminar`}
            onClose={() => setEditTherapyModal(p => ({ ...p, open: false }))}
            titleId="edit-therapy-title"
          />
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_11rem]">
              <Field label="Valor por sessão">
                <MoneyInput
                  large
                  accent="emerald"
                  value={editTherapyModal.sessionValue ? String(editTherapyModal.sessionValue) : ''}
                  onChange={(v) => setEditTherapyModal(p => ({ ...p, sessionValue: v === '' ? 0 : Number(v) }))}
                />
              </Field>
              <Field label="Duração">
                <select
                  value={editTherapyModal.sessionDurationMinutes}
                  onChange={(e) => setEditTherapyModal(p => ({ ...p, sessionDurationMinutes: Number(e.target.value) }))}
                  className={inputClass('emerald')}
                >
                  {[30, 40, 45, 50, 60, 90].concat([editTherapyModal.sessionDurationMinutes]).filter((v, i, a) => v && a.indexOf(v) === i).sort((x, y) => x - y).map(m => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Profissional">
              {modalDoctorsLoading ? (
                <div className="flex justify-center py-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
                </div>
              ) : (
                <select
                  value={editTherapyModal.doctorId}
                  onChange={(e) => setEditTherapyModal(p => ({ ...p, doctorId: e.target.value }))}
                  className={inputClass('emerald')}
                >
                  <option value="">Sem profissional</option>
                  {modalDoctors.map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                </select>
              )}
            </Field>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">Dias e horários da semana</span>
              <div className="space-y-3">
                {editTherapyModal.slots.map((slot, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <ChoiceChips
                      label={`Dia do horário ${i + 1}`}
                      fill
                      value={String(slot.dayOfWeek)}
                      onChange={(v) => setEditTherapyModal(p => ({ ...p, slots: p.slots.map((sl, si) => si === i ? { ...sl, dayOfWeek: v as any } : sl) }))}
                      options={[{ v: 1, l: 'Seg' }, { v: 2, l: 'Ter' }, { v: 3, l: 'Qua' }, { v: 4, l: 'Qui' }, { v: 5, l: 'Sex' }].map(d => ({ value: String(d.v), label: d.l }))}
                    />
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                      <input
                        type="time" value={slot.time}
                        aria-label={`Hora do horário ${i + 1}`}
                        onChange={(e) => setEditTherapyModal(p => ({ ...p, slots: p.slots.map((sl, si) => si === i ? { ...sl, time: e.target.value } : sl) }))}
                        className={`${inputClass('emerald')} flex-1`}
                      />
                      {editTherapyModal.slots.length > 1 && (
                        <button type="button" aria-label={`Remover horário ${i + 1}`} onClick={() => setEditTherapyModal(p => ({ ...p, slots: p.slots.filter((_, si) => si !== i) }))} className="rounded-lg p-2.5 text-rose-500 transition-colors hover:bg-rose-50">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setEditTherapyModal(p => ({ ...p, slots: [...p.slots, { dayOfWeek: '', time: '' }] }))}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar horário
              </button>
            </div>

            <Field label="Observações desta especialidade">
              <textarea
                value={editTherapyModal.notes}
                onChange={(e) => setEditTherapyModal(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                className={`${inputClass('emerald')} min-h-[72px] resize-none`}
                placeholder="Ex.: orientação parental, atendida pela responsável"
              />
            </Field>

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Sessões já confirmadas ou concluídas não serão alteradas.
            </p>
          </div>
          <ModalFooter
            accent="emerald"
            onCancel={() => setEditTherapyModal(p => ({ ...p, open: false }))}
            onSubmit={handleSaveTherapy}
            submitting={savingTherapy}
            submitLabel="Salvar alterações"
            submittingLabel="Salvando..."
            summary={[
              Number(editTherapyModal.sessionValue) > 0 ? `R$ ${fmt(Number(editTherapyModal.sessionValue))}` : null,
              `${editTherapyModal.slots.filter(sl => sl.dayOfWeek !== '' && sl.time).length}× por semana`,
            ].filter(Boolean).join(' · ')}
          />
        </>
      </Modal>

      {/* ── Modal: Criar Plano ── */}
      {showCreatePlan && (
        <CreatePlanModal
          contractId={contract._id}
          activePlan={plan}
          onClose={() => setShowCreatePlan(false)}
          onCreated={() => { setShowCreatePlan(false); onRefresh(); }}
        />
      )}

      {/* ── Modal: Sessões por Especialidade ── */}
      {specialtyModal.open && (() => {
        const isCanceled = (status: string) => status === 'canceled' || status === 'force_cancelled';
        const statusColor = (status: string) =>
          status === 'completed' ? '#10B981' :
          status === 'confirmed' ? '#3B82F6' :
          isCanceled(status) ? 'var(--fx-slate-400)' :
          '#F59E0B';
        const events = specialtyModal.sessions.map((s: any) => ({
          id: s._id,
          start: `${s.date.slice(0, 10)}T${s.time}`,
          backgroundColor: statusColor(s.operationalStatus),
          borderColor: statusColor(s.operationalStatus),
          extendedProps: { session: s },
        }));

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4" onClick={() => setSpecialtyModal((p) => ({ ...p, open: false }))}>
            <div role="dialog" aria-modal="true" aria-labelledby={`lim-sessions-${contract._id}`} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 text-left sm:rounded-xl shadow-2xl w-full h-full sm:h-auto max-w-full sm:max-w-[min(1000px,94vw)] max-h-[100dvh] sm:max-h-[min(90vh,920px)] flex flex-col">
              <div className="flex items-start sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <h3 id={`lim-sessions-${contract._id}`} className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    <span className="capitalize">Sessões · {specialtyModal.specialty.replace(/_/g, ' ')}</span>
                    {!specialtyModal.loading && (
                      <span className="ml-2 text-sm font-normal tabular-nums text-slate-500">
                        {specialtyModal.sessions.filter((x) => x.operationalStatus === 'completed').length} feitas · {specialtyModal.sessions.filter((x) => ['scheduled', 'confirmed', 'pre_agendado'].includes(x.operationalStatus)).length} agendadas
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} /> Realizada</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} /> Confirmada</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} /> Agendada</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--fx-slate-400)' }} /> Cancelada</span>
                  </div>
                </div>
                <button type="button" aria-label="Fechar" onClick={() => setSpecialtyModal((p) => ({ ...p, open: false }))}
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-5
                [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                {specialtyModal.loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : specialtyModal.sessions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">Nenhuma sessão agendada.</p>
                ) : (
                  <div
                    // Mesmo tratamento visual escopado do FullCalendar usado em
                    // PatientMiniCalendar (Convênio/Pacote) — aqui replicado como
                    // classes num wrapper próprio, já que o Liminar tem sua própria
                    // instância de FullCalendar (views/plugins diferentes, preservados).
                    className="[&_.fc]:font-sans
                      [&_.fc-toolbar]:flex [&_.fc-toolbar]:flex-wrap [&_.fc-toolbar]:items-center [&_.fc-toolbar]:gap-2 [&_.fc-toolbar]:mb-3
                      [&_.fc-toolbar-title]:text-[0.95rem] [&_.fc-toolbar-title]:sm:text-lg [&_.fc-toolbar-title]:font-bold [&_.fc-toolbar-title]:text-gray-800
                      [&_.fc-button]:!rounded-lg [&_.fc-button]:!shadow-none [&_.fc-button]:!border-gray-200 [&_.fc-button]:!bg-white [&_.fc-button]:!text-gray-600 [&_.fc-button]:!text-xs [&_.fc-button]:!font-semibold [&_.fc-button]:!px-2.5 [&_.fc-button]:!py-1.5 [&_.fc-button]:!capitalize
                      [&_.fc-button:hover]:!bg-gray-50
                      [&_.fc-button:focus]:!shadow-none
                      [&_.fc-button-active]:!bg-violet-600 [&_.fc-button-active]:!border-violet-600 [&_.fc-button-active]:!text-white
                      [&_.fc-daygrid-day-frame]:min-h-[76px]
                      dark:[&_.fc-toolbar-title]:text-slate-100 dark:[&_.fc-button]:!bg-slate-800 dark:[&_.fc-button]:!border-slate-700 dark:[&_.fc-button]:!text-slate-200
                      dark:[&_.fc-theme-standard_td]:!border-slate-700 dark:[&_.fc-theme-standard_th]:!border-slate-700 dark:[&_.fc-scrollgrid]:!border-slate-700
                      [&_.fc-col-header-cell-cushion]:py-2 [&_.fc-col-header-cell-cushion]:text-gray-500
                      [&_.fc-scrollgrid]:!rounded-lg [&_.fc-scrollgrid]:!border-gray-200
                      [&_.fc-event]:!border-0"
                    style={CALENDAR_THEME_VARS}
                  >
                    <FullCalendar
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek',
                      }}
                      locale={ptBR}
                      initialView="dayGridMonth"
                      initialDate={(() => {
                        // Abre no mês da próxima sessão (ou da última, se não houver futuras).
                        const now = Date.now();
                        const ts = events.map((e) => new Date(e.start).getTime()).filter(Number.isFinite);
                        const fut = ts.filter((t) => t >= now).sort((a, b) => a - b);
                        return fut.length ? new Date(fut[0]) : ts.length ? new Date(Math.max(...ts)) : undefined;
                      })()}
                      dayMaxEvents={2}
                      buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana' }}
                      events={events}
                      height="auto"
                      eventDisplay="block"
                      eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                      eventClassNames="cursor-pointer"
                      eventClick={(arg) => {
                        const session = arg.event.extendedProps.session;
                        setSpecialtyModal((p) => ({ ...p, open: false }));
                        setEditingAppointment(sessionToEvent(session));
                      }}
                      eventContent={(arg) => {
                        const session = arg.event.extendedProps.session;
                        const canceled = isCanceled(session?.operationalStatus);
                        return (
                          <div className={`flex flex-col gap-0.5 px-1.5 py-1 text-xs leading-tight overflow-hidden ${canceled ? 'opacity-80' : ''}`}>
                            <div className={`font-bold ${canceled ? 'line-through' : ''}`}>{arg.timeText}</div>
                            {session?.doctor?.fullName && (
                              <div className={`truncate opacity-90 ${canceled ? 'line-through' : ''}`}>{session.doctor.fullName}</div>
                            )}
                            <div className="whitespace-normal" title={canceled ? session?.cancelReason || 'Motivo não registrado' : undefined}>
                              {canceled ? `Cancelada${session?.canceledAt ? ` · ${new Date(session.canceledAt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })}` : ''}` : `R$ ${fmt(session?.sessionValue ?? 0)}`}
                            </div>
                            <AppointmentOrigin appointment={{ ...session, liminarSpecialtyNumber: session.liminarSpecialtyNumber || (plan ? Object.keys(plan.therapies ?? {}).indexOf(session.specialty) + 1 : undefined) }} />
                          </div>
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <InactivateEntityModal
        open={showInactivateModal}
        entityType="liminar"
        loading={isInactivating}
        onConfirm={handleInactivate}
        onClose={() => setShowInactivateModal(false)}
      />
    </div>
  );
}
