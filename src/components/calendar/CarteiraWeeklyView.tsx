// Aba Recorrência da Agenda — grade terapêutica (mock aprovado em 30/10).
// Cada horário vira uma célula de duas linhas; tudo o que o cartão grande mostrava fica no
// painel que abre ao clicar. Avisos do topo numa faixa só; filtros em chips com contagem.
import { AlertTriangle, CheckCircle2, MessageCircle, RefreshCw, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useRetentionSlots, RetentionSlot, Stability } from '../../hooks/useRetentionSlots';
import { IDoctor } from '../../utils/types/types';
import { getSpecialtyLabel } from '../../constants/specialties';
import { Chip } from './agenda/AgendaParts';

const STABILITY: Record<Stability, { label: string; dot: string }> = {
  estavel: { label: 'Fixo', dot: '#1baf7a' },
  atencao: { label: 'Oscilando', dot: '#eda100' },
  risco: { label: 'Sem continuidade', dot: '#e5484d' },
  novo: { label: 'Recente', dot: '#2a78d6' },
  livre: { label: 'Disponível', dot: '#94a3b8' },
};

const WEEKDAY_LABELS: Record<number, string> = { 2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta' };
const WEEKDAY_ORDER = [2, 3, 4, 5, 6];
const TOTAL_DAILY_SLOTS = 16;

function getWeekDate(mongoWeekday: number): Date {
  const today = new Date();
  const jsDay = today.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const result = new Date(monday);
  result.setDate(monday.getDate() + (mongoWeekday - 2));
  return result;
}

const TODAY_MONGO_WEEKDAY = (() => {
  const js = new Date().getDay();
  return js === 0 ? 1 : js + 1;
})();

function openWhatsApp(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  const number = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const msg = encodeURIComponent(`Olá, ${name.split(' ')[0]}! Gostaríamos de agendar sua próxima sessão na Fono Inova.`);
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank', 'noopener');
}

const brl = (v: number) => `R$ ${Math.round(v).toLocaleString('pt-BR')}`;

// ── Lógica operacional (mesma de antes) ─────────────────────────────────────
function computeProximaAcao(slot: RetentionSlot) {
  const dias = slot.daysSinceLastSession;
  if (slot.recentMissed >= 2 && !slot.nextSessionAt) return { text: 'Reagendar urgente', sub: `${slot.recentMissed} faltas e sem próxima sessão`, level: 'critico' as const };
  if (!slot.nextSessionAt && dias !== null && dias > 14) return { text: 'Perdeu ritmo terapêutico', sub: `${dias} dias sem atendimento`, level: 'critico' as const };
  if (!slot.nextSessionAt) return { text: 'Agendar próxima sessão', sub: null, level: 'alto' as const };
  if (slot.recentMissed >= 2) return { text: 'Follow-up de faltas', sub: `${slot.recentMissed} faltas recentes`, level: 'medio' as const };
  if (slot.packageRemaining > 0 && slot.packageRemaining <= 2) return { text: 'Oferecer renovação de pacote', sub: `${slot.packageRemaining} ${slot.packageRemaining === 1 ? 'sessão restante' : 'sessões restantes'}`, level: 'medio' as const };
  if (slot.recentMissed >= 1) return { text: 'Atenção: 1 falta recente', sub: null, level: 'baixo' as const };
  if (slot.stability === 'atencao') return { text: 'Validar continuidade', sub: null, level: 'baixo' as const };
  return { text: 'Grade saudável', sub: null, level: 'ok' as const };
}

function computeRiscoEvasao(slot: RetentionSlot): 'alto' | 'medio' | 'baixo' | null {
  let score = 0;
  if (!slot.nextSessionAt) score += 40;
  if (slot.recentMissed >= 2) score += 30;
  else if (slot.recentMissed >= 1) score += 15;
  if (slot.daysSinceLastSession !== null && slot.daysSinceLastSession > 14) score += 20;
  if (slot.packageRemaining > 0 && slot.packageRemaining <= 2) score += 10;
  if (slot.stability === 'risco' || slot.stability === 'atencao') score += 10;
  if (score >= 60) return 'alto';
  if (score >= 25) return 'medio';
  if (score > 0) return 'baixo';
  return null;
}

const ACAO_TONE = {
  critico: 'border-red-200 bg-red-50 text-red-800',
  alto: 'border-orange-200 bg-orange-50 text-orange-800',
  medio: 'border-amber-200 bg-amber-50 text-amber-800',
  baixo: 'border-amber-200 bg-amber-50 text-amber-800',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
} as const;

const packageEnding = (s: RetentionSlot) => !s.isVacant && s.packageRemaining > 0 && s.packageRemaining <= 3;

// ── Célula compacta ─────────────────────────────────────────────────────────
function SlotCell({ slot, onOpen }: { slot: RetentionSlot; onOpen: () => void }) {
  if (slot.isVacant) {
    const critico = slot.vacantType === 'critico';
    const temp = slot.vacantType === 'temporario';
    return (
      <button type="button" onClick={onOpen}
        className={`block h-full w-full rounded-lg border border-dashed px-2 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          critico ? 'border-red-300 hover:bg-red-50' : temp ? 'border-amber-300 hover:bg-amber-50' : 'border-gray-300 hover:bg-gray-50'
        }`}>
        <span className={`block truncate text-[13px] font-semibold ${critico ? 'text-red-700' : temp ? 'text-amber-700' : 'text-gray-500'}`}>
          {critico ? 'Vaga crítica' : temp ? 'Ausente esta semana' : 'Livre'}
        </span>
        <span className="block truncate text-[11px] text-gray-500">
          {slot.daysSinceVacant !== null ? `vago há ${slot.daysSinceVacant} d` : slot.lastPatientName ? `antes: ${slot.lastPatientName.split(' ')[0]}` : 'para encaixe'}
        </span>
      </button>
    );
  }
  const cfg = STABILITY[slot.stability] || STABILITY.novo;
  const pct = Math.round((Number(slot.attendanceRate) || 0) * 100);
  const name = slot.currentPatientName ? slot.currentPatientName.split(' ').slice(0, 2).join(' ') : '—';
  return (
    <button type="button" onClick={onOpen}
      className="block h-full w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      title={`${slot.currentPatientName || ''} · ${cfg.label} · presença ${pct}%`}>
      <span className="block truncate text-[13px] font-semibold text-gray-900">{name}</span>
      <span className="flex items-center gap-1.5 text-[11px] text-gray-600">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cfg.dot }} aria-hidden />
        <span className="tabular-nums">{pct}%</span>
        {packageEnding(slot) && <span className="ml-auto shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">pacote {slot.packageRemaining}</span>}
        {!slot.nextSessionAt && !packageEnding(slot) && <span className="ml-auto shrink-0 rounded bg-orange-100 px-1 text-[10px] font-semibold text-orange-800">sem próx.</span>}
      </span>
    </button>
  );
}

