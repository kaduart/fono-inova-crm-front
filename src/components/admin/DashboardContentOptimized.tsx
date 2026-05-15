/**
 * 🚀 DashboardContent Otimizado
 * 
 * Versão otimizada do DashboardContent com:
 * - Props vindas do useDashboard hook (chamada única de API)
 * - React.memo para prevenir re-renders desnecessários
 * - Skeleton loading states
 * - Lazy loading de componentes pesados
 */

import { Activity, ChevronDown, ChevronUp, Clock, DollarSign, Stethoscope, UserPlus, Users, RefreshCw } from 'lucide-react';
import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Skeleton as MuiSkeleton } from '@mui/material';
import { mapPatientListResponseDTO } from '../../dtos/patient.response.dto';
import API from '../../services/api';
import {
    DashboardStats,
    DoctorOverview,
    UpcomingAppointment
} from '../../services/dashboardService';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// Importações diretas (lazy removido temporariamente devido a erro)
import BirthdayCard from '../patients/BirthdayCard';
import PatientTable from '../patients/PatientTable';

interface DashboardContentOptimizedProps {
    // Dados do dashboard (vindos do useDashboard)
    stats: DashboardStats | null;
    charts: import('../../services/dashboardService').DashboardCharts | null;
    doctors: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    patients: any[];
    loading: boolean;
    onRefresh: () => Promise<void>;

    // Handlers
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

// Componente de skeleton para métricas
const MetricCardSkeleton = memo(() => (
    <Card className="border border-gray-200 rounded-lg">
        <CardHeader className="pb-2">
            <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-24" />
            </div>
        </CardHeader>
        <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
        </CardContent>
    </Card>
));

MetricCardSkeleton.displayName = 'MetricCardSkeleton';

// Skeleton que espelha o layout do BirthdayCard (3 colunas × 2 linhas)
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
                <MuiSkeleton variant="rounded" width="100%" height={44} sx={{ borderRadius: 12, bgcolor: '#EDF2F720' }} />
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

// Skeleton que espelha o layout do PatientTable (header + 7 linhas)
const PatientTableSkeleton = memo(() => (
    <div className="space-y-3">
        {/* Barra de busca + filtros */}
        <div className="flex items-center gap-3 mb-4">
            <MuiSkeleton variant="rounded" width="100%" height={40} sx={{ borderRadius: 10, maxWidth: 320 }} />
            <MuiSkeleton variant="rounded" width={100} height={40} sx={{ borderRadius: 10 }} />
            <MuiSkeleton variant="rounded" width={100} height={40} sx={{ borderRadius: 10 }} />
        </div>
        {/* Header */}
        <div className="grid grid-cols-5 gap-4 px-4 pb-2 border-b border-gray-100">
            {[120, 80, 90, 80, 60].map((w, i) => (
                <MuiSkeleton key={i} variant="text" width={w} height={16} />
            ))}
        </div>
        {/* Linhas */}
        {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-4 items-center px-4 py-2">
                <div className="flex items-center gap-3">
                    <MuiSkeleton variant="circular" width={36} height={36} sx={{ flexShrink: 0 }} />
                    <div className="space-y-1 flex-1">
                        <MuiSkeleton variant="text" width="70%" height={16} />
                        <MuiSkeleton variant="text" width="55%" height={13} />
                    </div>
                </div>
                <MuiSkeleton variant="text" width="65%" height={16} />
                <MuiSkeleton variant="rounded" width={72} height={22} sx={{ borderRadius: 99 }} />
                <MuiSkeleton variant="text" width="60%" height={16} />
                <div className="flex gap-2">
                    <MuiSkeleton variant="rounded" width={30} height={30} sx={{ borderRadius: 8 }} />
                    <MuiSkeleton variant="rounded" width={30} height={30} sx={{ borderRadius: 8 }} />
                    <MuiSkeleton variant="rounded" width={30} height={30} sx={{ borderRadius: 8 }} />
                </div>
            </div>
        ))}
    </div>
));

PatientTableSkeleton.displayName = 'PatientTableSkeleton';

// Componente de métrica memoizado
interface MetricCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
    onAction?: () => void;
    actionIcon?: React.ReactNode;
}

