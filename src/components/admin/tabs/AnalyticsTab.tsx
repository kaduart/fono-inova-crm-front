/**
 * AnalyticsTab - Lazy Loading
 * 
 * Só carrega dados de analytics quando a aba é ativada.
 * Esta é uma das abas mais pesadas - nunca deve carregar no início!
 */

import { useEffect, useState } from 'react';
import SiteAnalyticsDashboard from '../../Dashboard/SiteAnalyticsDashboard';
import { getPayments, FinancialRecord } from '../../../services/paymentService';
import { patientService } from '../../../services/patientService';
import { doctorService } from '../../../services/doctorService';
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
    const [payments, setPayments] = useState<FinancialRecord[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [patients, setPatients] = useState<IPatient[]>([]);
    const [loading, setLoading] = useState(true);

    // 🎯 Só carrega quando a aba é ativada
    useEffect(() => {
        let mounted = true;

        const loadData = async () => {
            const startTime = Date.now();
            try {
                setLoading(true);
                
                // Carrega tudo em paralelo
                const [paymentsRes, doctorsRes, patientsRes] = await Promise.all([
                    getPayments({ period: 'month' }), // Só do mês atual para ser mais rápido
                    doctorService.getAllDoctors(),
                    patientService.fetchAll(false)
                ]);

                if (!mounted) return;

                setPayments(paymentsRes.data?.data || paymentsRes.data || []);
                setDoctors(doctorsRes.data || []);
                setPatients(patientsRes.data?.patients || patientsRes.data || []);
            } catch (error) {
                console.error('Erro ao carregar analytics:', error);
                toast.error('Erro ao carregar analytics');
            } finally {
                // Garante tempo mínimo de loading para evitar flash (400ms)
                const elapsed = Date.now() - startTime;
                const minDelay = Math.max(0, 400 - elapsed);
                
                setTimeout(() => {
                    if (mounted) {
                        setLoading(false);
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
