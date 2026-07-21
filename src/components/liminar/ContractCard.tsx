import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Scale,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ContractWithPlan } from '../../hooks/useLiminarContracts';
import { appointmentService } from '../../services/appointmentService';
import doctorService from '../../services/doctorService';
import liminarContractService, { ContractIntegrity } from '../../services/liminarContractService';
import { IDoctor, SelectedEvent } from '../../utils/types/types';
import { getSpecialtyTheme } from '../../constants/specialtyThemes';
import InactivateEntityModal from '../common/InactivateEntityModal';
import AppointmentDetailModal from '../calendar/appointmentDetailModal';
import CreatePlanModal from './CreatePlanModal';

// Cor de "faltando/pendente de agenda" — neutra de propósito: não deve competir visualmente
// com laranja/vermelho de risco real (saldo baixo, vencimento), que têm significado diferente.
const NEUTRAL_MISSING_COLOR = { bar: '#94A3B8', text: '#475569', dot: '#94A3B8' };

const DAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

const PALETTES = [
  { from: '#B45309', to: '#D97706', bar: 'linear-gradient(90deg,#D97706aa,#D97706)', icon: '#D97706', badge: '#FFF7ED', badgeText: '#92400E', badgeBorder: '#FDE68A' },
  { from: '#0E7490', to: '#0891B2', bar: 'linear-gradient(90deg,#0891B2aa,#0891B2)', icon: '#0891B2', badge: '#ECFEFF', badgeText: '#164E63', badgeBorder: '#A5F3FC' },
  { from: '#6D28D9', to: '#7C3AED', bar: 'linear-gradient(90deg,#7C3AEDaa,#7C3AED)', icon: '#7C3AED', badge: '#F5F3FF', badgeText: '#4C1D95', badgeBorder: '#DDD6FE' },
  { from: '#047857', to: '#059669', bar: 'linear-gradient(90deg,#059669aa,#059669)', icon: '#059669', badge: '#ECFDF5', badgeText: '#064E3B', badgeBorder: '#A7F3D0' },
  { from: '#B91C1C', to: '#DC2626', bar: 'linear-gradient(90deg,#DC2626aa,#DC2626)', icon: '#DC2626', badge: '#FEF2F2', badgeText: '#7F1D1D', badgeBorder: '#FECACA' },
  { from: '#1D4ED8', to: '#2563EB', bar: 'linear-gradient(90deg,#2563EBaa,#2563EB)', icon: '#2563EB', badge: '#EFF6FF', badgeText: '#1E3A8A', badgeBorder: '#BFDBFE' },
];

interface Props {
  data: ContractWithPlan;
  colorIndex?: number;
  onRefresh: () => void;
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
  weeks: 4 | 8;
  allSpecialties: SpecialtyMeta[];
  selectedSpecialties: string[];
  pendingBySpecialty: Record<string, number>;
  pendingLoading: boolean;
} | { open: false };

