import {
    Activity, BarChart3, Cake, ChevronDown, ChevronUp,
    Clock, DollarSign, Eye, RefreshCw, Stethoscope, UserPlus, Users
} from 'lucide-react';
import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton as MuiSkeleton } from '@mui/material';
import { mapPatientListResponseDTO } from '../../dtos/patient.response.dto';
import API from '../../services/api';
import {
    DashboardStats,
    DoctorOverview,
    UpcomingAppointment
} from '../../services/dashboardService';

import BirthdayCard from '../patients/BirthdayCard';
import PatientTable from '../patients/PatientTable';

interface DashboardContentOptimizedProps {
    stats: DashboardStats | null;
    charts: import('../../services/dashboardService').DashboardCharts | null;
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
}

// --- Skeletons ---

const MetricCardSkeleton = memo(() => (
    <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm space-y-3 animate-pulse">
        <div className="w-11 h-11 rounded-xl bg-gray-100" />
        <div className="h-8 w-20 bg-gray-100 rounded-lg" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-16 bg-gray-50 rounded" />
    </div>
));
MetricCardSkeleton.displayName = 'MetricCardSkeleton';

const BirthdayCardSkeleton = memo(() => (
    <div className="flex flex-wrap gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-[260px] max-w-[calc(33.333%-11px)] border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <MuiSkeleton variant="circular" width={56} height={56} sx={{ bgcolor: '#CBD5E020', flexShrink: 0 }} />
                    <div className="flex-1 space-y-1.5">
                        <MuiSkeleton variant="text" width="70%" height={22} />
                        <div className="flex items-center gap-2">
                            <MuiSkeleton variant="text" width="45%" height={18} />
                            <MuiSkeleton variant="rounded" width={52} height={20} sx={{ borderRadius: 99 }} />
                        </div>
                    </div>
                </div>
                <MuiSkeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: 12 }} />
                <div className="flex justify-end gap-2">
                    <MuiSkeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 10 }} />
                    <MuiSkeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 10 }} />
                    <MuiSkeleton variant="rounded" width={36} height={36} sx={{ borderRadius: 10 }} />
                </div>
            </div>
        ))}
    </div>
));
BirthdayCardSkeleton.displayName = 'BirthdayCardSkeleton';

// --- MetricCard ---

interface MetricCardProps {
    title: string;
    value: number;
    format?: (value: number) => string;
    subtitle: string;
    icon: React.ReactNode;
    colorClass: string;
    iconBgClass: string;
    onAction?: () => void;
    actionIcon?: React.ReactNode;
}

// Números que chegam: quando `value` muda (refresh, nova carga de stats), o
// card conta do valor antigo pro novo em vez de trocar seco — sinaliza que é
// telemetria viva, não um número estático. Na primeira montagem from===to,
// então não conta a partir de zero — só anima mudança real de valor.
const MetricCard = memo<MetricCardProps>(({
    title, value, format, subtitle, icon, colorClass, iconBgClass, onAction, actionIcon
}) => {
    const [display, setDisplay] = useState(value);
    const prevValue = useRef(value);

    useEffect(() => {
        const from = prevValue.current;
        const to = value;
        prevValue.current = value;
        if (from === to) return;

        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
            setDisplay(to);
            return;
        }

        let raf: number;
        const duration = 600;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(from + (to - from) * eased));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);

    return (
        <div className="relative rounded-2xl p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBgClass} shrink-0`}>
                    <span className={colorClass}>{icon}</span>
                </div>
                {onAction && actionIcon && (
                    <button
                        type="button"
                        onClick={onAction}
                        aria-label={`Abrir ação de ${title}`}
                        className={`rounded-lg p-2 transition-all hover:bg-gray-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${colorClass} opacity-0 group-hover:opacity-100`}
                    >
                        {actionIcon}
                    </button>
                )}
            </div>
            <div className={`mb-1 text-3xl font-bold leading-none tracking-tight tabular-nums ${colorClass}`}>
                {format ? format(display) : display}
            </div>
            <p className="text-sm font-semibold leading-5 text-gray-700">{title}</p>
            <p className="mt-0.5 text-xs leading-4 text-gray-500">{subtitle}</p>
        </div>
    );
});
MetricCard.displayName = 'MetricCard';

// --- AccordionSection ---

