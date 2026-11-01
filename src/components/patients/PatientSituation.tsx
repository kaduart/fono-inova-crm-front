// Faixa de situação do paciente + card "Próximas ações" (etapa 3 da auditoria
// do painel do paciente). Regras:
// - Valores financeiros vêm SEMPRE do back (PatientsView). Aqui só se lê e se
//   decide o que mostrar; nada é recalculado (DOMAIN_INVARIANTS: KPIs só no back).
// - Guias, contratos de liminar e pacotes são lidos das rotas v2 já usadas
//   pelas abas; os alertas de guia vêm do lifecycle calculado pelo back.
import {
  AlertTriangle, ArrowRight, CalendarClock, CalendarPlus, CheckCircle2, Copy,
  CreditCard, FileWarning, Gavel, Package, Phone, ReceiptText, UserRound, Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '../../utils/toast';
import { getGuides, type InsuranceGuide } from '../../services/insuranceGuideApi';
import liminarContractService, { type LiminarContract } from '../../services/liminarContractService';
import packageService from '../../services/packageService';
import { subscribeToCacheInvalidation } from '../../utils/cacheManager';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import AnimatedValue from '../ui/insight/AnimatedValue';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
const DAY = 86_400_000;
const CANCELED = new Set(['canceled', 'cancelled', 'cancelado']);

function daysUntil(dateLike?: string | null): number | null {
  if (!dateLike) return null;
  const d = new Date(String(dateLike).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / DAY);
}

function ageFrom(dob?: string): string | null {
  if (!dob) return null;
  const [y, m, d] = String(dob).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years -= 1;
  if (years < 0 || years > 120) return null;
  if (years >= 2) return `${years} anos`;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) - (now.getDate() < d ? 1 : 0);
  months = Math.max(0, months);
  return years === 1 ? '1 ano' : `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

function initials(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

// ─────────────────────────────────────────────────────────────
// Dados
// ─────────────────────────────────────────────────────────────

export interface PackageLike {
  _id: string; status?: string; type?: string; totalSessions?: number; sessionsDone?: number;
  remaining?: number; specialty?: string; sessionType?: string;
}
type PackageListResponse = PackageLike[] | { packages?: PackageLike[]; data?: { packages?: PackageLike[] } } | null | undefined;
export const toPackageList = (raw: PackageListResponse): PackageLike[] =>
  (Array.isArray(raw) ? raw : raw?.packages || raw?.data?.packages || []).filter(Boolean);

interface AppointmentLike {
  date?: string; time?: string; operationalStatus?: string; doctorName?: string;
  doctor?: { fullName?: string; name?: string; specialty?: string };
  specialty?: string; sessionType?: string; serviceType?: string;
}
type Money = number | undefined;
export interface PatientLike {
  fullName?: string; phone?: string; dateOfBirth?: string; legalGuardian?: string; guardianName?: string;
  responsible?: { name?: string }; healthPlan?: { name?: string }; tags?: string[];
  totalPendingParticular?: Money; convenioPendingAwaitingBilling?: Money; convenioPendingBilled?: Money; netAvailableCredit?: Money;
  stats?: { totalPendingParticularNet?: Money; totalPendingConvenioAwaitingBilling?: Money; totalPendingConvenioBilled?: Money; netAvailableCredit?: Money };
}
type AlertMeta = { remainingDays?: number; remainingSessions?: number };

export interface SituationData {
  guides: InsuranceGuide[];
  contracts: LiminarContract[];
  packages: PackageLike[];
  loaded: boolean;
}

export function usePatientSituation(patientId?: string): SituationData {
  const [data, setData] = useState<SituationData>({ guides: [], contracts: [], packages: [], loaded: false });

  const load = useCallback(async () => {
    if (!patientId) return;
    // Cada fonte falha sozinha: o card mostra o que conseguiu ler.
    const [g, c, p] = await Promise.allSettled([
      getGuides(patientId),
      liminarContractService.list(patientId),
      packageService.listPackages({ page: 1, limit: 50, patientId }),
    ]);
    const pkgs = toPackageList(p.status === 'fulfilled' ? (p.value as PackageListResponse) : null);
    setData({
      guides: g.status === 'fulfilled' ? g.value : [],
      contracts: c.status === 'fulfilled' ? c.value : [],
      // Pacote liminar é legado (migrado para LiminarContract): fica fora.
      packages: pkgs.filter((pkg) => pkg.type !== 'liminar'),
      loaded: true,
    });
  }, [patientId]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('session:completed', handler);
    window.addEventListener('appointment:cancelled', handler);
    const unsub = subscribeToCacheInvalidation('payments', handler);
    return () => {
      window.removeEventListener('session:completed', handler);
      window.removeEventListener('appointment:cancelled', handler);
      unsub();
    };
  }, [load]);

  return data;
}

/** Próxima sessão real: a lista de agendamentos tem horário e profissional. */
export function findNextSession(appointments: AppointmentLike[], fallback?: AppointmentLike) {
  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const future = (appointments || [])
    .filter((a) => a?.date && !CANCELED.has(a.operationalStatus || ''))
    .map((a) => ({ a, key: `${String(a.date).slice(0, 10)} ${a.time || '23:59'}` }))
    .filter(({ key }) => key >= nowKey)
    .sort((x, y) => x.key.localeCompare(y.key));
  const a = future[0]?.a;
  if (a) {
    return {
      date: String(a.date).slice(0, 10),
      time: a.time as string | undefined,
      doctorName: a.doctor?.fullName || a.doctor?.name || a.doctorName,
      specialty: a.specialty || a.sessionType,
      serviceType: a.serviceType,
      count: future.length,
    };
  }
  if (fallback?.date) {
    return {
      date: String(fallback.date).slice(0, 10),
      time: fallback.time,
      doctorName: fallback.doctorName || fallback.doctor?.fullName || fallback.doctor?.name,
      specialty: fallback.doctor?.specialty,
      serviceType: fallback.serviceType,
      count: 1,
    };
  }
  return null;
}

function formatNext(n: ReturnType<typeof findNextSession>) {
  if (!n) return null;
  const d = new Date(n.date + 'T12:00:00');
  const dd = daysUntil(n.date);
  const when = dd === 0 ? 'Hoje' : dd === 1 ? 'Amanhã'
    : d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  return { when, time: n.time, who: n.doctorName, what: n.serviceType === 'evaluation' ? 'Avaliação' : cap(n.specialty) || 'Sessão' };
}

// ─────────────────────────────────────────────────────────────
// Faixa de situação (aparece em todas as abas)
// ─────────────────────────────────────────────────────────────

interface StripProps {
  patient: PatientLike | null | undefined;
  situation: SituationData;
  nextSession: ReturnType<typeof findNextSession>;
  onReceive: () => void;
  onSchedule: () => void;
  onGoTab: (tab: string) => void;
}

export function PatientSituationStrip({ patient, situation, nextSession, onReceive, onSchedule, onGoTab }: StripProps) {
  const pi = patient || {};
  const particular = pi.stats?.totalPendingParticularNet ?? pi.totalPendingParticular ?? 0;
  const convAwaiting = pi.stats?.totalPendingConvenioAwaitingBilling ?? pi.convenioPendingAwaitingBilling ?? 0;
  const convBilled = pi.stats?.totalPendingConvenioBilled ?? pi.convenioPendingBilled ?? 0;
  const credit = pi.netAvailableCredit ?? pi.stats?.netAvailableCredit ?? 0;

  const phone: string = pi.phone || '';
  const digits = phone.replace(/\D/g, '');
  const waDigits = digits.length >= 12 ? digits : digits.length >= 10 ? `55${digits}` : '';
  const age = ageFrom(pi.dateOfBirth);
  const guardian = pi.legalGuardian || pi.responsible?.name || pi.guardianName;

  const activeGuides = situation.guides.filter((g) => g.status === 'active');
  const activeContracts = situation.contracts.filter((c) => c.status === 'active');
  const activePackages = situation.packages.filter((p) => p.status === 'active' || p.status === 'pending');
  const planName = pi.healthPlan?.name || activeGuides[0]?.insurance;
  const liminarBalance = activeContracts.reduce((s, c) => s + (c.creditBalance || 0), 0);
  const next = formatNext(nextSession);
  const tags: string[] = Array.isArray(pi.tags) ? pi.tags : [];

  const copyPhone = async () => {
    try { await navigator.clipboard.writeText(phone); toast.success('Telefone copiado'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  return (
    <section aria-label="Situação do paciente" className="relative text-left mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Identidade */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-base font-extrabold text-white">
            {initials(pi.fullName)}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold text-slate-900 sm:text-xl">{pi.fullName || 'Paciente'}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {age && <span>{age}</span>}
              {guardian && <span className="inline-flex items-center gap-1"><UserRound size={12} />Resp.: {guardian}</span>}
              {phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={12} />
                  {waDigits ? (
                    <a href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 hover:underline" title="Abrir conversa no WhatsApp">{phone}</a>
                  ) : <span>{phone}</span>}
                  <button type="button" onClick={copyPhone} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Copiar telefone"><Copy size={12} /></button>
                </span>
              ) : (
                <button type="button" onClick={() => onGoTab('Profile')} className="font-semibold text-amber-700 hover:underline">Sem telefone: completar cadastro</button>
              )}
            </div>
            {/* Cobertura + classificações */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip tone="slate">Particular</Chip>
              {planName && <Chip tone="blue" onClick={() => onGoTab('Insurance Guides')}>Convênio · {planName}</Chip>}
              {activeContracts.length > 0 && <Chip tone="purple" onClick={() => onGoTab('Liminar')}>Liminar</Chip>}
              {activePackages.length > 0 && <Chip tone="emerald" onClick={() => onGoTab('Management Packages')}>{activePackages.length === 1 ? 'Pacote ativo' : `${activePackages.length} pacotes ativos`}</Chip>}
              {tags.map((t) => <Chip key={t} tone={t === 'debito' ? 'red' : t === 'vip' ? 'purple' : 'slate'}>{t}</Chip>)}
            </div>
          </div>
        </div>

        {/* Números + ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch lg:shrink-0">
          <dl className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Figure label="Família deve" value={brl(particular)} tone={particular > 0 ? 'amber' : 'muted'} />
            <Figure
              label="Convênio a receber"
              value={brl(convAwaiting + convBilled)}
              hint={convAwaiting + convBilled > 0 ? `${brl(convAwaiting)} a faturar · ${brl(convBilled)} faturado` : undefined}
              tone={convAwaiting + convBilled > 0 ? 'blue' : 'muted'}
            />
            {credit > 0 && <Figure label="Crédito" value={brl(credit)} tone="emerald" />}
            {activeContracts.length > 0 && <Figure label="Saldo liminar" value={brl(liminarBalance)} tone="purple" />}
            <Figure
              label="Próxima sessão"
              value={next ? `${next.when}${next.time ? ` ${next.time}` : ''}` : 'Sem agenda'}
              hint={next ? [next.what, next.who].filter(Boolean).join(' · ') : undefined}
              tone={next ? 'slate' : 'amber'}
            />
          </dl>
          <div className="flex gap-2 sm:flex-col">
            <button
              onClick={onReceive}
              title="Sessões em aberto e baixa de pagamento"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              <CreditCard size={16} /> Receber
            </button>
            <button
              onClick={onSchedule}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <CalendarPlus size={16} /> Agendar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const CHIP: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  purple: 'bg-violet-50 text-violet-700 ring-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
};

function Chip({ tone, children, onClick }: { tone: string; children: React.ReactNode; onClick?: () => void }) {
  const cls = `inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ring-1 ${CHIP[tone]}`;
  return onClick
    ? <button type="button" onClick={onClick} className={`${cls} hover:brightness-95`}>{children}</button>
    : <span className={cls}>{children}</span>;
}

const FIG: Record<string, string> = {
  amber: 'text-amber-700', blue: 'text-blue-700', emerald: 'text-emerald-700',
  purple: 'text-violet-700', slate: 'text-slate-900', muted: 'text-slate-400',
};

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 sm:min-w-[7.5rem]">
      <dt className="text-3xs font-bold uppercase tracking-widest text-slate-400">{label}</dt>
      <dd className={`mt-0.5 truncate text-sm font-extrabold tabular-nums ${FIG[tone]}`}><AnimatedValue value={value} /></dd>
      {hint && <dd className="truncate text-3xs text-slate-500" title={hint}>{hint}</dd>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Próximas ações (lógica comercial)
// ─────────────────────────────────────────────────────────────

type Severity = 'high' | 'medium' | 'info' | 'good';
interface NextAction {
  id: string;
  severity: Severity;
  icon: React.ReactNode;
  title: string;
  detail?: string;
  cta: string;
  onClick: () => void;
}

interface ActionsProps extends StripProps {
  totalAppointments: number;
}

const GUIDE_ALERT_TEXT: Record<string, (m: AlertMeta) => string> = {
  EXPIRED: () => 'venceu',
  EXPIRING_SOON: (m) => (m?.remainingDays != null ? `vence em ${m.remainingDays} dias` : 'vence em breve'),
  AUTHORIZATION_EXPIRED: () => 'autorização vencida',
  AUTHORIZATION_EXPIRING_SOON: (m) => (m?.remainingDays != null ? `autorização vence em ${m.remainingDays} dias` : 'autorização vence em breve'),
  EXHAUSTED: () => 'sessões esgotadas',
  LOW_SESSIONS: (m) => (m?.remainingSessions != null ? `restam ${m.remainingSessions} sessões` : 'poucas sessões restantes'),
};

export function buildNextActions(p: ActionsProps): NextAction[] {
  const pi = p.patient || {};
  const out: NextAction[] = [];
  const particular = pi.stats?.totalPendingParticularNet ?? pi.totalPendingParticular ?? 0;
  const convAwaiting = pi.stats?.totalPendingConvenioAwaitingBilling ?? pi.convenioPendingAwaitingBilling ?? 0;
  const credit = pi.netAvailableCredit ?? pi.stats?.netAvailableCredit ?? 0;

  if (particular > 0) {
    out.push({
      id: 'debito', severity: 'high', icon: <Wallet size={16} />,
      title: `Receber ${brl(particular)} da família`,
      detail: 'Sessões particulares em aberto. Confira antes da próxima sessão.',
      cta: 'Receber', onClick: p.onReceive,
    });
  }

  if (!p.nextSession) {
    out.push({
      id: 'agenda', severity: p.totalAppointments > 0 ? 'high' : 'medium', icon: <CalendarClock size={16} />,
      title: p.totalAppointments > 0 ? 'Sem próxima sessão agendada' : 'Paciente ainda sem agendamento',
      detail: p.totalAppointments > 0 ? 'Risco de abandono: retomar contato e reagendar.' : 'Marcar a avaliação inicial.',
      cta: 'Agendar', onClick: p.onSchedule,
    });
  }

  // Guias: alertas do lifecycle calculado no back
  p.situation.guides
    .filter((g) => g.status === 'active' || g.status === 'exhausted' || g.status === 'expired')
    .forEach((g) => {
      const alerts = g.lifecycle?.alerts || [];
      const top = alerts.find((a) => a.severity === 'error') || alerts.find((a) => a.severity === 'warning');
      if (!top || !GUIDE_ALERT_TEXT[top.code]) return;
      const meta: AlertMeta = { ...((top.metadata || {}) as AlertMeta) };
      if (meta.remainingDays == null) { const d = daysUntil(g.expiresAt); if (d !== null && d >= 0) meta.remainingDays = d; }
      if (meta.remainingSessions == null && typeof g.remaining === 'number') meta.remainingSessions = g.remaining;
      out.push({
        id: `guia-${g._id}`, severity: top.severity === 'error' ? 'high' : 'medium', icon: <FileWarning size={16} />,
        title: `Guia ${g.number || ''} de ${cap(g.specialty)}: ${GUIDE_ALERT_TEXT[top.code](meta)}`.replace('Guia  ', 'Guia '),
        detail: `${p.patient?.healthPlan?.name || cap(g.insurance) || 'Convênio'} · pedir nova guia ao convênio antes de travar a agenda.`,
        cta: 'Ver guias', onClick: () => p.onGoTab('Insurance Guides'),
      });
    });

  if (convAwaiting > 0) {
    out.push({
      id: 'faturar', severity: 'info', icon: <ReceiptText size={16} />,
      title: `${brl(convAwaiting)} de convênio aguardando faturamento`,
      detail: 'Sessões realizadas que ainda não entraram em lote.',
      cta: 'Ver convênios', onClick: () => p.onGoTab('Insurance Guides'),
    });
  }

  p.situation.contracts.filter((c) => c.status === 'active').forEach((c) => {
    const ratio = c.totalCredit > 0 ? c.creditBalance / c.totalCredit : 1;
    const days = daysUntil(c.expirationDate);
    if (ratio < 0.25) {
      out.push({
        id: `lim-saldo-${c._id}`, severity: 'medium', icon: <Gavel size={16} />,
        title: `Saldo da liminar baixo: ${brl(c.creditBalance)} de ${brl(c.totalCredit)}`,
        detail: 'Avisar a família e o advogado para pedir recarga.',
        cta: 'Ver liminar', onClick: () => p.onGoTab('Liminar'),
      });
    }
    if (days !== null && days <= 30) {
      out.push({
        id: `lim-venc-${c._id}`, severity: days < 0 ? 'high' : 'medium', icon: <Gavel size={16} />,
        title: days < 0 ? 'Liminar vencida' : `Liminar vence em ${days} ${days === 1 ? 'dia' : 'dias'}`,
        detail: c.processNumber ? `Processo ${c.processNumber}` : undefined,
        cta: 'Ver liminar', onClick: () => p.onGoTab('Liminar'),
      });
    }
  });

  p.situation.packages
    .filter((pkg) => pkg.status === 'active' && pkg.type !== 'convenio')
    .forEach((pkg) => {
      const remaining = typeof pkg.remaining === 'number' ? pkg.remaining
        : (pkg.totalSessions ?? 0) - (pkg.sessionsDone ?? 0);
      if ((pkg.totalSessions ?? 0) > 0 && remaining <= 2) {
        out.push({
          id: `pkg-${pkg._id}`, severity: 'medium', icon: <Package size={16} />,
          title: remaining <= 0 ? `Pacote de ${cap(pkg.specialty || pkg.sessionType) || 'terapia'} terminou` : `Pacote de ${cap(pkg.specialty || pkg.sessionType) || 'terapia'}: ${remaining === 1 ? 'resta 1 sessão' : `restam ${remaining} sessões`}`,
          detail: 'Oferecer renovação antes de acabar.',
          cta: 'Ver pacotes', onClick: () => p.onGoTab('Management Packages'),
        });
      }
    });

  if (credit > 0) {
    out.push({
      id: 'credito', severity: 'good', icon: <Wallet size={16} />,
      title: `${brl(credit)} de crédito disponível`,
      detail: 'Pode ser usado num próximo pacote.',
      cta: 'Ver pacotes', onClick: () => p.onGoTab('Management Packages'),
    });
  }

  const missing = [!pi.phone && 'telefone', !pi.dateOfBirth && 'data de nascimento'].filter(Boolean);
  if (missing.length) {
    out.push({
      id: 'cadastro', severity: 'info', icon: <UserRound size={16} />,
      title: `Cadastro incompleto: falta ${missing.join(' e ')}`,
      cta: 'Completar', onClick: () => p.onGoTab('Profile'),
    });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, info: 2, good: 3 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

const SEV: Record<Severity, { dot: string; icon: string; label: string }> = {
  high: { dot: 'bg-red-500', icon: 'bg-red-50 text-red-600', label: 'Urgente' },
  medium: { dot: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600', label: 'Atenção' },
  info: { dot: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600', label: 'Acompanhar' },
  good: { dot: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600', label: 'Oportunidade' },
};

export function PatientNextActions(props: ActionsProps) {
  const actions = useMemo(() => buildNextActions(props), [props]);
  const [showAll, setShowAll] = useState(false);
  const [listRef] = useAutoAnimate<HTMLUListElement>();
  const visible = showAll ? actions : actions.slice(0, 4);
  const urgent = actions.filter((a) => a.severity === 'high').length;

  return (
    <section aria-label="Próximas ações" className="mb-5 text-left overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-slate-900 p-1.5 text-white"><AlertTriangle size={15} /></div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Próximas ações</h2>
            <p className="text-2xs text-slate-500">
              {!props.situation.loaded ? 'Analisando guias, liminar e pacotes…'
                : actions.length === 0 ? 'Nada pendente para este paciente'
                  : `${actions.length} ${actions.length === 1 ? 'item' : 'itens'}${urgent ? ` · ${urgent} urgente${urgent > 1 ? 's' : ''}` : ''}`}
            </p>
          </div>
        </div>
      </header>
      {actions.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} /> Tudo em dia: sem débito, com sessão agendada e coberturas válidas.
        </div>
      ) : (
        <ul ref={listRef} className="divide-y divide-slate-100">
          {visible.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <div className={`shrink-0 rounded-lg p-2 ${SEV[a.severity].icon}`}>{a.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEV[a.severity].dot}`} aria-hidden />
                  <span className="sr-only">{SEV[a.severity].label}: </span>
                  <span className="min-w-0">{a.title}</span>
                </p>
                {a.detail && <p className="mt-0.5 text-xs text-slate-500">{a.detail}</p>}
              </div>
              <button
                type="button"
                onClick={a.onClick}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                {a.cta} <ArrowRight size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {actions.length > 4 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full border-t border-slate-100 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          {showAll ? 'Mostrar menos' : `Ver mais ${actions.length - 4}`}
        </button>
      )}
    </section>
  );
}
