/**
 * FinancialTab - Versão V2 Event-Driven
 * 
 * Tab financeira com:
 * - Lazy loading (só carrega quando ativada)
 * - Context V2 para pagamentos (/v2/payments)
 * - Projeções otimizadas
 * - Cache inteligente
 */

import { useEffect, useState } from 'react';
import FinancialDashboard from '../../../pages/Financial/FinancialDashboard';
import { usePatients } from '../../../hooks/usePatients';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { usePaymentsContext } from '../../../contexts/PaymentsContext';
import { Skeleton } from '@mui/material';
import toast from 'react-hot-toast';
import moment from 'moment';

// ============================================
// TYPES
// ============================================

interface FinancialRecord {
  _id: string;
  date: string;
  description: string;
  amount: number;
  paid: boolean;
  status: string;
  specialty: string;
  createdAt: string;
  patientId: string;
  doctorId: string;
  doctor?: { _id: string; fullName?: string; specialty?: string };
  serviceType: string;
  paymentMethod: string;
  billingType?: 'particular' | 'convenio' | 'liminar' | 'sus';
  notes: string;
  packageId: string;
  package?: { _id: string; name?: string };
  advanceSessions?: any[];
  sessionId: string;
  advancedSessions: string[];
  patient?: { _id: string; fullName?: string; email?: string; phoneNumber?: string };
  appointment?: { date: string; time: string; status: string };
}

interface FinancialTabProps {
  onMarkAsPaid: (payment: FinancialRecord) => Promise<void>;
  onRegisterAppointmentAndPayment: (payment: FinancialRecord) => void;
  onCancelPayment: (paymentId: string) => Promise<void>;
}

// ============================================
// COMPONENT
// ============================================

export const FinancialTab = ({
  onMarkAsPaid,
  onRegisterAppointmentAndPayment,
  onCancelPayment
}: FinancialTabProps) => {
  // 🎯 SOURCE OF TRUTH: Contexts globais V2
  const { payments, loadPayments, isLoading: paymentsLoading } = usePaymentsContext();
  const { patients, loading: patientsLoading } = usePatients();
  const { activeDoctors: doctors, loading: doctorsLoading } = useDoctorsContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const loading = isLoading || patientsLoading || doctorsLoading || paymentsLoading;
  const currentMonth = moment().format('YYYY-MM');

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
        console.error('❌ Erro ao carregar dados financeiros:', error);
        toast.error('Erro ao carregar dados financeiros');
      } finally {
        const elapsed = Date.now() - startTime;
        const minDelay = Math.max(0, 500 - elapsed);
        
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

  // 🔄 Converte PaymentV2 para FinancialRecord (compatibilidade)
  const mappedPayments: FinancialRecord[] = payments.map(p => ({
    _id: p._id,
    date: p.date,
    description: p.notes || '',
    amount: p.amount,
    paid: p.status === 'paid',
    status: p.status,
    specialty: p.specialty,
    createdAt: p.createdAt,
    patientId: p.patient?._id || '',
    doctorId: p.doctor?._id || '',
    doctor: p.doctor,
    serviceType: p.serviceType,
    paymentMethod: p.paymentMethod,
    notes: p.notes,
    packageId: p.package?._id || '',
    package: p.package,
    sessionId: p.appointment?._id || '',
    advancedSessions: [],
    patient: p.patient,
    appointment: p.appointment || undefined
  }));

  if (loading) {
    return <FinancialSkeleton />;
  }

  return (
    <FinancialDashboard
      patients={patients}
      doctors={doctors}
      initialPayments={mappedPayments}
      onMarkAsPaid={onMarkAsPaid}
      registerAppointmentAndPayemntFuture={onRegisterAppointmentAndPayment}
      onCancelPayment={onCancelPayment}
    />
  );
};

// ============================================
// SKELETON
// ============================================

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

export default FinancialTab;
