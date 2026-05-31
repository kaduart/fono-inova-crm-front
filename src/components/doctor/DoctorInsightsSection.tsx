/**
 * DoctorInsightsSection — camada de visualização de analytics clínico.
 *
 * Componente dumb: recebe tudo via props de useDoctorInsights().
 * Não faz fetch, não conhece a origem dos dados.
 *
 * Fase 2: quando /v2/analytics/* estiver pronto, só o hook muda.
 */

import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Tooltip,
} from 'chart.js';
import { AlertTriangle, Activity, Calendar, CalendarPlus, CheckCircle, ChevronDown, ChevronUp, Clock, History, RefreshCw, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, Chip, LinearProgress, Skeleton, Typography } from '@mui/material';
import type { DoctorInsights, TimeRange } from '../../hooks/useDoctorInsights';
import type { PatientRisk } from '../../utils/derivePatientRisk';
import { formatDateBrazilian } from '../../utils/dateFormat';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    insights: DoctorInsights | null;
    loading: boolean;
    error: string | null;
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    onRefresh: () => void;
    onPatientClick?: (patientId: string, patientName: string) => void;
    onSchedule?: (patientId: string, patientName: string, hints?: { lastSessionType?: string }) => void;
    onViewHistory?: (patientId: string, patientName: string) => void;
}

// ─── Time range options ───────────────────────────────────────────────────────

const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: '6m', label: '6 meses' },
];

// ─── Risk badge ───────────────────────────────────────────────────────────────

const RISK_CONFIG = {
    high: { label: 'Alto risco', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: '🔴' },
    medium: { label: 'Atenção', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: '🟡' },
    low: { label: 'Ok', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: '🟢' },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" width={80} height={32} />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={96} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton variant="rounded" height={280} />
                <Skeleton variant="rounded" height={280} />
            </div>
            <Skeleton variant="rounded" height={200} />
        </div>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
}

