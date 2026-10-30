import {
    AlertCircle, BarChart3, Cake, CalendarClock, ChevronDown, ChevronRight,
    Clock, CreditCard, LineChart, PieChart, RefreshCw, Stethoscope, UserPlus, Users, X
} from 'lucide-react';
import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton as MuiSkeleton, Dialog, DialogContent } from '@mui/material';
import { mapPatientListResponseDTO } from '../../dtos/patient.response.dto';
import API from '../../services/api';
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

import BirthdayCard from '../patients/BirthdayCard';
import PatientTable from '../patients/PatientTable';

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
    <div className="flex flex-wrap gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[260px] max-w-[calc(33.333%-11px)] border border-gray-100 rounded-2xl p-4 space-y-3 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <MuiSkeleton variant="circular" width={56} height={56} sx={{ bgcolor: '#CBD5E020', flexShrink: 0 }} />
                    <div className="flex-1 space-y-1.5">
                        <MuiSkeleton variant="text" width="70%" height={22} />
                        <MuiSkeleton variant="text" width="45%" height={18} />
                    </div>
                </div>
                <MuiSkeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: 12 }} />
            </div>
        ))}
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

// --- StatTile: número em tinta normal, rótulo e detalhe ---

const StatTile = memo<{
    label: string; value: React.ReactNode; detail?: React.ReactNode; onClick?: () => void; action?: React.ReactNode;
}>(({ label, value, detail, onClick, action }) => {
    const Tag: any = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={`group relative flex min-w-0 flex-col items-start rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-700 dark:bg-gray-900 ${onClick ? 'transition-colors hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:border-emerald-700' : ''}`}
        >
            <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                {label}
                {onClick && <ChevronRight size={15} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden />}
                {action}
            </span>
            <span className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-gray-900 dark:text-gray-50">{value}</span>
            {detail && <span className="mt-1.5 text-xs leading-4 text-gray-600 dark:text-gray-400">{detail}</span>}
        </Tag>
    );
});
StatTile.displayName = 'StatTile';

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

