import {
    CalendarCheck, CalendarPlus, CalendarX, Cake, CalendarClock, ChevronDown, ChevronRight, ClipboardCheck,
    Clock, FileClock, MessageCircle, TrendingDown, AlertTriangle, Package, UserMinus, Wallet, LineChart, PieChart, RefreshCw, Stethoscope, UserPlus, Users, X
} from 'lucide-react';
import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent } from '@mui/material';
import { mapPatientListResponseDTO } from '../../dtos/patient.response.dto';
import API from '../../services/api';
import { commercialService, StoppedTrend } from '../../services/commercialService';
import { appointmentService } from '../../services/appointmentService';
import { getStatusConfig } from '../../utils/appointmentStatus';
import { getSpecialtyLabel } from '../../constants/specialties';
import { useOperationalCounts } from '../../hooks/useOperationalCounts';
import { Pagination } from '../common/Pagination';
import {
    DashboardCharts,
    DashboardStats,
    DoctorOverview,
    UpcomingAppointment
} from '../../services/dashboardService';

import BirthdayList, { isLateBirthday, withDaysUntil } from './BirthdayList';
import { notifyBirthdaysChanged } from '../../hooks/useBirthdayAlert';
import { ChurnPanel, EvaluationPanel, LeadsWaitingStrip, NextDayConfirmPanel, PackageEndingPanel, ReactivationPanel, useCommercialQueues } from '../commercial/CommercialParts';
import PatientTable from '../patients/PatientTable';
import { LateEvolutionsPanel, lateEvolutionsDetail, useLateEvolutions } from './LateEvolutionsPanel';
import { useAutoAnimate } from '@formkit/auto-animate/react';

// Ordem aprovada pelo Kadu em 29/10 (mock "Dashboard do admin"):
// 1. Precisa de você hoje · 2. Aniversariantes · 3. Lista de pacientes (única aberta)
// 4. o resto recolhido: números, gráficos, agenda de hoje por profissional, próximas sessões, leads/especialidades.

interface DashboardContentOptimizedProps {
    stats: DashboardStats | null;
    charts: DashboardCharts | null;
    doctors: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    patients: any[];
    loading: boolean;
    onRefresh: () => Promise<void>;
    handleAddProfessional: () => void;
    handleAddPatient: () => void;
    setPatientToEdit: (patient: any) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    setShowAdvancedPayment?: (show: boolean) => void;
    setSelectedPatient?: (patient: any) => void;
    setPaymentContext?: (context: any) => void;
    setPaymentModalOpen?: (isOpen: boolean) => void;
    onDeletePatient?: (patient: any) => void;
    /** Abre outra aba do admin (atalhos do "Precisa de você"). */
    onNavigate?: (tab: string) => void;
}

// --- Skeletons ---

const BirthdayCardSkeleton = memo(() => (
    <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}
    </div>
));
BirthdayCardSkeleton.displayName = 'BirthdayCardSkeleton';

// --- helpers ---

