/**
 * 🚀 DashboardContent Otimizado
 * 
 * Versão otimizada do DashboardContent com:
 * - Props vindas do useDashboard hook (chamada única de API)
 * - React.memo para prevenir re-renders desnecessários
 * - Skeleton loading states
 * - Lazy loading de componentes pesados
 */

import { Activity, ChevronDown, ChevronUp, Clock, Stethoscope, UserPlus, Users, RefreshCw } from 'lucide-react';
import React, { memo, useMemo, useState } from 'react';
import {
    DashboardStats,
    DoctorOverview,
    UpcomingAppointment
} from '../../services/dashboardService';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

// Importações diretas (lazy removido temporariamente devido a erro)
import BirthdayCard from '../patients/BirthdayCard';
import PatientTable from '../patients/PatientTable';

interface DashboardContentOptimizedProps {
    // Dados do dashboard (vindos do useDashboard)
    stats: DashboardStats | null;
    doctors: DoctorOverview[];
    upcomingAppointments: UpcomingAppointment[];
    patients: any[];
    loading: boolean;
    onRefresh: () => Promise<void>;

    // 🎉 NOVOS: Aniversariantes e faturamento do dia
    aniversariantes?: Array<{
        _id: string;
        fullName: string;
        dateOfBirth: string;
        phone?: string;
        daysUntil: number;
    }>;
    todayRevenue?: number;

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
}

const AccordionSection = memo<AccordionSectionProps>(({
    title,
    isOpen,
    onToggle,
    children,
    headerClassName,
    icon
}) => (
    <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <button
            className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${headerClassName}`}
            onClick={onToggle}
        >
            <span className="flex items-center gap-2">
                {icon && <span>{icon}</span>}
                {title}
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
    doctors,
    upcomingAppointments,
    patients,
    loading,
    onRefresh,
    aniversariantes = [],
    todayRevenue = 0,
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
    // Estados dos accordions
    const [birthdaySectionOpen, setBirthdaySectionOpen] = useState(false);
    const [patientsTableOpen, setPatientsTableOpen] = useState(true);
    const [metricsSectionOpen, setMetricsSectionOpen] = useState(true);
    const [overviewSectionOpen, setOverviewSectionOpen] = useState(true);
    const [showAllDoctors, setShowAllDoctors] = useState(false);

    // Memoizar cálculos
    const occupancyRate = useMemo(() => {
        if (!stats) return '0.00';
        return ((stats.totalPatients / 150) * 100).toFixed(2);
    }, [stats]);

    // Garantir que arrays existam
    const safeDoctors = doctors || [];
    const safeAppointments = upcomingAppointments || [];
    const safePatients = patients || [];


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

    // ✅ CORREÇÃO: Mostrar skeleton apenas durante o loading inicial
    // Não verificamos safePatients.length aqui para evitar problemas de sincronização
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Skeleton Loading */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
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
            >
                <BirthdayCard patients={aniversariantes} />
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
                <PatientTable
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
                />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                        <MetricCardSkeleton />
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                        <MetricCard
                            title="Total Profissionais"
                            value={stats.totalDoctors}
                            subtitle="Equipe médica ativa"
                            icon={<Stethoscope className="h-5 w-5" />}
                            colorClass="text-pink-500"
                            bgClass="bg-pink-50"
                            onAction={handleAddProfessional}
                            actionIcon={<UserPlus size={18} />}
                        />

                        <MetricCard
                            title="Total Pacientes"
                            value={stats.totalPatients}
                            subtitle="Atualmente admitidos"
                            icon={<Users className="h-5 w-5" />}
                            colorClass="text-amber-500"
                            bgClass="bg-amber-50"
                            onAction={handleAddPatient}
                            actionIcon={<UserPlus size={18} />}
                        />

                        <MetricCard
                            title="Ocupação"
                            value={`${occupancyRate}%`}
                            subtitle="Taxa de ocupação"
                            icon={<Activity className="h-5 w-5" />}
                            colorClass="text-purple-500"
                            bgClass="bg-purple-50"
                        />
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
                            ) : (
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
                                                    <p className="font-medium">{appointment.patient}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {appointment.doctor} • {appointment.reason}
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
