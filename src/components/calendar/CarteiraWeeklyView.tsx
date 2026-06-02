import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useRetentionSlots, RetentionSlot, Stability } from '../../hooks/useRetentionSlots';
import { IDoctor } from '../../utils/types/types';

// ── Cores de estabilidade (tons suaves) ─────────────────────────────────────
const STABILITY_CFG: Record<Stability, {
  label: string;
  color: string;
  bg: string;
  border: string;
  leftBar: string;
  badgeBg: string;
}> = {
  estavel:  { label: 'Fixo',            color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', leftBar: '#86efac', badgeBg: '#dcfce7' },
  atencao:  { label: 'Oscilando',       color: '#b45309', bg: '#fffbeb', border: '#fde68a', leftBar: '#fcd34d', badgeBg: '#fef3c7' },
  risco:    { label: 'Sem continuidade', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', leftBar: '#fca5a5', badgeBg: '#fee2e2' },
  novo:     { label: 'Recente',         color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', leftBar: '#93c5fd', badgeBg: '#dbeafe' },
  livre:    { label: 'Disponível',      color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', leftBar: '#d1d5db', badgeBg: '#f3f4f6' },
};

const WEEKDAY_LABELS: Record<number, string> = {
  2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta',
};
const WEEKDAY_ORDER = [2, 3, 4, 5, 6];

import { getSpecialtyLabel } from '../../constants/specialties';

const GRID_COLS = '44px repeat(5, 1fr)';
const TOTAL_DAILY_SLOTS = 16;

function getWeekDate(mongoWeekday: number): Date {
  const today = new Date();
  const jsDay = today.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const targetJsDay = mongoWeekday - 1;
  const result = new Date(monday);
  result.setDate(monday.getDate() + (targetJsDay - 1));
  return result;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const TODAY_MONGO_WEEKDAY = (() => {
  const js = new Date().getDay();
  return js === 0 ? 1 : js + 1;
})();

function openWhatsApp(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  const number = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá, ${name.split(' ')[0]}! Gostaríamos de agendar sua próxima sessão na Fono Inova.`
  );
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank', 'noopener');
}

// ── Tooltip de estabilidade ─────────────────────────────────────────────────
function StabilityTooltip({ slot, children }: { slot: RetentionSlot; children: React.ReactNode }) {
  return (
    <Tooltip
      title={
        <div className="max-w-[260px]">
          <p className="font-bold text-xs mb-1">{STABILITY_CFG[slot.stability].label} — Score {slot.stabilityScore}</p>
          <p className="text-[11px] leading-relaxed opacity-90">{slot.stabilityReason}</p>
        </div>
      }
      arrow
      placement="top"
    >
      {children}
    </Tooltip>
  );
}

// ── Lógica operacional ──────────────────────────────────────────────────────
function computeProximaAcao(slot: RetentionSlot) {
  const dias = slot.daysSinceLastSession;
  if (slot.recentMissed >= 2 && !slot.nextSessionAt)
    return { icon: '🚨', text: 'Reagendar urgente', sublabel: `${slot.recentMissed} faltas + sem próx. sessão`, level: 'critico' as const };
  if (!slot.nextSessionAt && dias !== null && dias > 14)
    return { icon: '🚨', text: 'Perdeu ritmo terapêutico', sublabel: `${dias} dias sem atendimento`, level: 'critico' as const };
  if (!slot.nextSessionAt)
    return { icon: '🚨', text: 'Agendar próxima sessão', sublabel: null, level: 'alto' as const };
  if (slot.recentMissed >= 2)
    return { icon: '⚠', text: 'Follow-up de faltas', sublabel: `${slot.recentMissed} faltas recentes`, level: 'medio' as const };
  if (slot.packageRemaining > 0 && slot.packageRemaining <= 2)
    return { icon: '📦', text: 'Oferecer renovação de pacote', sublabel: `${slot.packageRemaining} sess. restante${slot.packageRemaining > 1 ? 's' : ''}`, level: 'medio' as const };
  if (slot.recentMissed >= 1)
    return { icon: '⚠', text: 'Atenção — 1 falta recente', sublabel: null, level: 'baixo' as const };
  if (slot.stability === 'atencao')
    return { icon: '📉', text: 'Validar continuidade', sublabel: null, level: 'baixo' as const };
  return { icon: '✓', text: 'Grade saudável', sublabel: null, level: 'ok' as const };
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

const ACAO_CFG = {
  critico: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c' },
  alto:    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
  medio:   { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  baixo:   { bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
  ok:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
} as const;

// ── Card ativo ──────────────────────────────────────────────────────────────
function ActiveCell({ slot }: { slot: RetentionSlot }) {
  const cfg = STABILITY_CFG[slot.stability];
  const pct = Math.round(slot.attendanceRate * 100);
  const barColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
  const displayName = slot.currentPatientName
    ? slot.currentPatientName.split(' ').slice(0, 2).join(' ')
    : '—';
  const lastLabel = slot.daysSinceLastSession !== null
    ? slot.daysSinceLastSession === 0 ? 'última: hoje' : `última: há ${slot.daysSinceLastSession}d`
    : null;
  const nextLabel = slot.nextSessionAt ? (() => {
    const diff = Math.ceil((new Date(slot.nextSessionAt).getTime() - Date.now()) / 86400000);
    if (diff <= 0) return 'próx. hoje';
    if (diff === 1) return 'próx. amanhã';
    if (diff <= 7) return `próx. em ${diff}d`;
    return `próx. ${new Date(slot.nextSessionAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  })() : null;

  const acao = computeProximaAcao(slot);
  const riscoEvasao = computeRiscoEvasao(slot);
  const acaoCfg = ACAO_CFG[acao.level];

  const scoreColor = slot.stabilityScore >= 90 ? '#16a34a'
    : slot.stabilityScore >= 70 ? '#d97706'
    : slot.stabilityScore >= 50 ? '#ea580c'
    : '#dc2626';
  const scoreBg = slot.stabilityScore >= 90 ? '#f0fdf4'
    : slot.stabilityScore >= 70 ? '#fffbeb'
    : slot.stabilityScore >= 50 ? '#fff7ed'
    : '#fef2f2';

  const valorEmRisco = riscoEvasao && riscoEvasao !== 'baixo' && slot.avgSessionValue > 0
    ? slot.avgSessionValue * 4
    : null;

  return (
    <StabilityTooltip slot={slot}>
      <div
        className="h-full rounded-lg overflow-hidden transition-all hover:shadow-md hover:-translate-y-px cursor-default"
        style={{
          borderLeft: `4px solid ${cfg.leftBar}`,
          border: `1px solid ${cfg.border}`,
          borderLeftWidth: 4,
          backgroundColor: cfg.bg,
        }}
      >
        <div className="px-3 py-3 flex flex-col gap-2 h-full">

          {/* LINHA 1 — Nome + badge + WA + Score */}
          <div className="flex items-center justify-between gap-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span className="text-sm font-bold text-gray-800 truncate leading-tight">
                {displayName}
              </span>
              {slot.currentPatientPhone && (
                <button
                  onClick={() => openWhatsApp(slot.currentPatientPhone, slot.currentPatientName || '')}
                  className="p-1 rounded-full hover:bg-green-100 transition-colors flex-shrink-0"
                  title="Enviar WhatsApp"
                >
                  <MessageCircle size={13} className="text-green-500" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{ color: cfg.color, backgroundColor: cfg.badgeBg }}
              >
                {cfg.label}
              </span>
              <span
                className="text-[13px] font-extrabold tabular-nums px-1.5 py-0.5 rounded-lg leading-none"
                style={{ color: scoreColor, backgroundColor: scoreBg }}
                title={`Score de estabilidade: ${slot.stabilityScore}/100`}
              >
                {slot.stabilityScore}
              </span>
            </div>
          </div>

          {/* LINHA 2 — Próxima ação */}
          <div
            className="px-2 py-1.5 rounded-lg flex items-start gap-1.5"
            style={{ backgroundColor: acaoCfg.bg, border: `1px solid ${acaoCfg.border}` }}
          >
            <span className="text-sm leading-none flex-shrink-0 mt-px">{acao.icon}</span>
            <div className="min-w-0">
              <span className="text-[11px] font-bold leading-tight block" style={{ color: acaoCfg.text }}>
                {acao.text}
              </span>
              {acao.sublabel && (
                <span className="text-[10px] leading-none block mt-0.5" style={{ color: acaoCfg.text, opacity: 0.75 }}>
                  {acao.sublabel}
                </span>
              )}
            </div>
          </div>

          {/* LINHA 3 — Presença */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">presença</span>
            <div className="flex items-center gap-1.5">
              {slot.slotTotalSessions > slot.recurrenceCount + 2 && (
                <span className="text-[10px] text-gray-400 tabular-nums">{slot.slotTotalSessions} total</span>
              )}
              <span className="text-xs text-gray-500 tabular-nums">{slot.recurrenceCount} atend.</span>
            </div>
          </div>

          {/* Barra + % */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', borderRadius: 9999 }} />
            </div>
            <span className="text-[11px] font-extrabold tabular-nums w-7 text-right leading-none" style={{ color: barColor }}>
              {pct}%
            </span>
          </div>

          {/* Continuidade + valor mensal */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            {slot.continuityMonths > 0 && (
              <span>
                <span className="font-semibold text-gray-700">Acompanham.:</span> {slot.continuityMonths} {slot.continuityMonths === 1 ? 'mês' : 'meses'}
              </span>
            )}
            {slot.avgSessionValue > 0 && (
              <span className="font-semibold text-emerald-600">
                R$ {(slot.avgSessionValue * 4).toLocaleString('pt-BR')}/mês
              </span>
            )}
          </div>

          {/* Footer — badges + última + valor em risco */}
          <div className="flex flex-col gap-1 mt-auto">
            <div className="flex items-center gap-1 flex-wrap">
              {slot.packageRemaining > 0 && (
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${slot.packageRemaining <= 2 ? 'text-orange-700 bg-orange-100' : 'text-gray-600 bg-gray-100'}`}>
                  📦 {slot.packageRemaining} sess.
                </span>
              )}
              {!slot.nextSessionAt ? (
                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full leading-none">
                  sem próx.
                </span>
              ) : nextLabel && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none">
                  ✓ {nextLabel}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1">
              {lastLabel && (
                <span className="text-[11px] text-gray-500 tabular-nums">{lastLabel}</span>
              )}
              {valorEmRisco && (
                <span className="text-[11px] font-bold text-rose-600 ml-auto">
                  ⚠ R${valorEmRisco.toLocaleString('pt-BR')} risco
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </StabilityTooltip>
  );
}

// ── Card vazio ──────────────────────────────────────────────────────────────
function VacantCell({ slot }: { slot: RetentionSlot }) {
  const cfg = STABILITY_CFG[slot.stability];
  const firstName = slot.lastPatientName?.split(' ')[0] ?? null;
  const dsv = slot.daysSinceVacant;
  const monthlyLoss = slot.avgSessionValue * 4;

  const isTemp = slot.vacantType === 'temporario';
  const isCritico = slot.vacantType === 'critico';
  const isLivre = slot.vacantType === 'livre';

  return (
    <StabilityTooltip slot={slot}>
      <div
        className="h-full rounded-lg overflow-hidden transition-all hover:shadow-md"
        style={{
          borderLeft: `4px solid ${cfg.leftBar}`,
          border: `1px solid ${cfg.border}`,
          borderLeftWidth: 4,
          backgroundColor: cfg.bg,
          ...(isCritico ? { borderStyle: 'solid', borderLeftStyle: 'solid' } : {}),
        }}
      >
        <div className="px-3 py-3 flex flex-col gap-2 h-full">
          {/* Header: classificação + score */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ color: cfg.color, backgroundColor: cfg.badgeBg }}>
              {cfg.label}
            </span>
            <span className="text-[10px] font-extrabold tabular-nums" style={{ color: cfg.color }}>
              {slot.stabilityScore}
            </span>
          </div>

          {/* Título principal */}
          {isCritico && (
            <div className="flex items-start gap-1">
              <ShieldAlert size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-[11px] font-bold text-red-700 leading-tight">
                Horário em perda
              </span>
            </div>
          )}
          {isTemp && (
            <span className="text-[11px] font-medium text-amber-700">
              Paciente ausente esta semana
            </span>
          )}
          {isLivre && (
            <span className="text-[11px] font-medium text-gray-500">
              Horário livre para encaixe
            </span>
          )}

          {/* Histórico */}
          <div className="text-[10px] text-gray-500 space-y-0.5">
            {firstName && <p>↳ Último paciente: <span className="font-medium text-gray-700">{firstName}</span></p>}
            {slot.slotTotalSessions > 0 && <p>Ocupado {slot.slotTotalSessions}x nas últimas semanas</p>}
            {dsv !== null && <p>Vago há <span className="font-medium">{dsv} dias</span></p>}
          </div>

          {/* Impacto financeiro */}
          {isCritico && monthlyLoss > 0 && (
            <div className="text-[11px] font-bold text-red-600 bg-red-100 px-2 py-1 rounded">
              💸 Perda potencial: R$ {monthlyLoss.toLocaleString('pt-BR')}/mês
            </div>
          )}

          {/* Ações */}
          <div className="mt-auto flex flex-wrap gap-1">
            {isCritico && (
              <>
                <button className="text-[10px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                  Reativar
                </button>
                <button className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                  Encaixe
                </button>
              </>
            )}
            {isLivre && (
              <button className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                Oferecer horário
              </button>
            )}
            {isTemp && (
              <span className="text-[10px] text-gray-400 italic">Próxima sessão confirmada</span>
            )}
          </div>
        </div>
      </div>
    </StabilityTooltip>
  );
}

// ── Painel de ação operacional ───────────────────────────────────────────────
interface PainelItem {
  filter: string;
  icon: string;
  label: string;
  count: number;
  activeColor: string;
}

function PainelResumo({ allSlots, viewFilter, setViewFilter }: {
  allSlots: RetentionSlot[];
  viewFilter: string;
  setViewFilter: (v: string) => void;
}) {
  const active = allSlots.filter(s => !s.isVacant);
  const items: PainelItem[] = [
    { filter: 'sem_proxima_sessao', icon: '🚨', label: 'Sem próxima sessão', count: active.filter(s => !s.nextSessionAt).length, activeColor: '#fef2f2' },
    { filter: 'faltosos',          icon: '⚠',  label: 'Faltas recentes',     count: active.filter(s => s.recentMissed >= 1).length, activeColor: '#fff7ed' },
    { filter: 'pacote_acabando',   icon: '📦', label: 'Pacote acabando',      count: active.filter(s => s.packageRemaining > 0 && s.packageRemaining <= 3).length, activeColor: '#fffbeb' },
    { filter: 'risco_alto',        icon: '🔥', label: 'Risco alto de evasão', count: active.filter(s => computeRiscoEvasao(s) === 'alto').length, activeColor: '#fef2f2' },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {items.map(item => {
        const isActive = viewFilter === item.filter;
        return (
          <button
            key={item.filter}
            onClick={() => setViewFilter(isActive ? 'todos' : item.filter)}
            className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm"
            style={{
              backgroundColor: isActive ? item.activeColor : '#ffffff',
              borderColor: isActive ? '#fca5a5' : '#e5e7eb',
              boxShadow: isActive ? '0 0 0 1px #fca5a5' : undefined,
            }}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <div>
              <div className="text-xl font-bold text-gray-800 leading-tight">{item.count}</div>
              <div className="text-[11px] text-gray-500 leading-tight">{item.label}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface CarteiraWeeklyViewProps {
  doctors: IDoctor[];
}

export default function CarteiraWeeklyView({ doctors }: CarteiraWeeklyViewProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [days, setDays] = useState<number>(30);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [viewFilter, setViewFilter] = useState<string>('todos');

  const { data, loading, error } = useRetentionSlots(selectedDoctorId, days);

  // Filtro por especialidade (client-side)
  const filteredDoctors = useMemo(() => {
    if (!selectedSpecialty) return doctors;
    return doctors.filter(d => d.specialty === selectedSpecialty);
  }, [doctors, selectedSpecialty]);

  const allTimes = useMemo(() => {
    if (!data) return [];
    const times = new Set<string>();
    for (const wd of WEEKDAY_ORDER) {
      for (const slot of data.weekdays[String(wd)] || []) {
        times.add(slot.time);
      }
    }
    return [...times].sort();
  }, [data]);

  const slotAt = (weekday: number, time: string): RetentionSlot | null => {
    if (!data) return null;
    return (data.weekdays[String(weekday)] || []).find(s => s.time === time) ?? null;
  };

  // Aplicar filtros de visualização
  const filteredSlotAt = (weekday: number, time: string): RetentionSlot | null => {
    const slot = slotAt(weekday, time);
    if (!slot) return null;

    // Filtro por status de estabilidade
    if (statusFilter !== 'todos') {
      if (statusFilter === 'vagos_criticos' && slot.vacantType !== 'critico') return null;
      if (statusFilter !== 'vagos_criticos' && slot.stability !== statusFilter) return null;
    }

    // Filtro por visualização rápida
    if (viewFilter !== 'todos') {
      if (viewFilter === 'vagos' && !slot.isVacant) return null;
      if (viewFilter === 'sem_proxima_sessao' && (slot.isVacant || slot.nextSessionAt)) return null;
      if (viewFilter === 'sem_continuidade' && (slot.isVacant || slot.continuityMonths >= 2)) return null;
      if (viewFilter === 'grade_risco' && slot.stability !== 'risco' && slot.stability !== 'atencao') return null;
      if (viewFilter === 'faltosos' && (slot.isVacant || slot.recentMissed < 1)) return null;
      if (viewFilter === 'pacote_acabando' && (slot.isVacant || slot.packageRemaining <= 0 || slot.packageRemaining > 3)) return null;
      if (viewFilter === 'risco_alto' && (slot.isVacant || computeRiscoEvasao(slot) !== 'alto')) return null;
    }

    return slot;
  };

  const allSlots = data ? Object.values(data.weekdays).flat() : [];
  const summary = data?.summary;

  // Especialidades únicas dos doctors
  const specialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach(d => { if (d.specialty) set.add(d.specialty); });
    return [...set];
  }, [doctors]);

  return (
    <div className="p-3">
      {/* Cabeçalho executivo */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCcw size={18} color="#00C087" />
          <span className="text-lg font-bold text-gray-800">Grade Terapêutica — Estabilidade</span>
          {summary && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
              {summary.stabilityRate}% estável
            </span>
          )}
        </div>

        {summary && summary.atRiskSlots > 0 && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50/60 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                ⚠️ Grade terapêutica em atenção
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-red-700 mt-1">
                <span>{summary.atRiskSlots} horários em risco</span>
                <span>{summary.criticalSlots} vagas críticas</span>
                {summary.potentialLossMonthly > 0 && (
                  <span className="font-semibold">
                    Potencial mensal em risco: R$ {summary.potentialLossMonthly.toLocaleString('pt-BR')}
                  </span>
                )}
                <span>{summary.stableSlots} estáveis</span>
              </div>
            </div>
          </div>
        )}

        {summary && summary.atRiskSlots === 0 && (
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-emerald-800">
                ✅ Grade terapêutica estável
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {summary.stableSlots} horários firmes · {summary.newSlots} novos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Painel operacional — pacientes para contato */}
      <PainelResumo allSlots={allSlots} viewFilter={viewFilter} setViewFilter={setViewFilter} />

      {/* Controles / Filtros */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="flex gap-1">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-[#00C087] text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#00C087] hover:text-[#00C087]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Profissional */}
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Profissional</InputLabel>
            <Select
              value={selectedDoctorId}
              label="Profissional"
              onChange={e => setSelectedDoctorId(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {filteredDoctors.map(doc => (
                <MenuItem key={doc._id} value={doc._id}>{doc.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Terapia / Especialidade */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Terapia</InputLabel>
            <Select
              value={selectedSpecialty}
              label="Terapia"
              onChange={e => setSelectedSpecialty(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {specialties.map(sp => (
                <MenuItem key={sp} value={sp}>{getSpecialtyLabel(sp)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="estavel">🟢 Estáveis</MenuItem>
              <MenuItem value="atencao">🟡 Atenção</MenuItem>
              <MenuItem value="risco">🔴 Risco</MenuItem>
              <MenuItem value="novo">🔵 Novos</MenuItem>
              <MenuItem value="vagos_criticos">⚠️ Vagos críticos</MenuItem>
            </Select>
          </FormControl>

          {/* Mostrar apenas */}
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Mostrar apenas</InputLabel>
            <Select
              value={viewFilter}
              label="Mostrar apenas"
              onChange={e => setViewFilter(e.target.value)}
            >
              <MenuItem value="todos">Todos</MenuItem>
              <MenuItem value="sem_proxima_sessao">🚨 Sem próxima sessão</MenuItem>
              <MenuItem value="faltosos">⚠ Faltas recentes</MenuItem>
              <MenuItem value="pacote_acabando">📦 Pacote acabando</MenuItem>
              <MenuItem value="risco_alto">🔥 Risco alto de evasão</MenuItem>
              <MenuItem value="grade_risco">📉 Grade em risco</MenuItem>
              <MenuItem value="vagos">Horários vagos</MenuItem>
              <MenuItem value="sem_continuidade">Sem continuidade</MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8 }}>
          <div />
          {WEEKDAY_ORDER.map(d => <Skeleton key={d} variant="text" width="80%" height={28} />)}
          {Array.from({ length: 8 }).flatMap((_, row) => [
            <Skeleton key={`t${row}`} variant="text" width={36} height={20} style={{ justifySelf: 'end' }} />,
            ...WEEKDAY_ORDER.map(d => (
              <Skeleton key={`${d}_${row}`} variant="rounded" height={80} />
            )),
          ])}
        </div>
      )}

      {/* Erro */}
      {error && !loading && (
        <Alert severity="error">Erro ao carregar grade: {error}</Alert>
      )}

      {/* Estado vazio */}
      {!loading && !error && !data && (
        <div className="text-center py-8 text-gray-500">
          <RotateCcw size={40} strokeWidth={1} />
          <p className="mt-2">Selecione um profissional para ver a grade semanal</p>
        </div>
      )}

      {/* Grade principal */}
      {!loading && !error && data && (
        <div
          className="border border-gray-200 rounded-xl shadow-sm"
          style={{ overflow: 'auto', maxHeight: 'calc(100vh - 160px)' }}
        >
          <div style={{ minWidth: 640 }}>
            {/* Cabeçalho dos dias — sticky */}
            <div
              className="px-4 py-3 border-b-2 border-gray-200 bg-white rounded-t-xl"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: 8,
                position: 'sticky',
                top: 0,
                zIndex: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div />
              {WEEKDAY_ORDER.map((wd) => {
                const occ = data.occupancyByDay[String(wd)] || { active: 0, vacant: 0, total: 0, rate: 0 };
                const filled = occ.total;
                const rate = Math.min(100, Math.round((filled / TOTAL_DAILY_SLOTS) * 100));
                const isToday = wd === TODAY_MONGO_WEEKDAY;
                const isGood = rate >= 80;
                const isMid = rate >= 60 && rate < 80;
                const barColor = isGood ? '#16a34a' : isMid ? '#d97706' : '#ef4444';
                const cardBg = isToday ? '#eff6ff' : isGood ? '#f0fdf4' : isMid ? '#fffbeb' : '#f9fafb';
                const cardBorder = isToday ? '#93c5fd' : isGood ? '#bbf7d0' : isMid ? '#fde68a' : '#e5e7eb';
                const rateColor = isGood ? '#15803d' : isMid ? '#b45309' : '#dc2626';
                const weekDate = getWeekDate(wd);
                const dateLabel = formatShortDate(weekDate);
                return (
                  <div
                    key={wd}
                    className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
                    style={{
                      backgroundColor: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      boxShadow: isToday ? '0 0 0 3px #bfdbfe44' : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[14px] font-extrabold text-gray-700 uppercase tracking-wide leading-none">
                          {WEEKDAY_LABELS[wd].slice(0, 3)}
                        </span>
                        <span className="text-[15px] text-gray-400 font-medium">{dateLabel}</span>
                        {isToday && (
                          <span className="text-[14px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded leading-none">
                            hoje
                          </span>
                        )}
                      </div>
                      {occ.vacant > 0 && (
                        <Tooltip title={`${occ.vacant} horário${occ.vacant > 1 ? 's' : ''} sem próximo agendamento`}>
                          <span className="text-[15px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full cursor-default leading-none flex-shrink-0">
                            {occ.vacant} livre{occ.vacant > 1 ? 's' : ''}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    <div className="flex items-end justify-between gap-1">
                      <div className="flex flex-col leading-none">
                        <span className="text-[14px] text-gray-400 font-medium mb-0.5">horários preenchidos</span>
                        <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: rateColor }}>
                          {rate}%
                        </span>
                      </div>
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[15px] text-gray-400 font-medium mb-0.5">horários</span>
                        <span className="text-sm font-bold text-gray-700 tabular-nums">
                          {filled}<span className="text-gray-400 font-normal">/{TOTAL_DAILY_SLOTS}</span>
                        </span>
                      </div>
                    </div>

                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div style={{ width: `${rate}%`, backgroundColor: barColor }} className="h-full rounded-full transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas por horário */}
            <div className="flex flex-col divide-y divide-gray-100 pb-6">
              {allTimes.map((time, idx) => (
                <div
                  key={time}
                  className="px-4 py-2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    gap: 10,
                    minHeight: 140,
                  }}
                >
                  <div className="flex items-center justify-end pr-2">
                    <span className="text-xs font-mono font-semibold text-gray-400">{time}</span>
                  </div>
                  {WEEKDAY_ORDER.map((wd, colIdx) => {
                    const slot = filteredSlotAt(wd, time);
                    const notLast = colIdx < WEEKDAY_ORDER.length - 1;
                    return (
                      <div
                        key={wd}
                        style={{
                          minHeight: 130,
                          borderRight: notLast ? '2px dashed #cbd5e1' : undefined,
                          paddingRight: notLast ? 8 : undefined,
                          backgroundColor: colIdx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                          borderRadius: 6,
                        }}
                      >
                        {slot ? (
                          slot.isVacant
                            ? <VacantCell slot={slot} />
                            : <ActiveCell slot={slot} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