const MetricCard = memo<MetricCardProps>(({
    title,
    value,
    subtitle,
    icon,
    colorClass,
    bgClass,
    onAction,
    actionIcon
}) => (
    <Card className={`${bgClass} border border-gray-200 rounded-lg hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <span className={colorClass}>{icon}</span>
                    <CardTitle className={`text-sm ${colorClass}`}>
                        {title}
                    </CardTitle>
                </div>
                {onAction && actionIcon && (
                    <button
                        onClick={onAction}
                        className={`p-1 rounded hover:bg-white/50 transition-colors ${colorClass}`}
                    >
                        {actionIcon}
                    </button>
                )}
            </div>
        </CardHeader>
        <CardContent>
            <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
            <p className={`text-xs mt-1 ${colorClass} opacity-80`}>{subtitle}</p>
        </CardContent>
    </Card>
));

MetricCard.displayName = 'MetricCard';

// Componente de accordion memoizado
interface AccordionSectionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    headerClassName: string;
    icon?: string;
    badge?: React.ReactNode;
}

const AccordionSection = memo<AccordionSectionProps>(({
    title,
    isOpen,
    onToggle,
    children,
    headerClassName,
    icon,
    badge
}) => (
    <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <button
            className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${headerClassName}`}
            onClick={onToggle}
        >
            <span className="flex items-center gap-2 flex-wrap">
                {icon && <span>{icon}</span>}
                {title}
                {badge}
            </span>
            {isOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
        </button>
        {isOpen && (
            <div className="bg-white p-4">
                {children}
            </div>
        )}
    </div>
));

AccordionSection.displayName = 'AccordionSection';

// Componente principal
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
    onDeletePatient
}) => {
    // Aniversariantes hoje (calculado direto da prop patients, sem lazy fetch)
    const todayBirthdayCount = useMemo(() => {
        if (!patients?.length) return 0;
        const now = new Date();
        return patients.filter(p => {
            if (!p.dateOfBirth) return false;
            const dob = new Date(p.dateOfBirth);
            return dob.getDate() === now.getDate() && dob.getMonth() === now.getMonth();
        }).length;
    }, [patients]);

    // Estados dos accordions
    const [birthdaySectionOpen, setBirthdaySectionOpen] = useState(false);
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    const [metricsSectionOpen, setMetricsSectionOpen] = useState(true);
    const [overviewSectionOpen, setOverviewSectionOpen] = useState(true);
    const [showAllDoctors, setShowAllDoctors] = useState(false);

    // Aniversariantes — carregados só ao abrir o accordion
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

    // Memoizar cálculos
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    // Garantir que arrays existam
    const safeDoctors = doctors || [];
    const safeAppointments = upcomingAppointments || [];
    const safePatients = useMemo(() => mapPatientListResponseDTO(patients || []), [patients]);


    const displayedDoctors = useMemo(() => {
        return showAllDoctors ? safeDoctors : safeDoctors.slice(0, 3);
    }, [safeDoctors, showAllDoctors]);

    const displayedAppointments = useMemo(() => {
        return safeAppointments.slice(0, 5);
    }, [safeAppointments]);

    // Formatar data de atualização
    const formattedLastUpdated = useMemo(() => {
        if (!stats?.calculatedAt) return '';
        return new Date(stats.calculatedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }, [stats?.calculatedAt]);

    if (loading) {
        return <LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-[400px]" />;
    }

    return (
        <>
            {/* Header com info de atualização e botão refresh */}
            <div className="flex justify-between items-center mb-6">
                <div className="text-sm text-gray-500">
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            Carregando...
                        </span>
                    ) : (
                        <span>Atualizado às {formattedLastUpdated}</span>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <RefreshCw size={16} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            {/* 🔹 SEÇÃO ANIVERSARIANTES */}
            <AccordionSection
                title="🎂 Aniversariantes do Mês"
                isOpen={birthdaySectionOpen}
                onToggle={() => setBirthdaySectionOpen(!birthdaySectionOpen)}
                headerClassName={birthdaySectionOpen
                    ? 'bg-pink-50 text-pink-800 border-b border-pink-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
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
                {aniversariantesLoading
                    ? <BirthdayCardSkeleton />
                    : <BirthdayCard patients={aniversariantes} />
                }
            </AccordionSection>

            {/* 🔹 SEÇÃO LISTA DE PACIENTES */}
            <AccordionSection
                title="👥 Lista de Pacientes"
                isOpen={patientsTableOpen}
                onToggle={() => setPatientsTableOpen(!patientsTableOpen)}
                headerClassName={patientsTableOpen
                    ? 'bg-blue-50 text-blue-800 border-b border-blue-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
            >
                {loading ? <PatientTableSkeleton /> : <PatientTable
                    patients={safePatients}
                    onEditPatient={(patient) => {
                        setPatientToEdit(patient);
                        setIsModalOpen(true);
                    }}
                    onPaymentAdvancedSuccess={(patient) => {
                        setShowAdvancedPayment(true);
                        setSelectedPatient(patient);
                    }}
                    onRegisterPayment={(patient) => {
                        setPaymentContext({
                            mode: 'create',
                            patient
                        });
                        setPaymentModalOpen(true);
                    }}
                    onDeletePatient={onDeletePatient}
                />}
            </AccordionSection>

            <hr className='m-5' />

            {/* 🔹 SEÇÃO MÉTRICAS */}
            <AccordionSection
                title="📊 Métricas do Hospital"
                isOpen={metricsSectionOpen}
                onToggle={() => setMetricsSectionOpen(!metricsSectionOpen)}
                headerClassName={metricsSectionOpen
                    ? 'bg-green-50 text-green-800 border-b border-green-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
            >
                {loading && !stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                    </div>
                ) : stats ? (
                    <div className="space-y-4">
                        {/* Operação */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Operação</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <MetricCard
                                    title="Sessões Hoje"
                                    value={stats.todayAppointments}
                                    subtitle="Agendamentos confirmados"
                                    icon={<Activity className="h-5 w-5" />}
                                    colorClass="text-emerald-600"
                                    bgClass="bg-emerald-50"
                                />
                                <MetricCard
                                    title="Sessões Semana"
                                    value={stats.weekAppointments}
                                    subtitle="Total na semana"
                                    icon={<Activity className="h-5 w-5" />}
                                    colorClass="text-teal-600"
                                    bgClass="bg-teal-50"
                                />
                                <MetricCard
                                    title="Total Profissionais"
                                    value={stats.totalDoctors}
                                    subtitle="Equipe ativa"
                                    icon={<Stethoscope className="h-5 w-5" />}
                                    colorClass="text-pink-600"
                                    bgClass="bg-pink-50"
                                    onAction={handleAddProfessional}
                                    actionIcon={<UserPlus size={18} />}
                                />
                                <MetricCard
                                    title="Total Pacientes"
                                    value={stats.totalPatients}
                                    subtitle="Cadastrados"
                                    icon={<Users className="h-5 w-5" />}
                                    colorClass="text-amber-600"
                                    bgClass="bg-amber-50"
                                    onAction={handleAddPatient}
                                    actionIcon={<UserPlus size={18} />}
                                />
                            </div>
                        </div>

                        {/* Financeiro */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Financeiro</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <MetricCard
                                    title="Caixa Hoje"
                                    value={formatCurrency(stats.todayRevenue)}
                                    subtitle="Recebido hoje"
                                    icon={<DollarSign className="h-5 w-5" />}
                                    colorClass="text-emerald-600"
                                    bgClass="bg-emerald-50"
                                />
                                <MetricCard
                                    title="Receita Mês"
                                    value={formatCurrency(stats.monthRevenue)}
                                    subtitle="Pagamentos confirmados"
                                    icon={<DollarSign className="h-5 w-5" />}
                                    colorClass="text-blue-600"
                                    bgClass="bg-blue-50"
                                />
                                <MetricCard
                                    title="Pendente"
                                    value={stats.pendingPayments}
                                    subtitle="Pagamentos em aberto"
                                    icon={<Clock className="h-5 w-5" />}
                                    colorClass="text-orange-600"
                                    bgClass="bg-orange-50"
                                />
                                <MetricCard
                                    title="Leads Mês"
                                    value={stats.monthLeads}
                                    subtitle="Novos interessados"
                                    icon={<UserPlus className="h-5 w-5" />}
                                    colorClass="text-violet-600"
                                    bgClass="bg-violet-50"
                                />
                            </div>
                        </div>
                    </div>
                ) : null}
            </AccordionSection>

            {/* 🔹 SEÇÃO VISÃO GERAL */}
            <AccordionSection
                title="👁️ Visão Geral"
                isOpen={overviewSectionOpen}
                onToggle={() => setOverviewSectionOpen(!overviewSectionOpen)}
                headerClassName={overviewSectionOpen
                    ? 'bg-purple-50 text-purple-800 border-b border-purple-100'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    {/* Visão dos Profissionais */}
                    <Card className="border border-gray-200 rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                Visão Geral dos Profissionais
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between p-3">
                                            <div className="flex items-center space-x-3">
                                                <Skeleton className="h-10 w-10 rounded-full" />
                                                <div>
                                                    <Skeleton className="h-4 w-32 mb-1" />
                                                    <Skeleton className="h-3 w-24" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-4 w-16" />
                                        </div>
                                    ))}
                                </div>
                            ) : displayedDoctors.length > 0 ? (
                                <div className="space-y-4">
                                    {displayedDoctors.map((doctor, index) => (
                                        <div
                                            key={doctor._id || index}
                                            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded transition-colors"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <Stethoscope className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{doctor.name}</p>
                                                    <p className="text-sm text-gray-500">{doctor.specialty}</p>
                                                </div>
                                            </div>
                                            <span className="text-sm font-medium">
                                                {doctor.patients} pacientes
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Stethoscope className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Nenhum profissional encontrado
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        {doctors && doctors.length > 3 && (
                            <CardFooter className="border-t px-6 py-3">
                                <Button
                                    variant="ghost"
                                    className="text-blue-600 hover:bg-blue-50"
                                    onClick={() => setShowAllDoctors(!showAllDoctors)}
                                >
                                    {showAllDoctors ? 'Mostrar menos' : 'Ver todos'}
                                </Button>
                            </CardFooter>
                        )}
                    </Card>

                    {/* Próximas Consultas */}
                    <Card className="border border-gray-200 rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">
                                Próximas Consultas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="p-3">
                                            <div className="flex justify-between">
                                                <div>
                                                    <Skeleton className="h-4 w-32 mb-1" />
                                                    <Skeleton className="h-3 w-48" />
                                                </div>
                                                <div className="text-right">
                                                    <Skeleton className="h-4 w-20 mb-1" />
                                                    <Skeleton className="h-3 w-12" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : displayedAppointments.length > 0 ? (
                                <ul className="space-y-3">
                                    {displayedAppointments.map((appointment, index) => (
                                        <li
                                            key={appointment._id || index}
                                            className="p-3 hover:bg-gray-50 rounded transition-colors"
                                        >
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-medium">{appointment.patientName || appointment.patient}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {appointment.professionalName || appointment.doctor}{appointment.specialty ? ` (${appointment.specialty})` : ''} • {appointment.reason}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium">
                                                        {new Date(appointment.date).toLocaleDateString('pt-BR')}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{appointment.time}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-6">
                                    <Clock className="mx-auto h-8 w-8 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Nenhuma consulta agendada
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </AccordionSection>

            {/* 🔹 BOTÕES DE CONTROLE */}
            <div className="flex gap-3 justify-center mt-6">
                <Button
                    variant="outlined"
                    onClick={() => {
                        setBirthdaySectionOpen(true);
                        setPatientsTableOpen(true);
                        setMetricsSectionOpen(true);
                        setOverviewSectionOpen(true);
                    }}
                    className="rounded-lg"
                >
                    <ChevronUp size={18} className="mr-1" />
                    Expandir Todos
                </Button>
                <Button
                    variant="outlined"
                    onClick={() => {
                        setBirthdaySectionOpen(false);
                        setPatientsTableOpen(false);
                        setMetricsSectionOpen(false);
                        setOverviewSectionOpen(false);
                    }}
                    className="rounded-lg"
                >
                    <ChevronDown size={18} className="mr-1" />
                    Recolher Todos
                </Button>
            </div>
        </>
    );
};

// Exportar com React.memo para prevenir re-renders desnecessários
export default memo(DashboardContentOptimized);