function KPICard({ title, value, icon, color, subtitle }: KPICardProps) {
    return (
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${color}`}>
            <div className="p-2 rounded-xl bg-white/60">
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-800 leading-tight">{value}</p>
                {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

// ─── Risk Patient Row ─────────────────────────────────────────────────────────

interface RiskRowProps {
    risk: PatientRisk;
    onSchedule?: () => void;
    onViewHistory?: () => void;
}

function RiskRow({ risk, onSchedule, onViewHistory }: RiskRowProps) {
    const cfg = RISK_CONFIG[risk.riskLevel];
    return (
        <div className={`p-3 rounded-xl border ${cfg.bg} ${cfg.border} flex flex-col gap-2.5`}>
            {/* Nome + frequência */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0 leading-none">{cfg.icon}</span>
                    <p className="font-semibold text-gray-800 text-sm leading-snug">{risk.patient.fullName}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 ${cfg.text} border ${cfg.border} whitespace-nowrap shrink-0`}>
                    {risk.frequency}%
                </span>
            </div>

            {/* Motivos */}
            <div className="flex flex-wrap gap-1">
                {risk.reasons.map((r, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.text} bg-white/70 border ${cfg.border}`}>
                        {r}
                    </span>
                ))}
            </div>

            {/* Ações */}
            <div className="flex gap-2 flex-wrap pt-1.5 border-t border-white/60">
                {risk.nextAppointment ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                        <Calendar size={13} />
                        {formatDateBrazilian(risk.nextAppointment.date)}
                        {risk.nextAppointment.time && ` às ${risk.nextAppointment.time}`}
                    </span>
                ) : (
                    onSchedule && (
                        <button
                            onClick={onSchedule}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                            <CalendarPlus size={13} />
                            Reagendar
                        </button>
                    )
                )}
                {onViewHistory && (
                    <button
                        onClick={onViewHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
                    >
                        <History size={13} />
                        Histórico
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DoctorInsightsSection({
    insights,
    loading,
    error,
    timeRange,
    onTimeRangeChange,
    onRefresh,
    onPatientClick,
    onSchedule,
    onViewHistory,
}: Props) {
    const [showAllRisk, setShowAllRisk] = useState(false);
    if (loading) return <InsightsSkeleton />;

    if (error) {
        return (
            <div className="flex flex-col items-center py-16 text-gray-500 gap-3">
                <AlertTriangle size={32} className="text-amber-500" />
                <p>{error}</p>
                <button onClick={onRefresh} className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                    <RefreshCw size={14} /> Tentar novamente
                </button>
            </div>
        );
    }

    if (!insights) return null;

    const { sessionTotals, frequencyDistribution, riskPatients, attendanceData } = insights;

    // ── Chart: frequency distribution (donut) ──
    const donutData = {
        labels: frequencyDistribution.map(b => b.label),
        datasets: [{
            data: frequencyDistribution.map(b => b.count),
            backgroundColor: frequencyDistribution.map(b => b.color),
            borderWidth: 2,
            borderColor: '#fff',
        }],
    };

    // ── Chart: attended / missed / canceled (bar) ──
    const barData = {
        labels: ['Realizadas', 'Canceladas', 'Pendentes'],
        datasets: [{
            data: [sessionTotals.attended, sessionTotals.canceled, sessionTotals.pending],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderRadius: 6,
            borderWidth: 0,
        }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        },
    };

    return (
        <div className="space-y-6">

            {/* ── Filtro global de período ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">Período:</span>
                    {TIME_RANGES.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => onTimeRangeChange(value)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                timeRange === value
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                >
                    <RefreshCw size={13} /> Atualizar
                </button>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard
                    title="Pacientes Ativos"
                    value={insights.activePatients}
                    icon={<Users size={20} className="text-emerald-600" />}
                    color="bg-emerald-50 border-emerald-200"
                />
                <KPICard
                    title="Freq. Média"
                    value={`${insights.avgFrequency}%`}
                    icon={<TrendingUp size={20} className="text-blue-600" />}
                    color="bg-blue-50 border-blue-200"
                    subtitle={insights.avgFrequency >= 80 ? '✓ Boa adesão' : 'Requer atenção'}
                />
                <KPICard
                    title="Em Risco"
                    value={insights.riskCount}
                    icon={<AlertTriangle size={20} className="text-amber-600" />}
                    color={insights.riskCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}
                    subtitle={insights.riskCount > 0 ? 'pacientes com alerta' : 'Nenhum alerta'}
                />
                <KPICard
                    title="Sessões (total)"
                    value={insights.totalSessions}
                    icon={<Activity size={20} className="text-violet-600" />}
                    color="bg-violet-50 border-violet-200"
                    subtitle={`${sessionTotals.attended} realizadas`}
                />
            </div>

            {/* ── Gráficos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Distribuição de frequência */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle size={18} className="text-emerald-600" />
                            <span className="font-semibold text-gray-800 text-sm">Distribuição de Frequência</span>
                        </div>
                        {frequencyDistribution.every(b => b.count === 0) ? (
                            <div className="h-44 flex items-center justify-center text-gray-400 text-sm">
                                Sem dados suficientes
                            </div>
                        ) : (
                            <div className="h-44">
                                <Doughnut
                                    data={donutData}
                                    options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }}
                                />
                            </div>
                        )}
                        {/* Legenda custom — clara e com contagens */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            {frequencyDistribution.map(b => (
                                <div key={b.label} className="flex flex-col items-center gap-0.5 rounded-lg py-2.5 px-2" style={{ backgroundColor: b.color + '18', border: `1px solid ${b.color}40` }}>
                                    <span className="text-2xl font-bold leading-tight" style={{ color: b.color }}>{b.count}</span>
                                    <span className="text-xs font-semibold text-gray-700">{b.label}</span>
                                    <span className="text-xs text-gray-500">pacientes</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Sessões realizadas vs faltas */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-4">
                            <Activity size={18} className="text-violet-600" />
                            <span className="font-semibold text-gray-800 text-sm">Sessões — Resumo Geral</span>
                        </div>
                        <div className="h-52">
                            <Bar data={barData} options={chartOptions} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                            <div className="bg-emerald-50 rounded-xl p-2">
                                <p className="text-lg font-bold text-emerald-700">{sessionTotals.attended}</p>
                                <p className="text-[10px] text-gray-500">Realizadas</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-2">
                                <p className="text-lg font-bold text-red-600">{sessionTotals.canceled}</p>
                                <p className="text-[10px] text-gray-500">Canceladas</p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-2">
                                <p className="text-lg font-bold text-amber-600">{sessionTotals.pending}</p>
                                <p className="text-[10px] text-gray-500">Pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Pacientes em risco ── */}
            {riskPatients.length > 0 && (
                <Card sx={{ borderRadius: 3, border: '1px solid #fcd34d', background: '#fffbeb' }}>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} className="text-amber-600" />
                            <span className="font-semibold text-gray-800 text-sm">
                                Pacientes que precisam de atenção
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                                    {riskPatients.length}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {(showAllRisk ? riskPatients : riskPatients.slice(0, 6)).map(risk => (
                                <RiskRow
                                    key={risk.patient._id}
                                    risk={risk}
                                    onSchedule={onSchedule ? () => onSchedule(risk.patient._id, risk.patient.fullName, { lastSessionType: risk.lastSessionType }) : undefined}
                                    onViewHistory={onViewHistory ? () => onViewHistory(risk.patient._id, risk.patient.fullName) : undefined}
                                />
                            ))}
                        </div>
                        {riskPatients.length > 6 && (
                            <button
                                onClick={() => setShowAllRisk(v => !v)}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                            >
                                {showAllRisk
                                    ? <><ChevronUp size={14} /> Mostrar menos</>
                                    : <><ChevronDown size={14} /> Ver todos ({riskPatients.length - 6} mais)</>
                                }
                            </button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Lista completa de frequência ── */}
            {attendanceData.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-gray-500" />
                        <span className="font-semibold text-gray-700 text-sm">Frequência por Paciente</span>
                        <span className="text-xs text-gray-400">({attendanceData.length} pacientes)</span>
                    </div>

                    {/* Média geral */}
                    <Card sx={{ borderRadius: 2, border: '1px solid #e5e7eb', background: '#f9fafb', mb: 2, p: 1.5 }}>
                        <CardContent sx={{ p: '0 !important', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Users size={22} color="#16a34a" />
                            <div>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#065f46', fontSize: 13 }}>
                                    Média geral de frequência
                                </Typography>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: '#10b981', lineHeight: 1.2 }}>
                                    {insights.avgFrequency}%
                                </Typography>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                        {[...attendanceData]
                            .sort((a, b) => a.frequency - b.frequency)
                            .map(item => {
                                const freqColor = item.frequency >= 90 ? '#10b981' : item.frequency >= 75 ? '#f59e0b' : '#ef4444';
                                return (
                                    <div
                                        key={item.patient._id}
                                        className={`flex items-center gap-3 px-4 py-2.5 bg-white ${onPatientClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                        onClick={onPatientClick ? () => onPatientClick(item.patient._id, item.patient.fullName) : undefined}
                                    >
                                        {/* Nome + última sessão */}
                                        <div className="w-44 shrink-0 min-w-0">
                                            <p className="font-semibold text-gray-800 truncate text-sm leading-snug">{item.patient.fullName}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{formatDateBrazilian(item.lastSession)}</p>
                                        </div>

                                        {/* Barra de progresso */}
                                        <div className="flex-1 min-w-0">
                                            <LinearProgress
                                                variant="determinate"
                                                value={item.frequency}
                                                sx={{
                                                    height: 7, borderRadius: 4, backgroundColor: '#f3f4f6',
                                                    '& .MuiLinearProgress-bar': { backgroundColor: freqColor }
                                                }}
                                            />
                                        </div>

                                        {/* Frequência */}
                                        <span className="font-bold text-sm w-10 text-right shrink-0" style={{ color: freqColor }}>
                                            {item.frequency}%
                                        </span>

                                        {/* Stats compactos — ocultos no mobile */}
                                        <div className="hidden sm:flex gap-3 text-xs text-gray-500 shrink-0 w-56">
                                            <span>T:<strong className="text-gray-700 ml-0.5">{item.total}</strong></span>
                                            <span>Pres:<strong className="text-emerald-600 ml-0.5">{item.attended}</strong></span>
                                            <span>Cancel:<strong className="text-red-500 ml-0.5">{item.canceled}</strong></span>
                                            <span>Pend:<strong className="text-amber-600 ml-0.5">{item.pending}</strong></span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {attendanceData.length === 0 && !loading && (
                <div className="text-center py-16 text-gray-400">
                    <Activity size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Nenhum dado de frequência disponível</p>
                </div>
            )}
        </div>
    );
}
