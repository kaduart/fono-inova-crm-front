/**
 * DashboardTab - Lazy Loading
 * 
 * Só carrega dados quando a aba Dashboard é ativada.
 * Mantém cache local para evitar recarregamentos desnecessários.
 */

import { useEffect } from 'react';
import { useDashboard } from '../../../hooks/useDashboard';
import { usePatientsV2 } from '../../../hooks/usePatientV2';
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
        doctors: doctorsOverview,
        upcomingAppointments: upcomingAppts,
        loading: dashboardLoading,
        refresh: refreshDashboard
    } = useDashboard();

    // 🎯 USA API V2
    const { patients, loading: patientsLoading } = usePatientsV2();

    // 🔄 Refresh quando montar
    useEffect(() => {
        refreshDashboard();
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

// Skeleton de loading
const DashboardSkeleton = () => (
    <div className="space-y-6">
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            ))}
        </div>
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
    </div>
);

export default DashboardTab;
