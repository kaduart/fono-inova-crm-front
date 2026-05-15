/**
 * DashboardTab - Lazy Loading
 * 
 * Só carrega dados quando a aba Dashboard é ativada.
 * Mantém cache local para evitar recarregamentos desnecessários.
 */

import { useEffect } from 'react';
import { useDashboard } from '../../../hooks/useDashboard';
import { usePatients } from '../../../hooks/usePatients';
import DashboardContentOptimized from '../DashboardContentOptimized';
import { Paper, Typography, Skeleton } from '@mui/material';
import { BarChart3 } from 'lucide-react';
import { useTheme } from '@mui/material/styles';

interface DashboardTabProps {
    onAddProfessional: () => void;
    onAddPatient: () => void;
    onEditPatient: (patient: any) => void;
    onOpenPaymentModal: (context: any) => void;
    onOpenAdvancedPayment: () => void;
}

export const DashboardTab = ({
    onAddProfessional,
    onAddPatient,
    onEditPatient,
    onOpenPaymentModal,
    onOpenAdvancedPayment
}: DashboardTabProps) => {
    const theme = useTheme();
    
    // 🎯 Só carrega quando o componente monta (ou seja, quando a aba é ativada)
    const {
        stats,
        charts,
        doctors: doctorsOverview,
        upcomingAppointments: upcomingAppts,
        loading: dashboardLoading,
        refresh: refreshDashboard
    } = useDashboard();

    // 🎯 USA API
    const { patients, loading: patientsLoading } = usePatients();

    // 🔄 Refresh quando montar — com delay para evitar race condition com hook interno
    useEffect(() => {
        const timer = setTimeout(() => {
            refreshDashboard();
        }, 100);
        return () => clearTimeout(timer);
    }, [refreshDashboard]);

    if (dashboardLoading && !stats) {
        return <DashboardSkeleton />;
    }

    return (
        <>
            <Paper
                elevation={2}
                sx={{
                    p: 4,
                    mb: 4,
                    mt: 2,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="p-3 rounded-2xl"
                            style={{ backgroundColor: 'rgba(55,171,135,0.15)' }}
                        >
                            <BarChart3 size={24} style={{ color: '#00C087' }} />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800">
                                Visão Geral da Clínica
                            </Typography>
                            <Typography variant="body2" color="grey.600">
                                Acompanhe métricas, desempenho e indicadores do atendimento em tempo real.
                            </Typography>
                        </div>
                    </div>
                </div>
            </Paper>

            <DashboardContentOptimized
                stats={stats}
                charts={charts}
                doctors={doctorsOverview}
                upcomingAppointments={upcomingAppts}
                patients={patients}
                loading={dashboardLoading}
                onRefresh={refreshDashboard}
                handleAddProfessional={onAddProfessional}
                handleAddPatient={onAddPatient}
                setPatientToEdit={onEditPatient}
                setIsModalOpen={() => {}}
                setShowAdvancedPayment={onOpenAdvancedPayment}
                setSelectedPatient={() => {}}
                setPaymentContext={onOpenPaymentModal}
                setPaymentModalOpen={() => {}}
            />
        </>
    );
};

// Skeleton de loading — padrão ExpensesTab
const DashboardSkeleton = () => (
    <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
            <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#10B98120' }} />
            <div>
                <Skeleton variant="text" width={220} height={32} />
                <Skeleton variant="text" width={320} height={20} />
            </div>
        </div>
        {/* Métricas */}
        <div className="space-y-4">
            <Skeleton variant="text" width={80} height={16} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[{ c: '#10B981' }, { c: '#3B82F6' }, { c: '#F59E0B' }, { c: '#EF4444' }].map((item, i) => (
                    <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${item.c}20`, backgroundColor: `${item.c}08` }}>
                        <div className="flex items-center gap-4">
                            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${item.c}20` }} />
                            <div className="flex-1">
                                <Skeleton variant="text" width="55%" height={20} />
                                <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${item.c}15` }} />
                                <Skeleton variant="text" width="40%" height={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Skeleton variant="text" width={80} height={16} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[{ c: '#8B5CF6' }, { c: '#06B6D4' }, { c: '#EC4899' }, { c: '#6366F1' }].map((item, i) => (
                    <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${item.c}20`, backgroundColor: `${item.c}08` }}>
                        <div className="flex items-center gap-4">
                            <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${item.c}20` }} />
                            <div className="flex-1">
                                <Skeleton variant="text" width="55%" height={20} />
                                <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${item.c}15` }} />
                                <Skeleton variant="text" width="40%" height={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        {/* Accordion placeholder */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-4">
                <Skeleton variant="text" width={180} height={20} />
            </div>
            <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                            <Skeleton variant="circular" width={40} height={40} />
                            <div>
                                <Skeleton variant="text" width={140} height={16} />
                                <Skeleton variant="text" width={100} height={14} />
                            </div>
                        </div>
                        <Skeleton variant="text" width={80} height={16} />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export default DashboardTab;