const Section = memo<SectionProps>(({ id, title, isOpen, onToggle, children, icon, meta, note }) => (
    <section id={id} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-gray-800/60"
            onClick={onToggle}
            aria-expanded={isOpen}
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" aria-hidden>{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="block font-semibold text-gray-900 dark:text-gray-50">{title}</span>
                {meta && <span className="block text-xs text-gray-600 dark:text-gray-400">{meta}</span>}
            </span>
            {!isOpen && note}
            <ChevronDown size={18} className={`shrink-0 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        {isOpen && <div className="border-t border-gray-100 p-4 dark:border-gray-800">{children}</div>}
    </section>
));
Section.displayName = 'Section';

// --- Precisa de você ---

interface NeedItem { key: string; count: number; title: string; detail: string; cta: string; onClick: () => void; tone: 'warn' | 'bad' | 'info' | 'pink' }

const TONE: Record<NeedItem['tone'], string> = {
    warn: 'text-amber-700 dark:text-amber-400',
    bad: 'text-red-700 dark:text-red-400',
    info: 'text-blue-700 dark:text-blue-400',
    pink: 'text-pink-700 dark:text-pink-400',
};

const NeedsYou = memo<{ items: NeedItem[]; loading: boolean }>(({ items, loading }) => {
    const visible = items.filter(i => i.count > 0);
    return (
        <section aria-labelledby="precisa-de-voce" className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" aria-hidden />
                <h2 id="precisa-de-voce" className="text-base font-bold text-gray-900 dark:text-gray-50">Precisa de você hoje</h2>
            </div>
            {loading && visible.length === 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map(i => <div key={i} className="h-[92px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}
                </div>
            ) : visible.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">Nada pendente agora. Pré-agendamentos, pagamentos, leads e aniversários estão em dia.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {visible.map(item => (
                        <button
                            key={item.key}
                            type="button"
                            onClick={item.onClick}
                            className="group flex min-w-0 flex-col items-start rounded-lg border border-gray-200 p-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-gray-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/5"
                        >
                            <span className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold tabular-nums ${TONE[item.tone]}`}>{item.count}</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-50">{item.title}</span>
                            </span>
                            <span className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{item.detail}</span>
                            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                {item.cta} <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </span>
                        </button>
                    ))}
                </div>
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
        <figure className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
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
        <div className="min-w-0 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
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
    const [birthdaySectionOpen, setBirthdaySectionOpen] = useState(false);
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    const [numbersOpen, setNumbersOpen] = useState(false);
    const [chartsOpen, setChartsOpen] = useState(false);
    const [todayByDoctorOpen, setTodayByDoctorOpen] = useState(false);
    const [upcomingOpen, setUpcomingOpen] = useState(false);
    const [mixOpen, setMixOpen] = useState(false);
    const [showAllDoctors, setShowAllDoctors] = useState(false);
    const [upcomingFilter, setUpcomingFilter] = useState<'all' | 'today' | 'tomorrow' | 'unconfirmed'>('all');

    // --- Sessões de hoje (lista completa): usada no modal, na quebra "realizadas/faltas/a fazer"
    // e na agenda por profissional. Busca uma vez, sob demanda.
    const [todaySessions, setTodaySessions] = useState<TodayAppt[]>([]);
    const [todayLoading, setTodayLoading] = useState(false);
    const [todayLoaded, setTodayLoaded] = useState(false);
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
        } catch {
            setTodaySessions([]);
        } finally {
            todayFetching.current = false;
            setTodayLoading(false);
        }
    }, [todayLoaded]);

    useEffect(() => {
        if (numbersOpen || todayByDoctorOpen) loadTodaySessions();
    }, [numbersOpen, todayByDoctorOpen, loadTodaySessions]);

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
        daysUntil: number; birthdayMessageSent?: boolean;
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

    useEffect(() => { if (birthdaySectionOpen) fetchAniversariantes(); }, [birthdaySectionOpen, fetchAniversariantes]);
    // O "Precisa de você" precisa da contagem mesmo com a seção fechada; adiado para não competir com a carga inicial.
    useEffect(() => { const t = setTimeout(fetchAniversariantes, 1500); return () => clearTimeout(t); }, [fetchAniversariantes]);
    const handleBirthdayMessageSent = useCallback(() => { loadAniversariantes(true); }, [loadAniversariantes]);
    useEffect(() => {
        if (!aniversariantesFetched.current) return;
        const t = setTimeout(() => { loadAniversariantes(true); }, 1000);
        return () => clearTimeout(t);
    }, [patients, loadAniversariantes]);

    // --- Pré-agendamentos e leads para o "Precisa de você" ---
    const [preStats, setPreStats] = useState<{ total: number; semContato: number; urgentes: number } | null>(null);
    const loadPreStats = useCallback(async () => {
        try {
            const res = await API.get('/v2/pre-appointments/stats/dashboard');
            const d = res.data?.data ?? res.data;
            setPreStats({ total: d?.total || 0, semContato: d?.semContato || 0, urgentes: d?.urgentes || 0 });
        } catch {
            setPreStats({ total: 0, semContato: 0, urgentes: 0 });
        }
    }, []);
    useEffect(() => { loadPreStats(); }, [loadPreStats]);
    const opCounts = useOperationalCounts();

    const handleRefreshAll = useCallback(() => {
        onRefresh();
        loadPreStats();
        if (aniversariantesFetched.current) loadAniversariantes(true);
        if (todayLoaded) loadTodaySessions(true);
    }, [onRefresh, loadPreStats, loadAniversariantes, todayLoaded, loadTodaySessions]);

    const openBirthdays = useCallback(() => {
        setBirthdaySectionOpen(true);
        requestAnimationFrame(() => document.getElementById('dash-aniversariantes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }, []);

    const birthdayToday = useMemo(() => aniversariantes.filter(a => a.daysUntil === 0 && !a.birthdayMessageSent), [aniversariantes]);

    const needItems: NeedItem[] = [
        {
            key: 'pre', count: preStats?.total || 0, tone: 'warn', title: 'Pré-agendamentos',
            detail: preStats ? [preStats.semContato ? `${preStats.semContato} sem contato` : '', preStats.urgentes ? `${preStats.urgentes} urgentes` : ''].filter(Boolean).join(' · ') || 'a confirmar' : '',
            cta: 'Abrir pré-agendamentos', onClick: () => onNavigate?.('Pré-Agendamentos'),
        },
        {
            key: 'pay', count: stats?.pendingPayments || 0, tone: 'bad', title: 'Pagamentos em aberto',
            detail: 'pendentes ou parciais', cta: 'Abrir financeiro', onClick: () => onNavigate?.('Financeiro'),
        },
        {
            key: 'leads', count: opCounts.total || 0, tone: 'info', title: 'Leads para retornar',
            detail: [opCounts.overdue ? `${opCounts.overdue} atrasados` : '', opCounts.today ? `${opCounts.today} para hoje` : ''].filter(Boolean).join(' · '),
            cta: 'Abrir leads', onClick: () => onNavigate?.('Leads'),
        },
        {
            key: 'bday', count: aniversariantesMeta.todayPending || 0, tone: 'pink',
            title: aniversariantesMeta.todayPending === 1 ? 'Aniversariante sem parabéns' : 'Aniversariantes sem parabéns',
            detail: birthdayToday.map(b => b.fullName).join(', ') || 'hoje', cta: 'Enviar parabéns', onClick: openBirthdays,
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
            unconfirmed: list.filter(a => ['scheduled', 'pending', 'pre_agendado'].includes(a.status)),
        };
    }, [upcomingAppointments, todayStr, tomorrowStr]);
    const upcomingShown = upcoming[upcomingFilter];

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
        <div className="space-y-3 p-4 text-left sm:p-5">
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

            {/* 1. Precisa de você */}
            <NeedsYou items={needItems} loading={!preStats} />

            {/* 2. Aniversariantes */}
            <Section
                id="dash-aniversariantes"
                title="Aniversariantes do mês"
                meta={aniversariantesFetched.current ? `${aniversariantes.length} no mês${aniversariantesMeta.todayTotal ? ` · ${aniversariantesMeta.todayTotal} hoje` : ''}` : undefined}
                isOpen={birthdaySectionOpen}
                onToggle={() => setBirthdaySectionOpen(v => !v)}
                icon={<Cake size={17} />}
                note={aniversariantesMeta.todayPending > 0 ? (
                    <span role="status" className="hidden items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1 text-sm font-semibold text-pink-700 sm:inline-flex dark:bg-pink-500/15 dark:text-pink-300">
                        <Cake size={14} aria-hidden />
                        {aniversariantesMeta.todayPending === 1 ? '1 aniversariante hoje' : `${aniversariantesMeta.todayPending} aniversariantes hoje`}
                    </span>
                ) : undefined}
            >
                {aniversariantesLoading ? <BirthdayCardSkeleton /> : <BirthdayCard patients={aniversariantes} onSent={handleBirthdayMessageSent} />}
            </Section>

            {/* 3. Lista de pacientes */}
            <Section
                title="Lista de pacientes"
                meta={stats?.totalPatients ? `${stats.totalPatients.toLocaleString('pt-BR')} cadastrados` : undefined}
                isOpen={patientsTableOpen}
                onToggle={() => setPatientsTableOpen(v => !v)}
                icon={<Users size={17} />}
            >
                <PatientTable
                    patients={safePatients}
                    isRefreshing={loading}
                    onEditPatient={(patient) => { setPatientToEdit(patient); setIsModalOpen(true); }}
                    onPaymentAdvancedSuccess={(patient) => { setShowAdvancedPayment?.(true); setSelectedPatient?.(patient); }}
                    onRegisterPayment={(patient) => { setPaymentContext?.({ mode: 'create', patient }); setPaymentModalOpen?.(true); }}
                    onDeletePatient={onDeletePatient}
                />
            </Section>

            {/* 4. Números */}
            <Section
                title="Números da clínica"
                meta={stats ? `${stats.todayAppointments} sessões hoje · ${formatCurrency(stats.monthRevenue)} no mês` : undefined}
                isOpen={numbersOpen}
                onToggle={() => setNumbersOpen(v => !v)}
                icon={<BarChart3 size={17} />}
            >
                {stats ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                        <StatTile
                            label="Sessões hoje"
                            value={stats.todayAppointments}
                            detail={todayLoading && !todayLoaded ? 'carregando…' : `${plural(todaySummary.done,'realizada','realizadas')} · ${plural(todaySummary.missed,'falta','faltas')} · ${todaySummary.todo} a fazer`}
                            onClick={openTodaySessionsModal}
                        />
                        <StatTile label="Semana até hoje" value={stats.weekAppointments} detail="sessões, sem canceladas e pré-agendadas" />
                        <StatTile label="Caixa hoje" value={formatCurrency(stats.todayRevenue)} detail="recebido hoje" />
                        <StatTile label="Receita do mês" value={formatCurrency(stats.monthRevenue)} detail="pagamentos confirmados" />
                        <StatTile label="Pagamentos em aberto" value={stats.pendingPayments} detail="quantidade, pendentes ou parciais" onClick={onNavigate ? () => onNavigate('Financeiro') : undefined} />
                        <StatTile label="Leads do mês" value={stats.monthLeads} detail="novos interessados" onClick={onNavigate ? () => onNavigate('Leads') : undefined} />
                        <StatTile
                            label="Pacientes"
                            value={stats.totalPatients.toLocaleString('pt-BR')}
                            detail={`cadastrados · ${stats.totalDoctors} profissionais`}
                            action={
                                <span className="flex gap-1">
                                    <button type="button" onClick={handleAddPatient} title="Novo paciente" aria-label="Novo paciente" className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-emerald-700 dark:hover:bg-gray-800"><UserPlus size={15} /></button>
                                    <button type="button" onClick={handleAddProfessional} title="Novo profissional" aria-label="Novo profissional" className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-emerald-700 dark:hover:bg-gray-800"><Stethoscope size={15} /></button>
                                </span>
                            }
                        />
                        {stats.recurring && <RecurringPatientsTile recurring={stats.recurring} />}
                    </div>
                ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sem números para mostrar agora.</p>
                )}
            </Section>

            {/* 5. Gráficos */}
            <Section
                title="Sessões e caixa por dia"
                meta="últimos 14 dias, sem fim de semana"
                isOpen={chartsOpen}
                onToggle={() => setChartsOpen(v => !v)}
                icon={<LineChart size={17} />}
            >
                <div className="grid gap-3 lg:grid-cols-2">
                    <DayBars title="Sessões por dia" rows={sessionsRows} fmt={v => String(v)} unit="sessões" />
                    <DayBars title="Caixa por dia" rows={cashRows} fmt={formatCurrencyShort} unit="recebidos" />
                </div>
            </Section>

            {/* 6. Agenda de hoje por profissional */}
            <Section
                title="Agenda de hoje por profissional"
                meta={`${safeDoctors.length} profissionais`}
                isOpen={todayByDoctorOpen}
                onToggle={() => setTodayByDoctorOpen(v => !v)}
                icon={<CalendarClock size={17} />}
            >
                {todayLoading && !todayLoaded ? (
                    <div className="space-y-2">{[0, 1, 2].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />)}</div>
                ) : (
                    <div className="space-y-4">
                        {todayByDoctor.length === 0 ? (
                            <p className="text-sm text-gray-600 dark:text-gray-400">Nenhuma sessão hoje.</p>
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
                                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {displayedDoctors.map((doctor, index) => (
                                        <li key={doctor._id || index} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
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
            </Section>

            {/* 7. Próximas sessões */}
            <Section
                title="Próximas sessões"
                meta={`${upcoming.all.length} nos próximos dias · ${upcoming.unconfirmed.length} não confirmadas`}
                isOpen={upcomingOpen}
                onToggle={() => setUpcomingOpen(v => !v)}
                icon={<Clock size={17} />}
            >
                <div className="mb-3 flex flex-wrap gap-2">
                    <Chip active={upcomingFilter === 'all'} onClick={() => setUpcomingFilter('all')}>Todas <b className="tabular-nums">{upcoming.all.length}</b></Chip>
                    <Chip active={upcomingFilter === 'today'} onClick={() => setUpcomingFilter('today')}>Hoje <b className="tabular-nums">{upcoming.today.length}</b></Chip>
                    <Chip active={upcomingFilter === 'tomorrow'} onClick={() => setUpcomingFilter('tomorrow')}>Amanhã <b className="tabular-nums">{upcoming.tomorrow.length}</b></Chip>
                    <Chip active={upcomingFilter === 'unconfirmed'} onClick={() => setUpcomingFilter('unconfirmed')}>Não confirmadas <b className="tabular-nums">{upcoming.unconfirmed.length}</b></Chip>
                </div>
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
            </Section>

            {/* 8. Leads e especialidades */}
            <Section
                title="Leads por origem e pacientes por especialidade"
                meta="leads do mês · pacientes atendidos em 30 dias"
                isOpen={mixOpen}
                onToggle={() => setMixOpen(v => !v)}
                icon={<PieChart size={17} />}
            >
                <div className="grid gap-3 lg:grid-cols-2">
                    <HBars title="Leads do mês por origem" rows={originRows} empty="Nenhum lead no mês." />
                    <HBars title="Pacientes por especialidade" rows={specialtyRows} empty="Sem atendimentos nos últimos 30 dias." />
                </div>
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
                        <p className="py-10 text-center text-sm text-gray-600 dark:text-gray-400">Nenhuma sessão hoje.</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default memo(DashboardContentOptimized);