// ── Painel de detalhes ──────────────────────────────────────────────────────
function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{children}</span>
    </div>
  );
}

function SlotPanel({ slot, onClose }: { slot: RetentionSlot; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const cfg = STABILITY[slot.stability] || STABILITY.novo;
  const when = `${WEEKDAY_LABELS[slot.weekday] || ''} · ${slot.time}`;
  const pct = Math.round((Number(slot.attendanceRate) || 0) * 100);
  const acao = slot.isVacant ? null : computeProximaAcao(slot);
  const risco = slot.isVacant ? null : computeRiscoEvasao(slot);
  const valorEmRisco = risco && risco !== 'baixo' && slot.avgSessionValue > 0 ? slot.avgSessionValue * 4 : null;
  const nextLabel = slot.nextSessionAt ? new Date(slot.nextSessionAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '') : null;
  const soon = 'Em breve';

  return (
    <div className="fixed inset-0 z-[1400] flex justify-end bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={`Horário ${when}`}
        className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white text-left shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{when}</p>
            <h3 className="mt-0.5 text-lg font-bold text-gray-900">
              {slot.isVacant ? (slot.vacantType === 'critico' ? 'Vaga crítica' : slot.vacantType === 'temporario' ? 'Paciente ausente esta semana' : 'Horário livre') : slot.currentPatientName}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} aria-hidden />
              {cfg.label} · estabilidade {slot.stabilityScore}/100
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {slot.stabilityReason && <p className="text-sm text-gray-600">{slot.stabilityReason}</p>}

          {acao && (
            <div className={`rounded-lg border px-3 py-2 ${ACAO_TONE[acao.level]}`}>
              <p className="text-sm font-semibold">{acao.text}</p>
              {acao.sub && <p className="text-xs opacity-90">{acao.sub}</p>}
            </div>
          )}

          {!slot.isVacant ? (
            <div>
              <Detail label="Presença">{pct}% · {slot.recurrenceCount} atend.{slot.slotTotalSessions > slot.recurrenceCount + 2 && ` (${slot.slotTotalSessions} no total)`}</Detail>
              <Detail label="Faltas recentes">{slot.recentMissed || '—'}</Detail>
              {slot.continuityMonths > 0 && <Detail label="Acompanhamento">{slot.continuityMonths} {slot.continuityMonths === 1 ? 'mês' : 'meses'}</Detail>}
              {slot.avgSessionValue > 0 && <Detail label="Valor/mês">{brl(slot.avgSessionValue * 4)}</Detail>}
              <Detail label="Pacote">{slot.packageRemaining > 0 ? `${slot.packageRemaining} ${slot.packageRemaining === 1 ? 'sessão restante' : 'sessões restantes'}` : '—'}</Detail>
              <Detail label="Próxima">{nextLabel || <span className="text-orange-700">sem próxima sessão</span>}</Detail>
              <Detail label="Última">{slot.daysSinceLastSession === null ? '—' : slot.daysSinceLastSession === 0 ? 'hoje' : `há ${slot.daysSinceLastSession} dias`}</Detail>
              {valorEmRisco && <Detail label="Em risco"><span className="text-red-600">{brl(valorEmRisco)}/mês</span></Detail>}
            </div>
          ) : (
            <div>
              {slot.lastPatientName && <Detail label="Último paciente">{slot.lastPatientName}</Detail>}
              {slot.slotTotalSessions > 0 && <Detail label="Ocupado">{slot.slotTotalSessions}x nas últimas semanas</Detail>}
              {slot.daysSinceVacant !== null && <Detail label="Vago há">{slot.daysSinceVacant} dias</Detail>}
              {slot.vacantType === 'critico' && slot.avgSessionValue > 0 && <Detail label="Perda potencial"><span className="text-red-600">{brl(slot.avgSessionValue * 4)}/mês</span></Detail>}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {!slot.isVacant && slot.currentPatientPhone && (
              <button type="button" onClick={() => openWhatsApp(slot.currentPatientPhone, slot.currentPatientName || '')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <MessageCircle size={15} aria-hidden /> WhatsApp
              </button>
            )}
            {slot.isVacant && slot.vacantType === 'critico' && (
              <>
                <button type="button" disabled title={soon} className="cursor-not-allowed rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500">Reativar · em breve</button>
                <button type="button" disabled title={soon} className="cursor-not-allowed rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500">Encaixe · em breve</button>
              </>
            )}
            {slot.isVacant && slot.vacantType === 'livre' && (
              <button type="button" disabled title={soon} className="cursor-not-allowed rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500">Oferecer horário · em breve</button>
            )}
            {slot.isVacant && slot.vacantType === 'temporario' && <p className="text-sm text-gray-500">Próxima sessão confirmada.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Principal ───────────────────────────────────────────────────────────────
type StatusFilter = 'todos' | Stability | 'vagos' | 'vagos_criticos';
type ShowFilter = 'todos' | 'sem_proxima_sessao' | 'faltosos' | 'pacote_acabando' | 'risco_alto' | 'sem_continuidade';

interface CarteiraWeeklyViewProps {
  doctors: IDoctor[];
}

export default function CarteiraWeeklyView({ doctors: doctorsProp }: CarteiraWeeklyViewProps) {
  const doctors = doctorsProp || [];
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [days, setDays] = useState<number>(30);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [showFilter, setShowFilter] = useState<ShowFilter>('todos');
  const [openSlot, setOpenSlot] = useState<RetentionSlot | null>(null);

  const { data, loading, error, reload } = useRetentionSlots(selectedDoctorId, days);

  const filteredDoctors = useMemo(() => (selectedSpecialty ? doctors.filter(d => d.specialty === selectedSpecialty) : doctors), [doctors, selectedSpecialty]);
  const specialties = useMemo(() => [...new Set(doctors.map(d => d.specialty).filter(Boolean))] as string[], [doctors]);

  const allSlots = useMemo(() => (data ? Object.values(data.weekdays).flat() : []), [data]);
  const active = allSlots.filter(s => !s.isVacant);

  const allTimes = useMemo(() => [...new Set(allSlots.map(s => s.time))].sort(), [allSlots]);

  const matchStatus = (s: RetentionSlot, f: StatusFilter) =>
    f === 'todos' ? true
      : f === 'vagos' ? s.isVacant
        : f === 'vagos_criticos' ? s.vacantType === 'critico'
          : !s.isVacant && s.stability === f;
  const matchShow = (s: RetentionSlot, f: ShowFilter) =>
    f === 'todos' ? true
      : s.isVacant ? false
        : f === 'sem_proxima_sessao' ? !s.nextSessionAt
          : f === 'faltosos' ? s.recentMissed >= 1
            : f === 'pacote_acabando' ? packageEnding(s)
              : f === 'risco_alto' ? computeRiscoEvasao(s) === 'alto'
                : s.continuityMonths < 2;

  const statusCount = (f: StatusFilter) => allSlots.filter(s => matchStatus(s, f) && matchShow(s, showFilter)).length;
  const showCount = (f: ShowFilter) => allSlots.filter(s => matchShow(s, f) && matchStatus(s, statusFilter)).length;

  const slotAt = (weekday: number, time: string) => {
    const slot = (data?.weekdays[String(weekday)] || []).find(s => s.time === time) ?? null;
    if (!slot) return null;
    return matchStatus(slot, statusFilter) && matchShow(slot, showFilter) ? slot : null;
  };

  const summary = data?.summary;
  const stableRate = summary && typeof summary.stabilityRate === 'number' ? `${summary.stabilityRate}%` : '—';

  return (
    <div className="p-4 text-left sm:p-5">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Recorrência · grade terapêutica</h2>
          <p className="text-sm text-gray-500">Horários fixos da semana e quem está em risco de sair</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5" role="group" aria-label="Período">
            {[30, 60, 90].map(d => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => setDays(d)}
                className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${days === d ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                {d} dias
              </button>
            ))}
          </div>
          <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} aria-label="Profissional"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos os profissionais</option>
            {filteredDoctors.map(doc => <option key={doc._id} value={doc._id}>{doc.fullName}</option>)}
          </select>
          <select value={selectedSpecialty} onChange={e => setSelectedSpecialty(e.target.value)} aria-label="Terapia"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Todas as terapias</option>
            {specialties.map(sp => <option key={sp} value={sp}>{getSpecialtyLabel(sp)}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-9 w-3/4 animate-pulse rounded-full bg-gray-100" />
          <div className="grid grid-cols-5 gap-2">{Array.from({ length: 20 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50" />)}</div>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-gray-900">Não foi possível carregar a grade</p>
          <p className="max-w-md text-xs text-gray-500">{error}</p>
          <button type="button" onClick={reload} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} aria-hidden /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && data && summary && (
        <>
          {summary.atRiskSlots > 0 ? (
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              <AlertTriangle size={16} className="shrink-0 text-red-500" aria-hidden />
              <strong>Grade em atenção:</strong>
              <span>{summary.atRiskSlots} {summary.atRiskSlots === 1 ? 'horário em risco' : 'horários em risco'}</span>
              <span aria-hidden>·</span><span>{summary.criticalSlots} {summary.criticalSlots === 1 ? 'vaga crítica' : 'vagas críticas'}</span>
              {summary.potentialLossMonthly > 0 && <><span aria-hidden>·</span><strong>{brl(summary.potentialLossMonthly)}/mês em risco</strong></>}
              <span aria-hidden>·</span><span>{summary.stableSlots} estáveis ({stableRate})</span>
            </p>
          ) : (
            <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600" aria-hidden />
              <strong>Grade estável:</strong>
              <span>{summary.stableSlots} {summary.stableSlots === 1 ? 'horário firme' : 'horários firmes'} ({stableRate})</span>
              <span aria-hidden>·</span><span>{summary.newSlots} {summary.newSlots === 1 ? 'novo' : 'novos'}</span>
            </p>
          )}

          <div className="mb-3 flex flex-col gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Status</span>
              <div className="-my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1">
                <Chip active={statusFilter === 'todos'} count={statusCount('todos')} onClick={() => setStatusFilter('todos')}>Todos</Chip>
                {(['estavel', 'atencao', 'risco', 'novo'] as Stability[]).map(st => (
                  <Chip key={st} active={statusFilter === st} count={statusCount(st)} dot={STABILITY[st].dot}
                    onClick={() => setStatusFilter(statusFilter === st ? 'todos' : st)}>
                    {st === 'estavel' ? 'Estáveis' : st === 'atencao' ? 'Atenção' : st === 'risco' ? 'Em risco' : 'Novos'}
                  </Chip>
                ))}
                <Chip active={statusFilter === 'vagos'} count={statusCount('vagos')} dot="#94a3b8" onClick={() => setStatusFilter(statusFilter === 'vagos' ? 'todos' : 'vagos')}>Livres</Chip>
                <Chip active={statusFilter === 'vagos_criticos'} count={statusCount('vagos_criticos')} dot="#e5484d" onClick={() => setStatusFilter(statusFilter === 'vagos_criticos' ? 'todos' : 'vagos_criticos')}>Vagas críticas</Chip>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">Mostrar</span>
              <div className="-my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1">
                <Chip active={showFilter === 'todos'} onClick={() => setShowFilter('todos')}>Tudo</Chip>
                {([
                  ['sem_proxima_sessao', 'Sem próxima sessão'],
                  ['faltosos', 'Faltas recentes'],
                  ['pacote_acabando', 'Pacote acabando'],
                  ['risco_alto', 'Risco alto de evasão'],
                  ['sem_continuidade', 'Sem continuidade'],
                ] as [ShowFilter, string][]).map(([f, label]) => (
                  <Chip key={f} active={showFilter === f} count={showCount(f)} onClick={() => setShowFilter(showFilter === f ? 'todos' : f)}>{label}</Chip>
                ))}
              </div>
            </div>
          </div>

          {allTimes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nenhum horário recorrente neste período.</p>
          ) : (
            <div className="overflow-auto rounded-xl border border-gray-200" style={{ maxHeight: 'calc(100vh - 160px)' }}>
              <table className="w-full min-w-[760px] table-fixed border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="w-14 border-b border-gray-200 bg-white px-2 py-2" />
                    {WEEKDAY_ORDER.map(wd => {
                      const occ = data.occupancyByDay[String(wd)] || { active: 0, vacant: 0, total: 0, rate: 0 };
                      const rate = Math.min(100, Math.round((occ.total / TOTAL_DAILY_SLOTS) * 100));
                      const isToday = wd === TODAY_MONGO_WEEKDAY;
                      const color = rate >= 80 ? '#1baf7a' : rate >= 60 ? '#eda100' : '#e5484d';
                      return (
                        <th key={wd} scope="col" className={`border-b border-l border-gray-200 px-2 py-2 text-left align-bottom ${isToday ? 'bg-emerald-50' : 'bg-white'}`}>
                          <span className="block text-sm font-semibold text-gray-900">
                            {WEEKDAY_LABELS[wd].slice(0, 3)} <span className="font-normal text-gray-500">{getWeekDate(wd).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                            {isToday && <span className="ml-1 text-xs font-semibold text-emerald-700">hoje</span>}
                          </span>
                          <span className="mt-0.5 block text-xs font-normal text-gray-500">
                            {occ.total}/{TOTAL_DAILY_SLOTS} preenchidos{occ.vacant > 0 && ` · ${occ.vacant} ${occ.vacant === 1 ? 'livre' : 'livres'}`}
                          </span>
                          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-gray-100">
                            <span className="block h-full rounded-full" style={{ width: `${rate}%`, background: color }} />
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allTimes.map(time => (
                    <tr key={time}>
                      <th scope="row" className="border-b border-gray-100 px-2 py-1 text-right align-top text-xs font-semibold tabular-nums text-gray-500">{time}</th>
                      {WEEKDAY_ORDER.map(wd => {
                        const slot = slotAt(wd, time);
                        return (
                          <td key={wd} className="h-14 border-b border-l border-gray-100 p-1 align-top">
                            {slot && <SlotCell slot={slot} onOpen={() => setOpenSlot(slot)} />}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">Clique num horário para ver presença, acompanhamento, valor, pacote, próxima e última sessão.</p>
        </>
      )}

      {openSlot && <SlotPanel slot={openSlot} onClose={() => setOpenSlot(null)} />}
    </div>
  );
}