const getInitials = (name: string) =>
    (name || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatCurrencyShort = (value: number) =>
    value >= 1000 ? `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : formatCurrency(value);

// Data do agendamento é gravada como o dia (meio-dia ou meia-noite UTC): lê o dia em UTC.
const apptDay = (date: string | Date | undefined) => (date ? new Date(date).toISOString().slice(0, 10) : '');
const localDay = (d = new Date()) => d.toLocaleDateString('sv-SE');
const dayLabel = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
};

type TodayBucket = 'done' | 'missed' | 'canceled' | 'pre' | 'todo';
const bucketOf = (status?: string): TodayBucket => {
    if (status === 'completed') return 'done';
    if (status === 'missed' || status === 'no_show') return 'missed';
    if (status === 'canceled') return 'canceled';
    if (status === 'pre_agendado') return 'pre';
    return 'todo';
};

const minutesUntil = (time?: string) => {
    if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return null;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
};
const relTime = (mins: number | null) => {
    if (mins === null) return '';
    if (mins < -5) return 'já passou';
    if (mins <= 5) return 'agora';
    if (mins < 60) return `em ${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${h}h`;
};

const ORIGIN_LABEL: Record<string, string> = {
    instagram: 'Instagram', google: 'Google', site: 'Site', whatsapp: 'WhatsApp', indicacao: 'Indicação',
    facebook: 'Facebook', meta: 'Meta Ads', gmb: 'Google Meu Negócio', unknown: 'Não informado', outro: 'Outro', outros: 'Outros',
};
const originLabel = (o?: string) => (o ? ORIGIN_LABEL[o.toLowerCase()] || o.charAt(0).toUpperCase() + o.slice(1) : 'Não informado');

interface TodayAppt {
    _id?: string; patientName: string; time: string; operationalStatus: string; specialty?: string;
    professional?: string; doctor?: { _id?: string; fullName?: string };
}

// --- Números: sem caixa em volta. Faixa "Hoje" no topo (números grandes) e linha de números menores. ---
// Redesign 04/11 (Kadu: "monte de card"): mesmos números de antes, agora sempre visíveis e sem borda por item.

const StatTile = memo<{
    label: string; value: React.ReactNode; detail?: React.ReactNode; onClick?: () => void; action?: React.ReactNode;
}>(({ label, value, detail, onClick, action }) => {
    const body = (
        <>
            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                {label}
                {onClick && <ChevronRight size={13} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden />}
            </span>
            <span className="mt-1 text-xl font-bold leading-none tabular-nums text-gray-900 dark:text-gray-50">{value}</span>
            {detail && <span className="mt-1 text-xs leading-4 text-gray-600 dark:text-gray-400">{detail}</span>}
        </>
    );
    return (
        <div className="relative flex min-w-0 items-start justify-between gap-2 px-4 py-3">
            {onClick ? (
                <button type="button" onClick={onClick} className="group flex min-w-0 flex-col items-start rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    {body}
                </button>
            ) : <div className="flex min-w-0 flex-col items-start">{body}</div>}
            {action}
        </div>
    );
});
StatTile.displayName = 'StatTile';

/** Número grande da faixa "Hoje". */
const HeroFigure = ({ label, value, detail, tone = 'ink', onClick, children }: {
    label: string; value: React.ReactNode; detail?: React.ReactNode; tone?: 'ink' | 'money'; onClick?: () => void; children?: React.ReactNode;
}) => {
    const inner = (
        <>
            <span className="flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                {label}
                {onClick && <ChevronRight size={15} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden />}
            </span>
            <span className={`mt-1.5 text-2xl sm:text-[2rem] font-extrabold leading-none tracking-tight tabular-nums ${tone === 'money' ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-50'}`}>{value}</span>
            {children}
            {detail && <span className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">{detail}</span>}
        </>
    );
    return onClick ? (
        <button type="button" onClick={onClick} className="group flex w-full min-w-0 flex-col items-start rounded-lg p-4 text-left transition-colors hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-gray-900/50">{inner}</button>
    ) : <div className="flex min-w-0 flex-col items-start p-4">{inner}</div>;
};

/** Barra do dia: realizadas, faltas, canceladas, pré e a fazer (mesma quebra do modal). */
const TodayBar = ({ s }: { s: Record<TodayBucket, number> }) => {
    const total = s.done + s.missed + s.canceled + s.pre + s.todo;
    if (!total) return null;
    const seg: Array<[number, string]> = [
        [s.done, 'bg-emerald-600 dark:bg-emerald-500'],
        [s.missed, 'bg-amber-500 dark:bg-amber-400'],
        [s.canceled, 'bg-red-500 dark:bg-red-400'],
        [s.pre, 'bg-violet-400 dark:bg-violet-400'],
        [s.todo, 'bg-gray-300 dark:bg-gray-600'],
    ];
    return (
        <span className="mt-3 flex h-2 w-full max-w-md gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {seg.filter(([n]) => n > 0).map(([n, c]) => <span key={c} className={c} style={{ flex: n }} />)}
        </span>
    );
};

// Recorrência — só exibe o que o backend calculou; o seletor escolhe a janela já calculada.
type RecurringStats = NonNullable<DashboardStats['recurring']>;
const RECURRING_ROWS = [
    { min: 3, key: 'min3', pct: 'pct3' },
    { min: 4, key: 'min4', pct: 'pct4' },
    { min: 5, key: 'min5', pct: 'pct5' },
] as const;

const RecurringPatientsTile = memo<{ recurring: RecurringStats }>(({ recurring }) => {
    const [open, setOpen] = useState(false);
    const [days, setDays] = useState(recurring.windowDays);
    const w = recurring.windows.find((x) => x.days === days) ?? recurring.windows[0];
    const headline = recurring.windows.find((x) => x.days === recurring.windowDays) ?? recurring.windows[0];
    if (!headline) return null;

    return (
        <>
            <StatTile
                label="Recorrentes"
                value={headline.min4}
                detail={`${recurring.minVisits}+ atendimentos em ${headline.days} dias · ${headline.pct4}%`}
                onClick={() => setOpen(true)}
            />
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Pacientes recorrentes</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Atendimentos realizados por paciente</p>
                    </div>
                    <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
                </div>
                <div className="px-5 py-4">
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Janela de recorrência">
                        {recurring.windows.map((x) => (
                            <button
                                key={x.days}
                                type="button"
                                role="tab"
                                aria-selected={x.days === w.days}
                                onClick={() => setDays(x.days)}
                                className={`min-h-8 rounded-full border px-3 text-sm font-medium ${x.days === w.days
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                            >
                                {x.days} dias
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 space-y-3.5">
                        {RECURRING_ROWS.map((r) => (
                            <div key={r.min}>
                                <div className="mb-1 flex items-baseline justify-between text-sm">
                                    <span className={r.min === 4 ? 'font-semibold text-gray-900 dark:text-gray-50' : 'text-gray-700 dark:text-gray-300'}>{r.min}+ atendimentos</span>
                                    <span className="tabular-nums text-gray-700 dark:text-gray-300"><strong className="text-base text-gray-900 dark:text-gray-50">{w[r.key]}</strong> <span className="text-xs text-gray-500">{w[r.pct]}%</span></span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${w[r.pct]}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
                        de <strong className="text-gray-900 dark:text-gray-100">{w.attended}</strong> pacientes atendidos nos últimos {w.days} dias
                    </p>
                </div>
            </Dialog>
        </>
    );
});
RecurringPatientsTile.displayName = 'RecurringPatientsTile';

// --- Section (accordion) ---

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

interface SectionProps {
    id?: string;
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    icon: React.ReactNode;
    meta?: React.ReactNode;
    /** Aviso visível com a seção fechada. */
    note?: React.ReactNode;
}

// Seção sem caixa: título, meta e recolher. Separação por espaço e linha fina, não por borda.
const Section = memo<SectionProps>(({ id, title, isOpen, onToggle, children, icon, meta, note }) => (
    <section id={id} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:px-5"
            onClick={onToggle}
            aria-expanded={isOpen}
        >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" aria-hidden>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="text-base font-bold text-gray-900 dark:text-gray-50">{title}</span>
                {meta && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{meta}</span>}
            </span>
            {!isOpen && note}
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                {isOpen ? 'Recolher' : 'Mostrar'}
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
            </span>
        </button>
        {isOpen && <div className="border-t border-gray-100 px-4 pb-4 pt-3 sm:px-5 dark:border-gray-800">{children}</div>}
    </section>
));
Section.displayName = 'Section';

// --- Precisa de você ---

interface NeedItem { key: string; count: number; title: string; detail: string; cta: string; onClick: () => void; tone: 'warn' | 'bad' | 'info' | 'pink'; error?: boolean; onRetry?: () => void; alwaysShow?: boolean }

// Cor por urgência: vermelho = dinheiro/paciente indo embora, âmbar = venda/agenda para fechar, azul = confirmar/retornar.
const TONE: Record<NeedItem['tone'], { tile: string; icon: string; num: string; btn: string }> = {
    bad: { tile: 'bg-red-50/70 ring-red-100 dark:bg-red-500/[0.07] dark:ring-red-500/20', icon: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300', num: 'text-red-700 dark:text-red-300', btn: 'bg-white text-red-700 ring-red-200 hover:bg-red-600 hover:text-white dark:bg-gray-900 dark:text-red-300 dark:ring-red-500/30 dark:hover:bg-red-500 dark:hover:text-gray-950' },
    warn: { tile: 'bg-amber-50/70 ring-amber-100 dark:bg-amber-500/[0.07] dark:ring-amber-500/20', icon: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300', num: 'text-amber-800 dark:text-amber-300', btn: 'bg-white text-amber-800 ring-amber-200 hover:bg-amber-600 hover:text-white dark:bg-gray-900 dark:text-amber-300 dark:ring-amber-500/30 dark:hover:bg-amber-400 dark:hover:text-gray-950' },
    info: { tile: 'bg-blue-50/70 ring-blue-100 dark:bg-blue-500/[0.07] dark:ring-blue-500/20', icon: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300', num: 'text-blue-700 dark:text-blue-300', btn: 'bg-white text-blue-700 ring-blue-200 hover:bg-blue-600 hover:text-white dark:bg-gray-900 dark:text-blue-300 dark:ring-blue-500/30 dark:hover:bg-blue-500 dark:hover:text-gray-950' },
    pink: { tile: 'bg-pink-50/70 ring-pink-100 dark:bg-pink-500/[0.07] dark:ring-pink-500/20', icon: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300', num: 'text-pink-700 dark:text-pink-300', btn: 'bg-white text-pink-700 ring-pink-200 hover:bg-pink-600 hover:text-white dark:bg-gray-900 dark:text-pink-300 dark:ring-pink-500/30 dark:hover:bg-pink-500 dark:hover:text-gray-950' },
};
const NEED_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
    evaluation: ClipboardCheck, nextDay: CalendarCheck, pre: CalendarPlus, lateEvo: FileClock, pay: Wallet,
    leads: MessageCircle, renewal: Package, churn: UserMinus, reactivation: CalendarX, bday: Cake,
};
const TONE_ORDER: Record<NeedItem['tone'], number> = { bad: 0, warn: 1, info: 2, pink: 3 };

// Grade de 4 por linha (pedido do Kadu 04/11): ícone + número grande, o que é, detalhe e um botão de ação.
// Ordem: mais urgente primeiro (vermelho, âmbar, azul, rosa).
const NeedsYou = memo<{ items: NeedItem[]; loading: boolean }>(({ items, loading }) => {
    const [animRef] = useAutoAnimate<HTMLUListElement>();
    // Erro ≠ zero: fila que não carregou aparece como "não carregou", nunca some como se estivesse em dia.
    // Aniversário não é pendência de dinheiro/agenda: vira um lembrete no título e a grade fica em linhas de 4.
    const bday = items.find(i => i.key === 'bday' && i.count > 0);
    const visible = items.filter(i => i.key !== 'bday' && (i.count > 0 || i.error || i.alwaysShow))
        .map((i, idx) => ({ i, idx }))
        .sort((x, y) => (TONE_ORDER[x.i.tone] - TONE_ORDER[y.i.tone]) || (x.idx - y.idx))
        .map(x => x.i);
    return (
        <section aria-labelledby="precisa-de-voce">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
                <h2 id="precisa-de-voce" className="text-base font-bold text-gray-900 dark:text-gray-50">Precisa de você hoje</h2>
                {visible.length > 0 && <span className="text-sm text-gray-600 dark:text-gray-400">{plural(visible.length, 'fila com pendência', 'filas com pendência')} · as mais urgentes primeiro</span>}
                {bday && (
                    <button type="button" onClick={bday.onClick} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl bg-pink-50 px-3 py-2 text-left text-sm sm:ml-auto sm:mt-0 sm:inline-flex sm:min-h-9 sm:w-auto sm:rounded-full sm:py-0 font-semibold text-pink-700 ring-1 ring-inset ring-pink-200 hover:bg-pink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-pink-500/10 dark:text-pink-300 dark:ring-pink-500/30">
                        <Cake size={15} className="shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">{bday.count} {bday.title.toLowerCase()}: {bday.detail} · {bday.cta}</span>
                        <ChevronRight size={15} className="shrink-0" aria-hidden />
                    </button>
                )}
            </div>
            {loading && visible.length === 0 && !bday ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-[150px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                </div>
            ) : visible.length === 0 && !bday ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Nada pendente agora. Pré-agendamentos, pagamentos, leads, avaliações, confirmações, pacotes, retornos e aniversários estão em dia.</p>
            ) : (
                <ul ref={animRef} className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
                    {visible.map((item, idx) => {
                        const Icon = NEED_ICON[item.key] || ClipboardCheck;
                        // Última linha incompleta no desktop: 1 sobrando ocupa a linha toda (deitado), 2 sobrando dividem a linha.
                        const rest = visible.length % 4, inLast = idx >= visible.length - rest;
                        const wide = inLast && rest === 1, half = inLast && rest === 2;
                        const failed = item.error && !item.count;
                        const t = TONE[item.tone];
                        return (
                            <li key={item.key} className={`flex min-w-0 flex-col rounded-xl p-3 ring-1 sm:p-4 ring-inset ${wide ? 'col-span-2 xl:col-span-4 xl:flex-row xl:items-center xl:gap-4' : half ? 'xl:col-span-2' : ''} ${failed ? 'bg-white ring-gray-200 dark:bg-gray-900 dark:ring-gray-700' : t.tile}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${failed ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' : t.icon}`} aria-hidden><Icon size={19} /></span>
                                    <span className={`text-2xl font-extrabold leading-none tabular-nums sm:text-3xl ${failed ? 'text-gray-400' : t.num}`}>{failed ? '—' : item.count}</span>
                                </div>
                                <div className={wide ? 'min-w-0 xl:flex-1' : 'contents'}>
                                <h3 className={`font-semibold leading-snug text-gray-900 dark:text-gray-50 ${wide ? 'mt-3 xl:mt-0' : 'mt-3'}`}>{item.title}</h3>
                                <p className={`mt-0.5 line-clamp-2 text-xs text-gray-600 sm:text-sm dark:text-gray-400 ${wide ? 'xl:min-h-0' : 'mb-3 min-h-[2rem] sm:min-h-[2.5rem]'}`} title={item.detail}>
                                    {failed ? 'Não foi possível carregar.' : item.detail}
                                </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={failed ? item.onRetry : item.onClick}
                                    className={`mt-auto inline-flex min-h-10 w-full items-center text-center leading-tight ${wide ? 'xl:mt-0 xl:w-56 xl:shrink-0' : ''} justify-center gap-1 rounded-lg px-3 text-sm font-semibold ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${failed ? 'ring-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800' : t.btn}`}
                                >
                                    {failed ? 'Tentar de novo' : item.cta}
                                    {!failed && <ChevronRight size={16} aria-hidden />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
});
NeedsYou.displayName = 'NeedsYou';

// --- Gráfico de barras (uma série, uma cor; rótulo só no último valor) ---

const DayBars = memo<{ title: string; rows: Array<{ date: string; value: number }>; fmt: (v: number) => string; unit: string }>(({ title, rows, fmt, unit }) => {
    const [hover, setHover] = useState<number | null>(null);
    const W = 520, H = 180, L = 52, B = 24, T = 14, R = 8;
    const iw = W - L - R, ih = H - T - B;
    const rawMax = Math.max(1, ...rows.map(r => r.value));
    const step = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const max = Math.ceil((rawMax * 1.15) / step) * step;
    const bw = rows.length ? iw / rows.length : iw;
    const total = rows.reduce((s, r) => s + r.value, 0);

    return (
        <figure className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
            <figcaption className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-50">{title}</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">{rows.length} dias úteis · total {fmt(total)}</span>
            </figcaption>
            {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">Sem dados nos últimos 14 dias.</p>
            ) : (
                <div className="relative">
                    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}: ${rows.map(r => `${dayLabel(r.date)} ${fmt(r.value)}`).join(', ')}`}>
                        {[0, 0.5, 1].map(f => {
                            const y = T + ih - f * ih;
                            return (
                                <g key={f}>
                                    <line x1={L} x2={W - R} y1={y} y2={y} className="stroke-gray-200 dark:stroke-gray-700" strokeWidth={1} strokeDasharray={f === 0 ? undefined : '3 3'} />
                                    <text x={L - 6} y={y + 4} textAnchor="end" className="fill-gray-500 text-[10px] dark:fill-gray-400">{fmt(Math.round(max * f))}</text>
                                </g>
                            );
                        })}
                        {rows.map((r, i) => {
                            const h = (r.value / max) * ih;
                            const x = L + i * bw + bw * 0.18, w = bw * 0.64, y = T + ih - h;
                            const last = i === rows.length - 1;
                            return (
                                <g key={r.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                                    <rect x={L + i * bw} y={T} width={bw} height={ih} fill="transparent" />
                                    <path
                                        d={h > 0 ? `M${x},${T + ih} V${y + Math.min(4, h)} Q${x},${y} ${x + Math.min(4, w / 2)},${y} H${x + w - Math.min(4, w / 2)} Q${x + w},${y} ${x + w},${y + Math.min(4, h)} V${T + ih} Z` : ''}
                                        className={hover === i ? 'fill-[#1f5fae] dark:fill-[#6aa6f0]' : 'fill-[#2a78d6] dark:fill-[#3987e5]'}
                                    />
                                    {(i % 2 === 0 || last) && (
                                        <text x={L + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="fill-gray-500 text-[10px] dark:fill-gray-400">{dayLabel(r.date).slice(0, 5)}</text>
                                    )}
                                    {last && h > 0 && (
                                        <text x={x + w / 2} y={y - 4} textAnchor="middle" className="fill-gray-900 text-[11px] font-semibold dark:fill-gray-100">{fmt(r.value)}</text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                    {hover !== null && rows[hover] && (
                        <div
                            className="pointer-events-none absolute -top-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800"
                            style={{ left: `${((L + hover * bw + bw / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}
                        >
                            <span className="text-gray-600 dark:text-gray-400">{dayLabel(rows[hover].date)}</span>{' '}
                            <strong className="tabular-nums text-gray-900 dark:text-gray-50">{fmt(rows[hover].value)}</strong>{' '}
                            <span className="text-gray-600 dark:text-gray-400">{unit}</span>
                        </div>
                    )}
                </div>
            )}
        </figure>
    );
});
DayBars.displayName = 'DayBars';

const HBars = memo<{ title: string; rows: Array<{ label: string; value: number }>; empty: string }>(({ title, rows, empty }) => {
    const max = Math.max(1, ...rows.map(r => r.value));
    return (
        <div className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
            <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">{empty}</p>
            ) : (
                <ul className="space-y-2">
                    {rows.map(r => (
                        <li key={r.label} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-2 text-sm">
                            <span className="truncate text-gray-700 dark:text-gray-300" title={r.label}>{r.label}</span>
                            <span className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(r.value / max) * 100}%` }} />
                            </span>
                            <span className="text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{r.value}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});
HBars.displayName = 'HBars';

const monthLabel = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 15).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Evasão mês a mês (GET /v2/commercial/stopped-trend). Indicador, sem nome de paciente:
// a lista para ligar continua nas filas "Risco de evasão" e "Sem próxima sessão".
function useStoppedTrend() {
    const [data, setData] = useState<StoppedTrend | null>(null);
    const [error, setError] = useState(false);
    const load = useCallback(() => {
        commercialService.stoppedTrend(6)
            .then(d => { setData(d); setError(false); })
            .catch(e => { console.error('[dashboard] pacientes que pararam', e); setError(true); });
    }, []);
    useEffect(() => { const t = setTimeout(load, 1200); return () => clearTimeout(t); }, [load]);
    return { data, error, reload: load };
}

const StoppedAlertStrip = memo<{ alert: StoppedTrend['alert']; onOpen: () => void }>(({ alert, onOpen }) => {
    if (!alert) return null;
    return (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle size={18} className="shrink-0" aria-hidden />
            <p className="min-w-0 flex-1">
                <strong>Evasão acima do normal:</strong> {alert.count} pacientes pararam em {monthLabel(alert.month)}
                {alert.baseline !== null ? ` (média dos 3 meses anteriores: ${alert.baseline})` : ''}.
                {alert.bySpecialty[0] ? ` Mais em ${getSpecialtyLabel(alert.bySpecialty[0].label)}.` : ''}
            </p>
            <button type="button" onClick={onOpen} className="min-h-9 rounded-lg bg-amber-600 px-3 font-semibold text-white hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
                Ver detalhes
            </button>
        </div>
    );
});
StoppedAlertStrip.displayName = 'StoppedAlertStrip';

const StoppedTrendPanel = memo<{ data: StoppedTrend | null; error: boolean; onRetry: () => void }>(({ data, error, onRetry }) => {
    if (error && !data) {
        return <p className="text-sm text-amber-800 dark:text-amber-300">Não foi possível carregar. <button type="button" onClick={onRetry} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Tentar de novo</button></p>;
    }
    if (!data) return <div className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />;
    const max = Math.max(1, ...data.months.map(m => m.count));
    const focus = data.alert || data.months[data.months.length - 1];
    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-50">Pacientes que pararam, por mês</h3>
                <ul className="space-y-2">
                    {data.months.map(m => (
                        <li key={m.month} className="grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-2 text-sm">
                            <span className="truncate capitalize text-gray-700 dark:text-gray-300">{monthLabel(m.month)}</span>
                            <span className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <span className={`block h-full rounded-full ${m.spike ? 'bg-amber-500' : 'bg-[#2a78d6] dark:bg-[#3987e5]'}`} style={{ width: `${(m.count / max) * 100}%` }} />
                            </span>
                            <span className={`text-right font-semibold tabular-nums ${m.spike ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                {m.count}{m.spike ? ' ⚠' : ''}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Conta quem teve a última sessão no mês e não tem nada agendado. ⚠ = acima de 1,5x a média dos 3 meses anteriores.</p>
            </div>
            {focus && (
                <div className="grid gap-3">
                    <HBars title={`Por especialidade · ${monthLabel(focus.month)}`} rows={focus.bySpecialty.map(r => ({ label: getSpecialtyLabel(r.label), value: r.value }))} empty="Ninguém parou nesse mês." />
                    <HBars title={`Por profissional · ${monthLabel(focus.month)}`} rows={focus.byDoctor} empty="Ninguém parou nesse mês." />
                </div>
            )}
        </div>
    );
});
StoppedTrendPanel.displayName = 'StoppedTrendPanel';

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${active
            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'}`}
    >
        {children}
    </button>
);

type PanTab = 'today' | 'upcoming' | 'charts' | 'mix' | 'stopped';

// --- Main Component ---

const DashboardContentOptimized: React.FC<DashboardContentOptimizedProps> = ({
    stats,
    charts,
    doctors,
    upcomingAppointments,
    patients,
    loading,
    onRefresh,
    handleAddProfessional,
    handleAddPatient,
    setPatientToEdit,
    setIsModalOpen,
    setShowAdvancedPayment,
    setSelectedPatient,
    setPaymentContext,
    setPaymentModalOpen,
    onDeletePatient,
    onNavigate,
}) => {
    // Só a lista de pacientes abre por padrão (decisão do Kadu, 29/10).
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    // Redesign 04/11: as 5 seções recolhidas viraram abas de um só painel ("Panorama").
    const [panTab, setPanTab] = useState<PanTab>('today');
    const stopped = useStoppedTrend();
    const openStopped = useCallback(() => {
        setPanTab('stopped');
        document.getElementById('dash-panorama')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);
    const [showAllDoctors, setShowAllDoctors] = useState(false);
    const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'today' | 'tomorrow' | 'unconfirmed'>('all');

    // --- Sessões de hoje (lista completa): usada no modal, na quebra "realizadas/faltas/a fazer"
    // e na agenda por profissional. Busca uma vez, sob demanda.
    const [todaySessions, setTodaySessions] = useState<TodayAppt[]>([]);
    const [todayLoading, setTodayLoading] = useState(false);
    const [todayLoaded, setTodayLoaded] = useState(false);
    const [todayError, setTodayError] = useState(false);
    const todayFetching = useRef(false);

    const loadTodaySessions = useCallback(async (force = false) => {
        if (todayFetching.current || (todayLoaded && !force)) return;
        todayFetching.current = true;
        setTodayLoading(true);
        try {
            const todayStr = localDay();
            const res = await appointmentService.list({ startDate: todayStr, endDate: todayStr });
            const d: any = (res as any)?.data;
            // A rota devolve um array; versões antigas embrulhavam em { data: { appointments } }.
            const list = Array.isArray(d) ? d : Array.isArray(d?.data?.appointments) ? d.data.appointments : Array.isArray(d?.appointments) ? d.appointments : Array.isArray(d?.data) ? d.data : [];
            setTodaySessions(list.filter((a: any) => apptDay(a.date) === todayStr || !a.date));
            setTodayLoaded(true);
            setTodayError(false);
        } catch {
            setTodayError(true);
        } finally {
            todayFetching.current = false;
            setTodayLoading(false);
        }
    }, [todayLoaded]);

    // A faixa "Hoje" mostra a quebra do dia: busca logo depois da carga inicial.
    useEffect(() => {
        const t = setTimeout(() => { loadTodaySessions(); }, 800);
        return () => clearTimeout(t);
    }, [loadTodaySessions]);

    const todaySummary = useMemo(() => {
        const s = { done: 0, missed: 0, canceled: 0, pre: 0, todo: 0 };
        todaySessions.forEach(a => { s[bucketOf(a.operationalStatus)]++; });
        return s;
    }, [todaySessions]);

    const [todaySessionsModalOpen, setTodaySessionsModalOpen] = useState(false);
    const [todaySessionsPage, setTodaySessionsPage] = useState(1);
    const TODAY_SESSIONS_PAGE_SIZE = 8;
    const openTodaySessionsModal = useCallback(() => {
        setTodaySessionsModalOpen(true);
        setTodaySessionsPage(1);
        loadTodaySessions(true);
    }, [loadTodaySessions]);
    const sortedToday = useMemo(() => [...todaySessions].sort((a, b) => (a.time || '').localeCompare(b.time || '')), [todaySessions]);
    const todaySessionsTotalPages = Math.max(1, Math.ceil(sortedToday.length / TODAY_SESSIONS_PAGE_SIZE));
    const paginatedTodaySessions = useMemo(
        () => sortedToday.slice((todaySessionsPage - 1) * TODAY_SESSIONS_PAGE_SIZE, todaySessionsPage * TODAY_SESSIONS_PAGE_SIZE),
        [sortedToday, todaySessionsPage]
    );

    const todayByDoctor = useMemo(() => {
        const map = new Map<string, { name: string; total: number; done: number; missed: number; next: string | null }>();
        sortedToday.forEach(a => {
            const b = bucketOf(a.operationalStatus);
            if (b === 'canceled') return;
            const name = a.doctor?.fullName || a.professional || 'Profissional não informado';
            const key = a.doctor?._id || name;
            const row = map.get(key) || { name, total: 0, done: 0, missed: 0, next: null };
            row.total++;
            if (b === 'done') row.done++;
            if (b === 'missed') row.missed++;
            const mins = minutesUntil(a.time);
            if ((b === 'todo' || b === 'pre') && mins !== null && mins >= -5 && !row.next) row.next = a.time;
            map.set(key, row);
        });
        return [...map.values()].sort((x, y) => y.total - x.total);
    }, [sortedToday]);

    // --- Aniversariantes (contagem pronta do backend em meta) ---
    const [aniversariantes, setAniversariantes] = useState<Array<{
        _id: string; fullName: string; dateOfBirth: string; phone?: string; email?: string;
        daysUntil?: number; birthdayMessageSent?: boolean;
    }>>([]);
    const [aniversariantesMeta, setAniversariantesMeta] = useState<{ todayTotal: number; todayPending: number }>({ todayTotal: 0, todayPending: 0 });
    const [aniversariantesLoading, setAniversariantesLoading] = useState(false);
    const aniversariantesFetched = useRef(false);

    const loadAniversariantes = useCallback(async (silent = false) => {
        if (!silent) setAniversariantesLoading(true);
        try {
            const res = await API.get('/patients/aniversariantes');
            setAniversariantes(res.data?.data || []);
            setAniversariantesMeta(res.data?.meta || { todayTotal: 0, todayPending: 0 });
        } catch {
            if (!silent) {
                setAniversariantes([]);
                setAniversariantesMeta({ todayTotal: 0, todayPending: 0 });
            }
        } finally {
            if (!silent) setAniversariantesLoading(false);
        }
    }, []);

    const fetchAniversariantes = useCallback(async () => {
        if (aniversariantesFetched.current) return;
        aniversariantesFetched.current = true;
        await loadAniversariantes();
    }, [loadAniversariantes]);

    // Aniversariantes ficam sempre à vista (Kadu 10/11): busca logo depois da carga inicial.
    useEffect(() => { const t = setTimeout(fetchAniversariantes, 600); return () => clearTimeout(t); }, [fetchAniversariantes]);
    const handleBirthdayMessageSent = useCallback(() => { loadAniversariantes(true); notifyBirthdaysChanged(); }, [loadAniversariantes]);
    useEffect(() => {
        if (!aniversariantesFetched.current) return;
        const t = setTimeout(() => { loadAniversariantes(true); }, 1000);
        return () => clearTimeout(t);
    }, [patients, loadAniversariantes]);

    // --- Pré-agendamentos e leads para o "Precisa de você" ---
    const [preStats, setPreStats] = useState<{ total: number; semContato: number; urgentes: number } | null>(null);
    const [preStatsError, setPreStatsError] = useState(false);
    const loadPreStats = useCallback(async () => {
        try {
            const res = await API.get('/v2/pre-appointments/stats/dashboard');
            const d = res.data?.data ?? res.data;
            setPreStats({ total: d?.total || 0, semContato: d?.semContato || 0, urgentes: d?.urgentes || 0 });
            setPreStatsError(false);
        } catch {
            setPreStatsError(true);
        }
    }, []);
    useEffect(() => { loadPreStats(); }, [loadPreStats]);
    const opCounts = useOperationalCounts();
    const commercial = useCommercialQueues();
    const [queueOpen, setQueueOpen] = useState<'renewal' | 'churn' | 'reactivation' | 'evaluation' | 'nextDay' | 'lateEvo' | null>(null);
    const lateEvo = useLateEvolutions();

    const handleRefreshAll = useCallback(() => {
        onRefresh();
        loadPreStats();
        commercial.reload();
        if (aniversariantesFetched.current) loadAniversariantes(true);
        if (todayLoaded) loadTodaySessions(true);
        lateEvo.reload();
    }, [onRefresh, loadPreStats, commercial.reload, loadAniversariantes, todayLoaded, loadTodaySessions, lateEvo.reload]);

    const openBirthdays = useCallback(() => {
        document.getElementById('dash-aniversariantes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    // O back não manda daysUntil: hoje = mesmo dia/mês (UTC) do nascimento
    const birthdayToday = useMemo(() => {
        const now = new Date();
        return aniversariantes.filter(a => {
            const d = new Date(a.dateOfBirth);
            return !a.birthdayMessageSent && d.getUTCDate() === now.getDate() && d.getUTCMonth() === now.getMonth();
        });
    }, [aniversariantes]);
    // Passou nos últimos 7 dias sem parabéns: vai para o "Precisa de você" junto com os de hoje.
    const birthdayLate = useMemo(() => withDaysUntil(aniversariantes).filter(p => isLateBirthday(p)), [aniversariantes]);
    const birthdayWeek = useMemo(() => withDaysUntil(aniversariantes).filter(a => a.daysUntil >= 0 && a.daysUntil <= 7).length, [aniversariantes]);
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

    // Aniversariante do dia sem parabéns: o cartão fica em destaque. A aba do navegador (🎂 no
    // título e no ícone) é cuidada pelo useBirthdayAlert, no cabeçalho, para valer no ERP inteiro.
    const bdayAlertCount = birthdayToday.length;

    const tomorrowYmd = localDay(new Date(Date.now() + 86400000));
    const nextDayPending = commercial.nextDay ? commercial.nextDay.total - commercial.nextDay.confirmed : 0;
    const nextDayLabel = commercial.nextDay?.date
        ? (commercial.nextDay.date === tomorrowYmd ? 'amanhã' : new Date(`${commercial.nextDay.date}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }))
        : 'amanhã';
    const needItems: NeedItem[] = [
        {
            key: 'evaluation', count: commercial.evaluation?.total || 0, tone: 'warn', title: 'Avaliou e não fechou',
            detail: (() => {
                const list = commercial.evaluation?.items || [];
                const old = list.filter(i => i.daysSince > 10).length;
                const pot = (commercial.evaluation?.potentialMonthly || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
                if (!list.length) return 'ninguém nos últimos 30 dias · retome quem avaliou e sumiu';
                return `${old ? `${old} há mais de 10 dias · ` : ''}${pot}/mês em aberto`;
            })(),
            // Sempre visível (Kadu 12/11): o "Retomar contato" com quem sumiu fica aqui dentro.
            alwaysShow: true,
            cta: commercial.evaluation?.total ? 'Ver e oferecer pacote' : 'Retomar quem sumiu', onClick: () => setQueueOpen('evaluation'),
            error: commercial.queueErrors.evaluation, onRetry: commercial.reloadQueues,
        },
        {
            key: 'nextDay', count: nextDayPending, tone: 'info', title: `${nextDayLabel.charAt(0).toUpperCase()}${nextDayLabel.slice(1)} sem confirmação`,
            detail: commercial.nextDay ? `de ${commercial.nextDay.total} sessões${commercial.nextDay.date === tomorrowYmd ? ' de amanhã' : ''}` : '',
            cta: 'Confirmar agora', onClick: () => setQueueOpen('nextDay'),
            error: commercial.queueErrors.nextDay, onRetry: commercial.reloadQueues,
        },
        {
            key: 'pre', count: preStats?.total || 0, tone: 'warn', title: 'Pré-agendamentos',
            detail: preStats ? [preStats.semContato ? `${preStats.semContato} sem contato` : '', preStats.urgentes ? `${preStats.urgentes} urgentes` : ''].filter(Boolean).join(' · ') || 'a confirmar' : '',
            cta: 'Abrir pré-agendamentos', onClick: () => onNavigate?.('Pré-Agendamentos'),
            error: preStatsError, onRetry: loadPreStats,
        },
        {
            key: 'lateEvo', count: lateEvo.data?.total || 0, tone: 'bad', title: 'Evoluções em atraso',
            detail: lateEvolutionsDetail(lateEvo.data), cta: 'Ver por terapeuta', onClick: () => setQueueOpen('lateEvo'),
            error: lateEvo.error, onRetry: lateEvo.reload,
        },
        {
            key: 'pay', count: stats?.pendingPayments || 0, tone: 'bad', title: 'Pagamentos em aberto',
            detail: 'pendentes ou parciais', cta: 'Abrir recebimentos', onClick: () => onNavigate?.('Caixa'),
        },
        {
            key: 'leads', count: opCounts.total || 0, tone: 'info', title: 'Leads para retornar',
            detail: [opCounts.overdue ? `${opCounts.overdue} atrasados` : '', opCounts.today ? `${opCounts.today} para hoje` : ''].filter(Boolean).join(' · '),
            cta: 'Abrir leads', onClick: () => onNavigate?.('Leads'),
            error: opCounts.error, onRetry: opCounts.reload,
        },
        {
            key: 'renewal', count: commercial.packageEnding?.length || 0, tone: 'warn', title: 'Pacote acabando',
            detail: (() => {
                const list = commercial.packageEnding || [];
                const last = list.filter(i => i.remaining <= 1).length;
                return last ? `${last} na última sessão ou sem sessões · renovar` : '80% do pacote feito · oferecer renovação';
            })(),
            cta: 'Ver e renovar', onClick: () => setQueueOpen('renewal'),
            error: commercial.queueErrors.packageEnding, onRetry: commercial.reloadQueues,
        },
        {
            key: 'churn', count: commercial.churn?.length || 0, tone: 'bad', title: 'Risco de evasão',
            detail: (() => {
                const list = commercial.churn || [];
                const oldest = list.reduce((m, i) => Math.max(m, i.daysSince ?? 0), 0);
                return oldest ? `há até ${oldest} dias sem agendamento · reengajar` : 'reengajar';
            })(),
            cta: 'Ver e reengajar', onClick: () => setQueueOpen('churn'),
            error: commercial.queueErrors.churn, onRetry: commercial.reloadQueues,
        },
        {
            key: 'reactivation', count: commercial.reactivation?.length || 0, tone: 'bad', title: 'Sem próxima sessão',
            detail: (() => {
                const list = commercial.reactivation || [];
                const recent = list.filter(i => (i.daysSince ?? 0) <= 21).length;
                return recent ? `${recent} sem vir há até 3 semanas · chamar de volta` : 'chamar de volta';
            })(),
            cta: 'Ver e reativar', onClick: () => setQueueOpen('reactivation'),
            error: commercial.queueErrors.reactivation, onRetry: commercial.reloadQueues,
        },
        {
            key: 'bday', count: (aniversariantesMeta.todayPending || 0) + birthdayLate.length, tone: 'pink',
            title: (aniversariantesMeta.todayPending || 0) + birthdayLate.length === 1 ? 'Aniversariante sem parabéns' : 'Aniversariantes sem parabéns',
            detail: [
                birthdayToday.length ? `hoje: ${birthdayToday.map(b => b.fullName.split(' ')[0]).join(', ')}` : '',
                birthdayLate.length ? (birthdayLate.length === 1 ? '1 já passou' : `${birthdayLate.length} já passaram`) : '',
            ].filter(Boolean).join(' · ') || 'hoje',
            cta: birthdayLate.length ? 'Ver e mandar' : 'Enviar parabéns', onClick: openBirthdays,
        },
    ];

    const safeDoctors = doctors || [];
    const safePatients = useMemo(() => mapPatientListResponseDTO(patients || []), [patients]);
    const displayedDoctors = useMemo(() => (showAllDoctors ? safeDoctors : safeDoctors.slice(0, 6)), [safeDoctors, showAllDoctors]);

    const todayStr = localDay();
    const tomorrowStr = localDay(new Date(Date.now() + 86400000));
    const upcoming = useMemo(() => {
        const list = [...(upcomingAppointments || [])].sort((a, b) => (apptDay(a.date) + (a.time || '')).localeCompare(apptDay(b.date) + (b.time || '')));
        return {
            all: list,
            today: list.filter(a => apptDay(a.date) === todayStr),
            tomorrow: list.filter(a => apptDay(a.date) === tomorrowStr),
            unconfirmed: list.filter(a => !a.confirmed && ['scheduled', 'pre_agendado'].includes(a.status)),
        };
    }, [upcomingAppointments, todayStr, tomorrowStr]);
    const upcomingShown = upcoming[upcomingFilter];
    // Contagem real vem do back (stats.upcomingCounts); a lista pode ser parcial (até 50).
    const upcomingCount = (k: keyof typeof upcoming) => stats?.upcomingCounts?.[k] ?? upcoming[k].length;

    const weekdayOnly = useCallback(<T extends { date: string }>(rows: T[]) => rows.filter(r => {
        const [y, m, d] = r.date.split('-').map(Number);
        const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        return wd !== 0 && wd !== 6;
    }), []);
    const sessionsRows = useMemo(() => weekdayOnly((charts?.appointmentsChart || []).map(r => ({ date: r.date, value: r.count }))), [charts, weekdayOnly]);
    const cashRows = useMemo(() => weekdayOnly((charts?.revenueChart || []).map(r => ({ date: r.date, value: r.value }))), [charts, weekdayOnly]);
    const originRows = useMemo(() => (charts?.leadsByOrigin || []).map(r => ({ label: originLabel(r._id), value: r.count })).sort((a, b) => b.value - a.value).slice(0, 6), [charts]);
    const specialtyRows = useMemo(() => (charts?.patientsBySpecialty || []).map(r => ({ label: getSpecialtyLabel(r._id || undefined), value: r.count })).sort((a, b) => b.value - a.value).slice(0, 6), [charts]);

    const formattedLastUpdated = useMemo(() => {
        if (!stats?.calculatedAt) return '';
        return new Date(stats.calculatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }, [stats?.calculatedAt]);

    if (loading && !stats) {
        return (
            <div className="space-y-4 p-4 sm:p-5" aria-busy="true">
                <div className="h-[150px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
                <div className="h-[420px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 text-left sm:p-5">
            {/* Topo */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {formattedLastUpdated ? ` · atualizado às ${formattedLastUpdated}` : ''}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleRefreshAll}
                    disabled={loading}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden />
                    Atualizar
                </button>
            </div>

            {/* 0. Lead novo esperando resposta (aprovado em 30/10) */}
            <LeadsWaitingStrip items={commercial.leadsWaiting} onOpenLeads={onNavigate ? () => onNavigate('Leads') : undefined} onChanged={commercial.reloadLeads} />

            {/* Evasão acima do normal (pico mensal de pacientes que pararam, 07/11) */}
            <StoppedAlertStrip alert={stopped.data?.alert ?? null} onOpen={openStopped} />

            {/* 1. Hoje: os números que antes ficavam recolhidos em "Números da clínica", agora sempre à vista */}
            {stats ? (
                <section aria-label="Hoje" className="overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800/40">
                    <div className="grid grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
                        <div className="col-span-2 lg:col-span-1">
                            <HeroFigure
                                label="Sessões hoje"
                                value={stats.todayAppointments}
                                onClick={openTodaySessionsModal}
                                detail={todayLoading && !todayLoaded ? 'carregando…' : todayError && !todayLoaded ? 'não foi possível carregar a quebra do dia' : `${plural(todaySummary.done, 'realizada', 'realizadas')} · ${plural(todaySummary.missed, 'falta', 'faltas')} · ${todaySummary.todo + todaySummary.pre} a fazer`}
                            >
                                {todayLoaded && <TodayBar s={todaySummary} />}
                            </HeroFigure>
                        </div>
                        <HeroFigure label="Caixa hoje" value={formatCurrency(stats.todayRevenue)} tone="money" detail="recebido hoje" />
                        <HeroFigure label="Caixa do mês" value={formatCurrency(stats.monthRevenue)} detail="recebido no mês (regra do caixa)" />
                    </div>
                    <div className="grid grid-cols-2 border-t border-gray-200/80 sm:grid-cols-3 lg:grid-cols-5 dark:border-gray-700/60">
                        <StatTile label="Semana até hoje" value={stats.weekAppointments} detail="sessões, sem as canceladas" />
                        <StatTile label="Pagamentos em aberto" value={stats.pendingPayments} detail="pendentes ou parciais" onClick={onNavigate ? () => onNavigate('Caixa') : undefined} />
                        <StatTile label="Leads do mês" value={stats.monthLeads} detail="novos interessados" onClick={onNavigate ? () => onNavigate('Leads') : undefined} />
                        <StatTile
                            label="Pacientes"
                            value={stats.totalPatients.toLocaleString('pt-BR')}
                            detail={`cadastrados · ${stats.totalDoctors} profissionais`}
                            action={
                                <span className="flex shrink-0 gap-0.5">
                                    <button type="button" onClick={handleAddPatient} title="Novo paciente" aria-label="Novo paciente" className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-emerald-700 dark:hover:bg-gray-900"><UserPlus size={16} /></button>
                                    <button type="button" onClick={handleAddProfessional} title="Novo profissional" aria-label="Novo profissional" className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-emerald-700 dark:hover:bg-gray-900"><Stethoscope size={16} /></button>
                                </span>
                            }
                        />
                        {stats.recurring && <RecurringPatientsTile recurring={stats.recurring} />}
                    </div>
                </section>
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">Sem números para mostrar agora.</p>
            )}

            {/* 2. Precisa de você */}
            <NeedsYou items={needItems} loading={!preStats} />
            {queueOpen === 'lateEvo' && lateEvo.data && <LateEvolutionsPanel data={lateEvo.data} onClose={() => setQueueOpen(null)} />}
            {queueOpen === 'renewal' && <PackageEndingPanel items={commercial.packageEnding || []} onClose={() => setQueueOpen(null)} onChanged={commercial.reloadQueues} />}
            {queueOpen === 'churn' && <ChurnPanel items={commercial.churn || []} onClose={() => setQueueOpen(null)} onChanged={commercial.reloadQueues} />}
            {queueOpen === 'reactivation' && <ReactivationPanel items={commercial.reactivation || []} onClose={() => setQueueOpen(null)} onChanged={commercial.reloadQueues} />}
            {queueOpen === 'evaluation' && <EvaluationPanel queue={commercial.evaluation ?? { items: [], total: 0, potentialMonthly: 0 }} onClose={() => setQueueOpen(null)} onChanged={commercial.reloadQueues} />}
            {queueOpen === 'nextDay' && commercial.nextDay && <NextDayConfirmPanel queue={commercial.nextDay} onClose={() => setQueueOpen(null)} onChanged={commercial.reloadQueues} onOpenAgenda={onNavigate ? () => { setQueueOpen(null); onNavigate('Calendário'); } : undefined} />}

            {/* 3. Aniversariantes: sempre à vista (Kadu 10/11), o comercial manda o parabéns daqui */}
            <section id="dash-aniversariantes" aria-labelledby="dash-aniversariantes-t" className={`scroll-mt-4 rounded-2xl border bg-white p-4 sm:p-5 dark:bg-gray-900 ${bdayAlertCount
                ? 'border-pink-300 ring-4 ring-pink-100 dark:border-pink-500/50 dark:ring-pink-500/10'
                : 'border-gray-200 dark:border-gray-800'}`}>
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300" aria-hidden><Cake size={18} /></span>
                    <div className="min-w-0 flex-1">
                        <h2 id="dash-aniversariantes-t" className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-50">
                            Aniversariantes de {monthName}
                            {bdayAlertCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-600 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-pink-500 dark:text-gray-950">
                                    <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>
                                    {bdayAlertCount === 1 ? '1 hoje sem parabéns' : `${bdayAlertCount} hoje sem parabéns`}
                                </span>
                            )}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {aniversariantesLoading && !aniversariantes.length ? 'carregando…' : `${aniversariantes.length} no mês · ${birthdayWeek} nos próximos 7 dias`}
                            {' · '}o parabéns automático sai às 10h do dia
                        </p>
                    </div>
                </div>
                {aniversariantesLoading && !aniversariantes.length ? <BirthdayCardSkeleton /> : <BirthdayList key={aniversariantes.length} patients={aniversariantes} onSent={handleBirthdayMessageSent} />}
            </section>

            {/* 4. Panorama: agenda de hoje, próximas, gráficos, origem/especialidade e evasão em abas.
                Abas em grade (cabem sempre, sem barra de rolagem), cada uma com um resumo do que tem dentro. */}
            <section id="dash-panorama" aria-label="Panorama" className="scroll-mt-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div role="tablist" aria-label="Panorama" className="grid grid-cols-2 gap-1 rounded-t-2xl border-b border-gray-200 bg-gray-50 p-1.5 sm:grid-cols-3 xl:grid-cols-5 dark:border-gray-800 dark:bg-gray-800/40">
                    {([
                        ['today', 'Agenda de hoje', <CalendarClock key="i" size={16} />, todayByDoctor.length ? plural(todayByDoctor.length, 'profissional', 'profissionais') : 'sem sessões', null],
                        ['upcoming', 'Próximas sessões', <Clock key="i" size={16} />, `${upcomingCount('all')} em 7 dias`, upcomingCount('unconfirmed') ? `${upcomingCount('unconfirmed')} sem confirmar` : null],
                        ['charts', 'Sessões e caixa', <LineChart key="i" size={16} />, 'por dia · 14 dias', null],
                        ['mix', 'Leads e especialidades', <PieChart key="i" size={16} />, 'origem · últimos 30 dias', null],
                        ['stopped', 'Pacientes que pararam', <TrendingDown key="i" size={16} />, 'últimos 6 meses', stopped.data?.alert ? 'acima do normal' : null],
                    ] as Array<[PanTab, string, React.ReactNode, string, string | null]>).map(([key, label, icon, hint, alert], i) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={panTab === key}
                            onClick={() => setPanTab(key)}
                            className={`flex min-h-[60px] min-w-0 items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''} ${panTab === key
                                ? 'bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700'
                                : 'hover:bg-white/70 dark:hover:bg-gray-900/60'}`}
                        >
                            <span aria-hidden className={`mt-0.5 shrink-0 ${panTab === key ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{icon}</span>
                            <span className="min-w-0">
                                <span className={`block truncate text-sm font-semibold ${panTab === key ? 'text-gray-900 dark:text-gray-50' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
                                <span className={`block truncate text-xs ${alert ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{alert || hint}</span>
                            </span>
                        </button>
                    ))}
                </div>
                <div role="tabpanel" className="p-4 sm:p-5">
                    {panTab === 'today' && (
                        <>
                {todayLoading && !todayLoaded ? (
                    <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}</div>
                ) : (
                    <div className="space-y-4">
                        {todayByDoctor.length === 0 ? (
                            todayError && !todayLoaded ? (
                                <p className="text-sm text-amber-800 dark:text-amber-300">Não foi possível carregar as sessões de hoje. <button type="button" onClick={() => loadTodaySessions(true)} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Tentar de novo</button></p>
                            ) : <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma sessão hoje.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[520px] text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
                                            <th className="py-2 pr-3 font-semibold">Profissional</th>
                                            <th className="px-3 py-2 text-right font-semibold">Hoje</th>
                                            <th className="px-3 py-2 text-right font-semibold">Realizadas</th>
                                            <th className="px-3 py-2 text-right font-semibold">Faltas</th>
                                            <th className="py-2 pl-3 text-right font-semibold">Próxima</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayByDoctor.map(r => (
                                            <tr key={r.name} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                                                <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-100">{r.name}</td>
                                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{r.total}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.done}</td>
                                                <td className={`px-3 py-2.5 text-right tabular-nums ${r.missed ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>{r.missed || '—'}</td>
                                                <td className="py-2.5 pl-3 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.next || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {/* Total de pacientes por profissional (era a "Visão geral dos profissionais"). */}
                        {safeDoctors.length > 0 && (
                            <div>
                                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-50">Pacientes por profissional</h3>
                                <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {displayedDoctors.map((doctor, index) => (
                                        <li key={doctor._id || index} className="flex items-center gap-3 border-b border-gray-100 py-2 dark:border-gray-800">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{getInitials(doctor.name)}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-gray-900 dark:text-gray-100">{doctor.name}</span>
                                                <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{getSpecialtyLabel(doctor.specialty)}</span>
                                            </span>
                                            <span className="text-sm tabular-nums text-gray-700 dark:text-gray-300"><b className="text-gray-900 dark:text-gray-100">{doctor.patients}</b> pac.</span>
                                        </li>
                                    ))}
                                </ul>
                                {safeDoctors.length > 6 && (
                                    <button type="button" onClick={() => setShowAllDoctors(v => !v)} className="mt-2 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                                        {showAllDoctors ? 'Mostrar menos' : `Ver todos (${safeDoctors.length})`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                        </>
                    )}
                    {panTab === 'upcoming' && (
                        <>
                            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{upcomingCount('all')} nos próximos 7 dias · {upcomingCount('unconfirmed')} não confirmadas</p>
                <div className="mb-3 flex flex-wrap gap-2">
                    <Chip active={upcomingFilter === 'all'} onClick={() => setUpcomingFilter('all')}>Todas <b className="tabular-nums">{upcomingCount('all')}</b></Chip>
                    <Chip active={upcomingFilter === 'today'} onClick={() => setUpcomingFilter('today')}>Hoje <b className="tabular-nums">{upcomingCount('today')}</b></Chip>
                    <Chip active={upcomingFilter === 'tomorrow'} onClick={() => setUpcomingFilter('tomorrow')}>Amanhã <b className="tabular-nums">{upcomingCount('tomorrow')}</b></Chip>
                    <Chip active={upcomingFilter === 'unconfirmed'} onClick={() => setUpcomingFilter('unconfirmed')}>Não confirmadas <b className="tabular-nums">{upcomingCount('unconfirmed')}</b></Chip>
                </div>
                {upcomingShown.length < upcomingCount(upcomingFilter) && (
                    <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                        Mostrando as {upcomingShown.length} primeiras de {upcomingCount(upcomingFilter)}.{' '}
                        <button type="button" onClick={() => onNavigate?.('Calendário')} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">Ver todas na Agenda</button>
                    </p>
                )}
                {upcomingShown.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma sessão neste filtro.</p>
                ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {upcomingShown.map((a, index) => {
                            const cfg = getStatusConfig(a.status as any);
                            const day = apptDay(a.date);
                            const when = day === todayStr ? relTime(minutesUntil(a.time)) : day === tomorrowStr ? 'amanhã' : dayLabel(day);
                            return (
                                <li key={a._id || index} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                                    <span>
                                        <span className="block font-bold tabular-nums text-gray-900 dark:text-gray-50">{a.time}</span>
                                        <span className="block text-xs text-gray-600 dark:text-gray-400">{when}</span>
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{a.patientName}</span>
                                        <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                                            {a.professionalName}{a.specialty ? ` · ${getSpecialtyLabel(a.specialty)}` : ''}
                                        </span>
                                    </span>
                                    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                        </>
                    )}
                    {panTab === 'charts' && (
                        <>
                            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Últimos 14 dias, sem fim de semana.</p>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <DayBars title="Sessões por dia" rows={sessionsRows} fmt={v => String(v)} unit="sessões" />
                                <DayBars title="Caixa por dia" rows={cashRows} fmt={formatCurrencyShort} unit="recebidos" />
                            </div>
                        </>
                    )}
                    {panTab === 'mix' && (
                        <>
                            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Leads do mês · pacientes atendidos em 30 dias.</p>
                            <div className="grid gap-3 lg:grid-cols-2">
                                <HBars title="Leads dos últimos 30 dias por origem" rows={originRows} empty="Nenhum lead nos últimos 30 dias." />
                                <HBars title="Pacientes por especialidade" rows={specialtyRows} empty="Sem atendimentos nos últimos 30 dias." />
                            </div>
                        </>
                    )}
                    {panTab === 'stopped' && (
                        <>
                            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">Últimos 6 meses fechados. Para ligar, use as filas "Risco de evasão" e "Sem próxima sessão".</p>
                            <StoppedTrendPanel data={stopped.data} error={stopped.error} onRetry={stopped.reload} />
                        </>
                    )}
                </div>
            </section>

            {/* 5. Lista de pacientes (aberta por padrão, decisão do Kadu 29/10) */}
            <Section
                title="Lista de pacientes"
                meta={stats?.totalPatients ? `${stats.totalPatients.toLocaleString('pt-BR')} cadastrados` : undefined}
                isOpen={patientsTableOpen}
                onToggle={() => setPatientsTableOpen(v => !v)}
                icon={<Users size={18} />}
            >
                <PatientTable
                    patients={safePatients}
                    isRefreshing={loading}
                    onEditPatient={(patient) => { setPatientToEdit(patient); setIsModalOpen(true); }}
                    onPaymentAdvancedSuccess={(patient) => { setShowAdvancedPayment?.(true); setSelectedPatient?.(patient); }}
                    onRegisterPayment={(patient) => { setPaymentContext?.({ mode: 'create', patient }); setPaymentModalOpen?.(true); }}
                    onDeletePatient={onDeletePatient}
                    totalCount={stats?.totalPatients}
                    noNextCount={commercial.reactivation?.length || 0}
                    onOpenNoNext={() => setQueueOpen('reactivation')}
                />
            </Section>

            {/* Modal: Sessões de hoje (todas, paginadas) */}
            <Dialog
                open={todaySessionsModalOpen}
                onClose={() => setTodaySessionsModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden' } }}
            >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                    <div>
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Sessões de hoje</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {todayLoading ? 'Carregando…' : `${sortedToday.length} no total · ${plural(todaySummary.done,'realizada','realizadas')} · ${plural(todaySummary.missed,'falta','faltas')} · ${plural(todaySummary.canceled,'cancelada','canceladas')} · ${todaySummary.todo + todaySummary.pre} a fazer`}
                        </p>
                    </div>
                    <button type="button" onClick={() => setTodaySessionsModalOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fechar"><X size={18} /></button>
                </div>
                <DialogContent className="!px-3 !py-2">
                    {todayLoading ? (
                        <div className="space-y-1 py-2">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}
                        </div>
                    ) : sortedToday.length > 0 ? (
                        <>
                            <ul className="py-1">
                                {paginatedTodaySessions.map((session, index) => {
                                    const cfg = getStatusConfig(session.operationalStatus as any);
                                    return (
                                        <li key={session._id || index} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                                            <span className="font-bold tabular-nums text-gray-900 dark:text-gray-50">{session.time}</span>
                                            <span className="min-w-0">
                                                <span className="block truncate font-medium text-gray-900 dark:text-gray-100">{session.patientName}</span>
                                                <span className="block truncate text-xs text-gray-600 dark:text-gray-400">
                                                    {session.doctor?.fullName || session.professional || ''}{session.specialty ? ` · ${getSpecialtyLabel(session.specialty)}` : ''}
                                                </span>
                                            </span>
                                            <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>{cfg.label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <Pagination
                                page={todaySessionsPage}
                                totalPages={todaySessionsTotalPages}
                                onPageChange={setTodaySessionsPage}
                                accentClassName="bg-emerald-600"
                                className="border-t border-gray-100 px-2 pb-1 pt-4 dark:border-gray-800"
                            />
                        </>
                    ) : (
                        <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">{todayError ? 'Não foi possível carregar as sessões de hoje.' : 'Nenhuma sessão hoje.'}</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default memo(DashboardContentOptimized);
