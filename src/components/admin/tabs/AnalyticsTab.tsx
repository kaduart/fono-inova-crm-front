/**
 * AnalyticsTab - Lazy Loading
 * 
 * Só carrega dados de analytics quando a aba é ativada.
 * Esta é uma das abas mais pesadas - nunca deve carregar no início!
 */

import { useEffect, useState } from 'react';
import SiteAnalyticsDashboard from '../../Dashboard/SiteAnalyticsDashboard';
import { getPaymentsV2, FinancialRecord } from '../../../services/paymentService';
import { usePatientsContext } from '../../../contexts/PatientsContext';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { usePaymentsContext } from '../../../contexts/PaymentsContext';
import { IPatient } from '../../../utils/types/types';
import { Skeleton } from '@mui/material';
import toast from 'react-hot-toast';

interface Doctor {
    _id: string;
    fullName: string;
    specialty?: string;
}

interface AnalyticsTabProps {
    onMarkAsPaid: (payment: FinancialRecord) => Promise<void>;
    onRegisterAppointmentAndPayment: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => Promise<void>;
}

export const AnalyticsTab = ({
    onMarkAsPaid,
    onRegisterAppointmentAndPayment,
    onCancelPayment
}: AnalyticsTabProps) => {
    // 🎯 SOURCE OF TRUTH: Contexts globais (sem state local duplicado)
    const { payments, loadPayments, isLoading: paymentsLoading } = usePaymentsContext();
    const { patients, loading: patientsLoading } = usePatientsContext();
    const { activeDoctors: doctors, loading: doctorsLoading } = useDoctorsContext();
    const [isLoading, setIsLoading] = useState(true);
    const loading = isLoading || patientsLoading || doctorsLoading || paymentsLoading;
    const currentMonth = new Date().toISOString().substring(0, 7);

    // 🎯 Só carrega quando a aba é ativada (o context gerencia o cache)
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            const startTime = Date.now();
            try {
                setIsLoading(true);
                
                // 🚀 V2: Context gerencia cache (não recarrega se já tiver do mesmo mês)
                await loadPayments(currentMonth);
            } catch (error) {
                console.error('Erro ao carregar analytics:', error);
                toast.error('Erro ao carregar analytics');
            } finally {
                const elapsed = Date.now() - startTime;
                const minDelay = Math.max(0, 400 - elapsed);
                
                setTimeout(() => {
                    if (mounted) {
                        setIsLoading(false);
                    }
                }, minDelay);
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, [loadPayments, currentMonth]);

    if (loading) {
        return <AnalyticsSkeleton />;
    }

    return (
        <SiteAnalyticsDashboard
            patients={patients}
            doctors={doctors}
            payments={payments}
            onMarkAsPaid={onMarkAsPaid}
            registerAppointmentAndPayemntFuture={onRegisterAppointmentAndPayment}
            onCancelPayment={onCancelPayment}
        />
    );
};

// Skeleton de loading
const AnalyticsSkeleton = () => (
    <div className="space-y-6">
        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
            ))}
        </div>
        
        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
        </div>
        
        {/* Tabela */}
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </div>
);

// Helpers




export default AnalyticsTab;