export default function ContractCard({ data, colorIndex = 0, onRefresh }: Props) {
  const { contract, plan, planError, committed } = data;
  const palette = PALETTES[colorIndex % PALETTES.length];

  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [generating, setGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [projectionDetailsExpanded, setProjectionDetailsExpanded] = useState(false);
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
  const barColor = palette.bar;

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
  const statusColor = contract.status === 'active'
    ? { text: '#2E7A5E', bg: '#EFF9F6', border: '#C6E6DA' }
    : contract.status === 'exhausted'
      ? { text: '#C75146', bg: '#FDECEA', border: '#F5C6C2' }
      : { text: '#8A99B0', bg: '#F1F5F9', border: '#DDE4EE' };

  async function openConfirm(weeks: 4 | 8) {
    if (!plan) return;
    const allSpecialties: SpecialtyMeta[] = Object.entries(plan.therapies ?? {}).map(([key, cfg]: [string, any]) => ({
      key,
      label: key.replace(/_/g, ' '),
      slotsPerWeek: (cfg.slots ?? []).length,
      sessionValue: cfg.sessionValue ?? 0,
    }));
    setConfirm({
      open: true, weeks,
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
        specialties: confirm.selectedSpecialties,
      });

      if (res.created > 0) {
        toast.success(`✅ ${res.created} sessões criadas  |  💰 R$ ${fmt(res.totalCost)}`);
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

  async function handleRecharge(e: React.FormEvent) {
    e.preventDefault();
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
      insuranceGuideId: s.insuranceGuide?.toString?.() ?? s.insuranceGuideId ?? null,
      insurancePlan: s.insurancePlan ?? null,
      liminarContract: s.liminarContract ?? null,
      package: s.package ?? null,
      __isPreAgendamento: s.operationalStatus === 'pre_agendado',
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
      className="relative rounded-3xl overflow-hidden transition-all duration-200"
      style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* ══ Camada 1: Header — identidade do contrato ══ */}
      <div
        className="px-5 pt-4 pb-4 relative"
        style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Scale className="w-4 h-4 flex-shrink-0 text-white/90" />
            <span className="font-bold text-sm text-white">Contrato Liminar</span>
            {contract.processNumber && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                Proc.: {lastDigits(contract.processNumber)}
              </span>
            )}
            {contract.court && (
              <span className="text-xs px-2 py-0.5 rounded-full text-white/80" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {contract.court}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {contract.status === 'active' ? (
              <button
                type="button"
                onClick={() => setShowInactivateModal(true)}
                title="Clique para inativar este contrato"
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                {statusLabel}
              </button>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full text-white" style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}>
                {statusLabel}
              </span>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-1 rounded-full transition-colors hover:bg-white/15"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 z-20 rounded-2xl shadow-xl py-1 min-w-max"
                  style={{ top: '110%', background: '#fff', border: '1px solid #EDF2F7', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ Camada 2: Summary — financeiro do contrato ══ */}
      <div className="px-5 py-4" style={{ background: palette.badge }}>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <span className="block text-xs font-medium mb-1" style={{ color: '#5B6E8C' }}>Disponível</span>
            <span className="font-bold text-base" style={{ color: available >= 0 ? '#2E7A5E' : '#C75146' }}>R$ {fmt(available)}</span>
          </div>
          <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <span className="block text-xs font-medium mb-1" style={{ color: '#5B6E8C' }}>Total</span>
            <span className="font-bold text-base" style={{ color: '#1A2C3E' }}>R$ {fmt(contract.totalCredit)}</span>
          </div>
        </div>

        <div className="flex justify-between text-xs mb-3" style={{ color: '#8A99B0' }}>
          <span>Utilizado: <b style={{ color: '#1A2C3E' }}>R$ {fmt(contract.usedCredit)}</b></span>
          <span>Comprom.: <b style={{ color: '#ED6C02' }}>R$ {fmt(committed?.committed ?? 0)}</b></span>
        </div>

        <div className="relative w-full rounded-full overflow-hidden" style={{ height: 16, background: '#E9EEF2' }}>
          <div style={{ width: `${balancePct}%`, height: '100%', background: barColor, borderRadius: 9999, transition: 'width 0.5s' }} />
          <span
            className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
            style={{ color: balancePct > 45 ? '#fff' : '#1A2C3E' }}
          >
            {balancePct.toFixed(0)}% disponível
          </span>
        </div>

      </div>

      {/* ══ Camada 2b: Previsão — painel de decisão, separado do saldo atual ══ */}
      {committed?.projection && (() => {
        const proj = committed.projection;
        const confidenceLabel = proj.confidence === 'high' ? 'alta' : proj.confidence === 'medium' ? 'média' : 'baixa';
        const confidenceDot = proj.confidence === 'high' ? '#10B981' : proj.confidence === 'medium' ? '#F59E0B' : '#EF4444';
        const confidenceColor = proj.confidence === 'high'
          ? { bg: '#D1FAE5', text: '#065F46' }
          : proj.confidence === 'medium'
            ? { bg: '#FEF3C7', text: '#92400E' }
            : { bg: '#FEE2E2', text: '#991B1B' };
        const methodologyLabel = proj.methodology === 'scheduled_plan'
          ? 'agenda confirmada'
          : `histórico das últimas ${proj.sampleWeeks} semanas`;
        const startLabel = proj.treatmentStartDate
          ? new Date(proj.treatmentStartDate).toLocaleDateString('pt-BR')
          : '—';
        const endLabel = new Date(proj.estimatedExhaustionDate).toLocaleDateString('pt-BR');
        const roundedRemaining = Math.round(proj.remainingSessions);

        return (
          <div className="px-5 py-4 border-t" style={{ borderColor: '#EDF2F7', background: '#FAFBFD' }}>
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
                <span className="block text-[10px] font-medium uppercase tracking-wide" style={{ color: '#A0AABF' }}>Ritmo atual</span>
                <span className="text-sm font-semibold" style={{ color: '#1A2C3E' }}>{proj.averageSessionsPerWeek} sess./sem</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wide" style={{ color: '#A0AABF' }}>Consumo/sem</span>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#1A2C3E' }}>R$ {fmt(proj.weeklyConsumption)}</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium uppercase tracking-wide" style={{ color: '#A0AABF' }}>Restantes</span>
                <span className="text-sm font-semibold" style={{ color: '#1A2C3E' }}>≈{roundedRemaining} sessões</span>
              </div>
            </div>

            <div className="text-xs mb-1" style={{ color: '#A0AABF' }}>Base: {methodologyLabel}</div>

            <button
              onClick={() => setProjectionDetailsExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1 mt-1 py-1 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: '#8A99B0' }}
            >
              Detalhes da projeção
              <ChevronDown
                className="w-3 h-3 transition-transform duration-200"
                style={{ transform: projectionDetailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {projectionDetailsExpanded && (
              <div className="text-xs text-center mt-1" style={{ color: '#8A99B0' }}>
                Período analisado: {startLabel} até {endLabel}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Gatilho do accordion: dentro do card, na borda entre Summary e Breakdown ── */}
      <button
        onClick={() => setPlanExpanded(v => !v)}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-b transition-colors hover:bg-slate-50"
        style={{ borderColor: '#EDF2F7', color: '#5B6E8C' }}
      >
        <span className="text-xs font-semibold">
          {planExpanded ? 'Ocultar plano terapêutico' : 'Ver plano terapêutico'}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: planExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* ══ Camada 3: Breakdown — plano terapêutico por especialidade (accordion, controlado pelo header) ══ */}
      {planExpanded && (
        <div className="p-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4" style={{ color: '#2E7A5E' }} />
              <span className="font-bold text-sm" style={{ color: '#1A2C3E' }}>
                {plan ? `Plano Terapêutico (v${plan.version})` : 'Plano Terapêutico'}
              </span>
              {integrity && (() => {
                const pct = integrity.summary.integrityPercent;
                const color = pct >= 95 ? { bg: '#D1FAE5', text: '#065F46' }
                  : pct >= 75 ? { bg: '#FEF3C7', text: '#92400E' }
                  : { bg: '#FEE2E2', text: '#991B1B' };
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

          {/* ── Resumo de sessões ── */}
          {integrity && (() => {
            const { completed, pending, missing, expected } = integrity.summary;
            const pctComp    = expected > 0 ? (completed / expected) * 100 : 0;
            const pctPend    = expected > 0 ? (pending   / expected) * 100 : 0;
            const pctMissing = expected > 0 ? (missing   / expected) * 100 : 0;
            return (
              <div className="mb-3 rounded-xl p-3" style={{ background: '#F8FAFE', border: '1px solid #EDF2F7' }}>
                {/* Barra empilhada */}
                <div className="flex rounded-full overflow-hidden mb-2" style={{ height: 10, background: '#E9EEF2' }}>
                  <div style={{ width: `${pctComp}%`,    background: '#10B981', transition: 'width 0.5s' }} title={`Realizadas: ${completed}`} />
                  <div style={{ width: `${pctPend}%`,    background: '#6366F1', transition: 'width 0.5s' }} title={`Agendadas: ${pending}`} />
                  <div style={{ width: `${pctMissing}%`, background: NEUTRAL_MISSING_COLOR.bar, transition: 'width 0.5s' }} title={`Faltando: ${missing}`} />
                </div>
                {/* Legenda em linha */}
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                    <span style={{ color: '#065F46' }}><b>{completed}</b> realizadas</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#6366F1' }} />
                    <span style={{ color: '#3730A3' }}><b>{pending}</b> agendadas</span>
                  </span>
                  {missing > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: NEUTRAL_MISSING_COLOR.dot }} />
                      <span style={{ color: NEUTRAL_MISSING_COLOR.text }}><b>{missing}</b> faltando</span>
                    </span>
                  )}
                </div>
                <div className="text-right text-xs mt-1" style={{ color: '#A0AABF' }}>
                  de <b>{expected}</b> esperadas
                </div>
              </div>
            );
          })()}

          {plan ? (
            <>
                <div className="space-y-2 mb-2">
                  {Object.entries(plan.therapies ?? {}).map(([specialty, config]: [string, any]) => {
                    const intSp = integrity?.specialties?.[specialty];
                    const completed  = intSp?.completed ?? 0;
                    const generated  = intSp?.generated ?? 0;
                    const missing    = intSp?.missing   ?? 0;
                    const expected   = intSp?.expected  ?? 0;
                    const scheduled  = generated - completed;
                    const pctComp    = expected > 0 ? Math.min((completed / expected) * 100, 100) : 0;
                    const pctPend    = expected > 0 ? Math.min((scheduled / expected) * 100, 100 - pctComp) : 0;
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
                            {specialty.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs" style={{ color: '#8A99B0' }}>
                              {(config.slots ?? []).length}×/sem · R$ {fmt(config.sessionValue ?? 0)}
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
                              title={`Esperado: ${expected} | Realizado: ${completed} | Agendado: ${scheduled} | Faltando: ${missing}`}
                            >
                              <div style={{ width: `${pctComp}%`, background: '#10B981', transition: 'width 0.5s' }} />
                              <div style={{ width: `${pctPend}%`, background: '#6366F1', transition: 'width 0.5s' }} />
                              {missing > 0 && (
                                <div style={{ width: `${Math.min((missing / expected) * 100, 100 - pctComp - pctPend)}%`, background: NEUTRAL_MISSING_COLOR.bar, transition: 'width 0.5s' }} />
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10B981' }} />
                                <span style={{ color: '#065F46' }}><b>{completed}</b> feitas</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#6366F1' }} />
                                <span style={{ color: '#3730A3' }}><b>{scheduled}</b> agend.</span>
                              </span>
                              {missing > 0 ? (
                                <span className="flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: NEUTRAL_MISSING_COLOR.dot }} />
                                  <span style={{ color: NEUTRAL_MISSING_COLOR.text }}><b>{missing}</b> falt.</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#D1FAE5', color: '#065F46' }}>
                                  ✓ agenda ok
                                </span>
                              )}
                              <span className="ml-auto text-xs" style={{ color: '#A0AABF' }}>
                                {completed}/{expected}
                              </span>
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
                            className="w-3 h-3 transition-transform duration-200"
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
                    onClick={() => openConfirm(4)}
                    disabled={generating}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #1B4D6E 0%, #2563EB 100%)' }}
                  >
                    {generating ? '...' : <><Zap className="w-3 h-3 inline mr-1" />Gerar 4 semanas</>}
                  </button>
                  <button
                    onClick={() => openConfirm(8)}
                    disabled={generating}
                    className="flex-1 py-2 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%)' }}
                  >
                    {generating ? '...' : <><Zap className="w-3 h-3 inline mr-1" />Gerar 8 semanas</>}
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
      {showRecharge && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Adicionar crédito</h3>
              <button onClick={() => setShowRecharge(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecharge} className="space-y-3">
              <input
                type="text" inputMode="decimal" placeholder="Valor (R$)"
                value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-slate-50"
                required
              />
              <input
                type="text" placeholder="Motivo (opcional)"
                value={rechargeReason} onChange={(e) => setRechargeReason(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-slate-50"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRecharge(false)}
                  className="flex-1 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={rechargingLoading}
                  className="flex-1 py-2.5 text-sm text-white rounded-xl font-medium disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
                  {rechargingLoading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Gerar sessões — {confirm.weeks} semanas</h3>
                  <p className="text-xs text-slate-500">A partir de hoje, com o plano atual</p>
                </div>
                <button onClick={() => setConfirm({ open: false })} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
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
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-4 border border-slate-100">
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

              <div className="flex gap-3">
                <button onClick={() => setConfirm({ open: false })}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={selected.length === 0}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #1B4D6E 0%, #2563EB 100%)' }}>
                  <CheckCircle className="w-4 h-4" /> Gerar sessões
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Editar Agendamento (cockpit completo) ── */}
      {editingAppointment && (
        <AppointmentDetailModal
          isOpen={!!editingAppointment}
          onClose={() => { setEditingAppointment(null); onRefresh(); }}
          event={editingAppointment}
          doctors={[] as IDoctor[]}
          onCancelAppointment={async (id, reason) => {
            await appointmentService.cancel(id, { reason });
            toast.success('Agendamento cancelado');
            setEditingAppointment(null);
            onRefresh();
          }}
          onCompleteAppointment={async (_id, _data) => {
            toast.info('Use a tela de agenda para completar a sessão');
            setEditingAppointment(null);
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
      {editTherapyModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Cabeçalho com gradiente, igual SessionModal */}
            <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white relative flex-shrink-0">
              <button
                onClick={() => setEditTherapyModal(p => ({ ...p, open: false }))}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                  <Pencil className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Editar terapia</h3>
                  <p className="text-emerald-100 mt-1 capitalize">{editTherapyModal.specialty.replace(/_/g, ' ')}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Profissional */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
                <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Profissional</span>
                </label>
                {modalDoctorsLoading ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                ) : (
                  <select
                    value={editTherapyModal.doctorId}
                    onChange={(e) => setEditTherapyModal(p => ({ ...p, doctorId: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="">Sem profissional</option>
                    {modalDoctors
                      .filter(d => {
                        if (!editTherapyModal.specialty) return true;
                        const target = editTherapyModal.specialty.toLowerCase();
                        const allowed = [d.specialty, ...(d.specialties || [])].map(s => (s || '').toLowerCase());
                        return allowed.includes(target);
                      })
                      .map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                  </select>
                )}
              </div>

              {/* Valor por sessão + Duração */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  Valor e duração
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-600">Por sessão (R$)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={editTherapyModal.sessionValue}
                      onChange={(e) => setEditTherapyModal(p => ({ ...p, sessionValue: Number(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-gray-600">Duração (min)</label>
                    <input
                      type="number" min="15" max="180"
                      value={editTherapyModal.sessionDurationMinutes}
                      onChange={(e) => setEditTherapyModal(p => ({ ...p, sessionDurationMinutes: Number(e.target.value) }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Horários */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Horários semanais</span>
                </label>
                <div className="space-y-2">
                  {editTherapyModal.slots.map((slot, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => setEditTherapyModal(p => ({ ...p, slots: p.slots.map((s, si) => si === i ? { ...s, dayOfWeek: e.target.value as any } : s) }))}
                        className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Dia</option>
                        {[{v:1,l:'Segunda'},{v:2,l:'Terça'},{v:3,l:'Quarta'},{v:4,l:'Quinta'},{v:5,l:'Sexta'}].map(d => (
                          <option key={d.v} value={d.v}>{d.l}</option>
                        ))}
                      </select>
                      <input
                        type="time" value={slot.time}
                        onChange={(e) => setEditTherapyModal(p => ({ ...p, slots: p.slots.map((s, si) => si === i ? { ...s, time: e.target.value } : s) }))}
                        className="w-28 p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {editTherapyModal.slots.length > 1 && (
                        <button type="button" onClick={() => setEditTherapyModal(p => ({ ...p, slots: p.slots.filter((_, si) => si !== i) }))} className="text-rose-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEditTherapyModal(p => ({ ...p, slots: [...p.slots, { dayOfWeek: '', time: '' }] }))}
                  className="mt-3 text-xs text-blue-700 font-semibold flex items-center gap-1 hover:text-blue-900"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar horário
                </button>
              </div>

              {/* Observações */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Observações desta especialidade
                </label>
                <textarea
                  value={editTherapyModal.notes}
                  onChange={(e) => setEditTherapyModal(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Ex: orientação parental, atendida pela responsável..."
                />
              </div>

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Sessões já confirmadas/completadas não serão alteradas.
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditTherapyModal(p => ({ ...p, open: false }))}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTherapy}
                disabled={savingTherapy}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  savingTherapy
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {savingTherapy ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingTherapy ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          isCanceled(status) ? '#94A3B8' :
          '#F59E0B';
        const events = specialtyModal.sessions.map((s: any) => ({
          id: s._id,
          start: `${s.date.slice(0, 10)}T${s.time}`,
          backgroundColor: statusColor(s.operationalStatus),
          borderColor: statusColor(s.operationalStatus),
          extendedProps: { session: s },
        }));

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-slate-800 capitalize">Sessões — {specialtyModal.specialty.replace(/_/g, ' ')}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} /> Realizada</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} /> Confirmada</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} /> Agendada</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#94A3B8' }} /> Cancelada</span>
                  </div>
                </div>
                <button onClick={() => setSpecialtyModal((p) => ({ ...p, open: false }))}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                {specialtyModal.loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : specialtyModal.sessions.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-10">Nenhuma sessão agendada.</p>
                ) : (
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    headerToolbar={{
                      left: 'prev,next today',
                      center: 'title',
                      right: 'dayGridMonth,timeGridWeek',
                    }}
                    locale={ptBR}
                    initialView="dayGridMonth"
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
                        <div className={`px-1 py-0.5 text-xs leading-tight overflow-hidden ${canceled ? 'opacity-80' : ''}`}>
                          <div className={`font-semibold ${canceled ? 'line-through' : ''}`}>{arg.timeText}</div>
                          {session?.doctor?.fullName && (
                            <div className={`truncate opacity-90 ${canceled ? 'line-through' : ''}`}>{session.doctor.fullName}</div>
                          )}
                          <div className="opacity-90">{canceled ? 'Cancelada' : `R$ ${fmt(session?.sessionValue ?? 0)}`}</div>
                        </div>
                      );
                    }}
                  />
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