interface AccordionSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    iconNode: React.ReactNode;
    iconBg: string;
    iconColor: string;
    badge?: React.ReactNode;
}

const AccordionSection = memo<AccordionSectionProps>(({
    title, isOpen, onToggle, children, iconNode, iconBg, iconColor, badge
}) => (
    <div className="mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white">
        <button
            type="button"
            className="flex justify-between items-center w-full px-5 py-4 text-left hover:bg-gray-50/70 transition-colors"
            onClick={onToggle}
            aria-expanded={isOpen}
        >
            <span className="flex items-center gap-3 flex-wrap">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} shrink-0`}>
                    <span className={iconColor}>{iconNode}</span>
                </span>
                <span className="text-base font-semibold leading-6 text-gray-800">{title}</span>
                {badge}
            </span>
            <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform duration-300 shrink-0 ml-3 ${isOpen ? 'rotate-180' : ''}`}
            />
        </button>
        {isOpen && (
            <div className="border-t border-gray-100 p-5">
                {children}
            </div>
        )}
    </div>
));
AccordionSection.displayName = 'AccordionSection';

// --- SectionDivider ---

const SectionLabel = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 mb-3">
        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <div className="flex-1 h-px bg-gray-100" />
    </div>
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
}) => {
    const todayBirthdayCount = useMemo(() => {
        if (!patients?.length) return 0;
        const now = new Date();
        return patients.filter(p => {
            if (!p.dateOfBirth) return false;
            const dob = new Date(p.dateOfBirth);
            return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
        }).length;
    }, [patients]);

    const [birthdaySectionOpen, setBirthdaySectionOpen] = useState(false);
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    const [metricsSectionOpen, setMetricsSectionOpen] = useState(true);
    const [overviewSectionOpen, setOverviewSectionOpen] = useState(true);
    const [showAllDoctors, setShowAllDoctors] = useState(false);

    const [aniversariantes, setAniversariantes] = useState<Array<{
        _id: string; fullName: string; dateOfBirth: string; phone?: string; daysUntil: number;
    }>>([]);
    const [aniversariantesLoading, setAniversariantesLoading] = useState(false);
    const aniversariantesFetched = useRef(false);

    const fetchAniversariantes = useCallback(async () => {
        if (aniversariantesFetched.current) return;
        aniversariantesFetched.current = true;
        setAniversariantesLoading(true);
        try {
            const res = await API.get('/patients/aniversariantes');
            setAniversariantes(res.data?.data || []);
        } catch {
            setAniversariantes([]);
        } finally {
            setAniversariantesLoading(false);
        }
    }, []);

    useEffect(() => {
        if (birthdaySectionOpen) fetchAniversariantes();
    }, [birthdaySectionOpen, fetchAniversariantes]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const safeDoctors = doctors || [];
    const safeAppointments = upcomingAppointments || [];
    const safePatients = useMemo(() => mapPatientListResponseDTO(patients || []), [patients]);

    const displayedDoctors = useMemo(
        () => (showAllDoctors ? safeDoctors : safeDoctors.slice(0, 3)),
        [safeDoctors, showAllDoctors]
    );
    const displayedAppointments = useMemo(() => safeAppointments.slice(0, 5), [safeAppointments]);

    const formattedLastUpdated = useMemo(() => {
        if (!stats?.calculatedAt) return '';
        return new Date(stats.calculatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }, [stats?.calculatedAt]);

    if (loading) {
        return (
            <div className="p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center mb-2">
                    <div className="h-4 w-48 bg-gray-100 rounded" />
                    <div className="h-9 w-28 bg-gray-100 rounded-xl" />
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 px-5 py-4 bg-white">
                        <div className="w-9 h-9 rounded-xl bg-blue-100" />
                        <div className="h-4 w-40 bg-gray-100 rounded" />
                    </div>
                    <div className="p-5 space-y-2 border-t border-gray-100">
                        <div className="h-9 bg-gray-50 rounded-xl mb-3" />
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50">
                                <div className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    <div className="h-2.5 bg-gray-50 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 px-5 py-4 bg-white">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100" />
                        <div className="h-4 w-44 bg-gray-100 rounded" />
                    </div>
                    <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3 border-t border-gray-100">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <MetricCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5">
            {/* Header */}
            <div className="flex justify-between items-center mb-5 px-1">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Última atualização</p>
                    <p className="text-sm font-semibold text-gray-600">
                        {formattedLastUpdated ? `às ${formattedLastUpdated}` : '—'}
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Atualizar
                </button>
            </div>

            {/* Aniversariantes */}
            <AccordionSection
                title="Aniversariantes do Mês"
                isOpen={birthdaySectionOpen}
                onToggle={() => setBirthdaySectionOpen(v => !v)}
                iconNode={<Cake size={18} />}
                iconBg="bg-pink-100"
                iconColor="text-pink-600"
                badge={todayBirthdayCount > 0 ? (
                    <span className="flex items-center gap-1.5 ml-1">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                        </span>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                            {todayBirthdayCount === 1 ? '1 aniversário hoje!' : `${todayBirthdayCount} aniversários hoje!`}
                        </span>
                    </span>
                ) : undefined}
            >
                {aniversariantesLoading ? <BirthdayCardSkeleton /> : <BirthdayCard patients={aniversariantes} />}
            </AccordionSection>

            {/* Lista de Pacientes */}
            <AccordionSection
                title="Lista de Pacientes"
                isOpen={patientsTableOpen}
                onToggle={() => setPatientsTableOpen(v => !v)}
                iconNode={<Users size={18} />}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
            >
                <PatientTable
                    patients={safePatients}
                    isRefreshing={loading}
                    onEditPatient={(patient) => {
                        setPatientToEdit(patient);
                        setIsModalOpen(true);
                    }}
                    onPaymentAdvancedSuccess={(patient) => {
                        setShowAdvancedPayment?.(true);
                        setSelectedPatient?.(patient);
                    }}
                    onRegisterPayment={(patient) => {
                        setPaymentContext?.({ mode: 'create', patient });
                        setPaymentModalOpen?.(true);
                    }}
                    onDeletePatient={onDeletePatient}
                />
            </AccordionSection>

            {/* Métricas */}
            <AccordionSection
                title="Métricas do Hospital"
                isOpen={metricsSectionOpen}
                onToggle={() => setMetricsSectionOpen(v => !v)}
                iconNode={<BarChart3 size={18} />}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
            >
                {loading && !stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => <MetricCardSkeleton key={i} />)}
                    </div>
                ) : stats ? (
                    <div className="space-y-5">
                        <div>
                            <SectionLabel label="Operação" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <MetricCard
                                    title="Sessões Hoje"
                                    value={stats.todayAppointments}
                                    subtitle="Agendamentos confirmados"
                                    icon={<Activity size={20} />}
                                    colorClass="text-emerald-600"
                                    iconBgClass="bg-emerald-100"
                                />
                                <MetricCard
                                    title="Sessões Semana"
                                    value={stats.weekAppointments}
                                    subtitle="Total na semana"
                                    icon={<Activity size={20} />}
                                    colorClass="text-teal-600"
                                    iconBgClass="bg-teal-100"
                                />
                                <MetricCard
                                    title="Total Profissionais"
                                    value={stats.totalDoctors}
                                    subtitle="Equipe ativa"
                                    icon={<Stethoscope size={20} />}
                                    colorClass="text-pink-600"
                                    iconBgClass="bg-pink-100"
                                    onAction={handleAddProfessional}
                                    actionIcon={<UserPlus size={16} />}
                                />
                                <MetricCard
                                    title="Total Pacientes"
                                    value={stats.totalPatients}
                                    subtitle="Cadastrados"
                                    icon={<Users size={20} />}
                                    colorClass="text-amber-600"
                                    iconBgClass="bg-amber-100"
                                    onAction={handleAddPatient}
                                    actionIcon={<UserPlus size={16} />}
                                />
                            </div>
                        </div>

                        <div>
                            <SectionLabel label="Financeiro" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <MetricCard
                                    title="Caixa Hoje"
                                    value={stats.todayRevenue}
                                    format={formatCurrency}
                                    subtitle="Recebido hoje"
                                    icon={<DollarSign size={20} />}
                                    colorClass="text-emerald-600"
                                    iconBgClass="bg-emerald-100"
                                />
                                <MetricCard
                                    title="Receita Mês"
                                    value={stats.monthRevenue}
                                    format={formatCurrency}
                                    subtitle="Pagamentos confirmados"
                                    icon={<DollarSign size={20} />}
                                    colorClass="text-blue-600"
                                    iconBgClass="bg-blue-100"
                                />
                                <MetricCard
                                    title="Pendente"
                                    value={stats.pendingPayments}
                                    subtitle="Pagamentos em aberto"
                                    icon={<Clock size={20} />}
                                    colorClass="text-orange-600"
                                    iconBgClass="bg-orange-100"
                                />
                                <MetricCard
                                    title="Leads Mês"
                                    value={stats.monthLeads}
                                    subtitle="Novos interessados"
                                    icon={<UserPlus size={20} />}
                                    colorClass="text-violet-600"
                                    iconBgClass="bg-violet-100"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </AccordionSection>

            {/* Visão Geral */}
            <AccordionSection
                title="Visão Geral"
                isOpen={overviewSectionOpen}
                onToggle={() => setOverviewSectionOpen(v => !v)}
                iconNode={<Eye size={18} />}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Profissionais */}
                    <div className="rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold leading-5 text-gray-800">Visão Geral dos Profissionais</h3>
                        </div>
                        <div className="p-3">
                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 bg-gray-100 rounded w-2/3" />
                                                <div className="h-2.5 bg-gray-50 rounded w-1/2" />
                                            </div>
                                            <div className="h-6 w-16 bg-gray-100 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : displayedDoctors.length > 0 ? (
                                <div className="space-y-1">
                                    {displayedDoctors.map((doctor, index) => (
                                        <div
                                            key={doctor._id || index}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                                                    <Stethoscope size={18} className="text-blue-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-800 text-sm truncate">{doctor.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{doctor.specialty}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full shrink-0 ml-2">
                                                {doctor.patients} pac.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                        <Stethoscope size={22} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400">Nenhum profissional encontrado</p>
                                </div>
                            )}
                        </div>
                        {doctors && doctors.length > 3 && (
                            <div className="px-5 py-3 border-t border-gray-100">
                                <button
                                    onClick={() => setShowAllDoctors(v => !v)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    {showAllDoctors ? 'Mostrar menos' : `Ver todos (${doctors.length})`}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Próximas Consultas */}
                    <div className="rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-bold leading-5 text-gray-800">Próximas Consultas</h3>
                        </div>
                        <div className="p-3">
                            {loading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex justify-between p-3 animate-pulse">
                                            <div className="space-y-1.5">
                                                <div className="h-3 bg-gray-100 rounded w-32" />
                                                <div className="h-2.5 bg-gray-50 rounded w-48" />
                                            </div>
                                            <div className="space-y-1.5 text-right">
                                                <div className="h-3 bg-gray-100 rounded w-20" />
                                                <div className="h-2.5 bg-gray-50 rounded w-12" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : displayedAppointments.length > 0 ? (
                                <ul className="space-y-1">
                                    {displayedAppointments.map((appointment, index) => (
                                        <li
                                            key={appointment._id || index}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
                                        >
                                            <div className="min-w-0 flex-1 mr-3">
                                                <p className="font-semibold text-gray-800 text-sm truncate">
                                                    {appointment.patientName || appointment.patient}
                                                </p>
                                                <p className="text-xs text-gray-400 truncate">
                                                    {appointment.professionalName || appointment.doctor}
                                                    {appointment.specialty ? ` · ${appointment.specialty}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-gray-700">
                                                    {new Date(appointment.date).toLocaleDateString('pt-BR')}
                                                </p>
                                                <p className="text-xs text-gray-400">{appointment.time}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-2">
                                        <Clock size={22} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400">Nenhuma consulta agendada</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </AccordionSection>

            {/* Controles */}
            <div className="flex gap-3 justify-center pt-2 pb-1">
                <button
                    onClick={() => {
                        setBirthdaySectionOpen(true);
                        setPatientsTableOpen(true);
                        setMetricsSectionOpen(true);
                        setOverviewSectionOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    <ChevronUp size={14} />
                    Expandir Todos
                </button>
                <button
                    onClick={() => {
                        setBirthdaySectionOpen(false);
                        setPatientsTableOpen(false);
                        setMetricsSectionOpen(false);
                        setOverviewSectionOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    <ChevronDown size={14} />
                    Recolher Todos
                </button>
            </div>
        </div>
    );
};

export default memo(DashboardContentOptimized);
