/**
 * FinancialTab - Lazy Loading
 * 
 * Só carrega dados financeiros quando a aba Financeiro é ativada.
 * Evita carregar pagamentos, despesas, etc no carregamento inicial.
 */

import { useEffect, useState } from 'react';
import FinancialDashboard from '../../../pages/Financial/FinancialDashboard';
import { getPayments, FinancialRecord } from '../../../services/paymentService';
import { usePatientsContext } from '../../../contexts/PatientsContext';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { IPatient } from '../../../utils/types/types';
import { Skeleton } from '@mui/material';
import toast from 'react-hot-toast';

interface Doctor {
    _id: string;
    fullName: string;
    specialty?: string;
}

interface FinancialTabProps {
    onMarkAsPaid: (payment: FinancialRecord) => Promise<void>;
    onRegisterAppointmentAndPayment: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => Promise<void>;
}

export const FinancialTab = ({
    onMarkAsPaid,
    onRegisterAppointmentAndPayment,
    onCancelPayment
}: FinancialTabProps) => {
    const [payments, setPayments] = useState<FinancialRecord[]>([]);
    // 🎯 USA OS CONTEXTOS GLOBAIS
    const { patients, loading: patientsLoading } = usePatientsContext();
    const { activeDoctors: doctors, loading: doctorsLoading } = useDoctorsContext();
    const [loadingPayments, setLoadingPayments] = useState(true);
    const loading = loadingPayments || patientsLoading || doctorsLoading;

    // 🎯 Só carrega quando a aba é ativada
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            const startTime = Date.now();
            try {
                setLoadingPayments(true);
                
                // Carrega pagamentos (pacientes e médicos vêm dos contextos)
                const paymentsRes = await getPayments();

                if (!mounted) return;

                setPayments(paymentsRes.data?.data || paymentsRes.data || []);
            } catch (error) {
                console.error('Erro ao carregar dados financeiros:', error);
                toast.error('Erro ao carregar dados financeiros');
            } finally {
                // Garante tempo mínimo de loading para evitar flash (500ms)
                const elapsed = Date.now() - startTime;
                const minDelay = Math.max(0, 500 - elapsed);
                
                setTimeout(() => {
                    if (mounted) {
                        setLoadingPayments(false);
                    }
                }, minDelay);
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return <FinancialSkeleton />;
    }

    return (
        <FinancialDashboard
            patients={patients}
            doctors={doctors}
            initialPayments={payments}
            onMarkAsPaid={onMarkAsPaid}
            registerAppointmentAndPayemntFuture={onRegisterAppointmentAndPayment}
            onCancelPayment={onCancelPayment}
        />
    );
};

// Skeleton de loading
const FinancialSkeleton = () => (
    <div className="space-y-6">
        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b pb-2">
            {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} variant="rectangular" width={100} height={40} sx={{ borderRadius: 1 }} />
            ))}
        </div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ))}
        </div>
        
        {/* Tabela skeleton */}
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
    </div>
);

// Helpers




export default FinancialTab;
