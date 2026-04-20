import { RefreshCw, User, Stethoscope, Calendar, Clock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePayment from '../../hooks/usePayment';
import { Box, Grid, Typography, Button, Paper, useTheme } from '@mui/material';

import { usePaymentsContext } from '../../contexts/PaymentsContext';
import { useAppointmentsContext } from '../../contexts/AppointmentsContext';
import { useAppointmentsByType } from '../../hooks/useAppointmentsByType';
import {
    exportCSV,
    exportPDF,
    FinancialRecord,
    updatePayment
} from '../../services/paymentService';
import { formatDateToDMY } from '../../utils/dateFormat';
import { PaymentDTO, mapFinancialRecordListToPaymentDTO } from '../../dtos/payment.response.dto';
import { appointmentService } from '../../services/appointmentService';
import { IDoctor } from '../../utils/types/types';
import { AddPaymentModal } from './AddPaymentModal';
import { EditPaymentModal } from './EditPaymentModal';
import { PaymentModal } from './PaymentModal';
import AppointmentDetailModal from '../calendar/appointmentDetailModal';
import { PaymentActionIcons } from './PaymentAction';
import { PaymentsFilters } from './PaymentsFilters';
import FinancialSummaryCard from './PaymentsSummary';
import { Patient360Modal } from '../../pages/Financial/components/Patient360Modal';
import { FinancialTableLoading } from '../../pages/Financial/components/FinancialLoading';

// ─── Status map for appointment badges ──────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
    scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
    canceled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
    missed: { label: 'Faltou', color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Realizado', color: 'bg-purple-100 text-purple-800' },
};

function mapPaymentStatus(ps: string | undefined): string {
    switch (ps) {
        case 'paid':
        case 'package_paid': return 'paid';
        case 'partial': return 'partial';
        case 'canceled': return 'canceled';
        default: return 'pending';
    }
}

function mapAppointmentToRecord(appt: any): FinancialRecord {
    const dateStr = appt.date ? new Date(appt.date).toISOString().split('T')[0] : '';
    const isPackageAppointment = !!(appt.package?._id || appt.package) || appt.serviceType === 'package_session';
    const hasPayment = !!(appt.payment?._id || appt.payment);
    const realPaymentId = appt.payment?._id?.toString?.() || appt.payment?.toString?.() || null;

    return {
        _id: realPaymentId || appt.id || appt._id,
        date: dateStr,
        description: appt.notes || '',
        // 💰 V2 RULE: Payment.amount é a fonte de verdade. Nunca usar sessionValue.
        amount: appt.payment?.amount || appt.paymentAmount || appt.valor || 0,
        // 💰 Fonte de verdade: Payment.status
        paid: appt.payment?.status === 'paid' || appt.payment?.status === 'package_paid',
        status: mapPaymentStatus(appt.payment?.status || appt.paymentStatus),
        specialty: appt.specialty || '',
        createdAt: appt.createdAt || '',
        patientId: appt.patient?._id || '',
        doctorId: appt.doctor?._id || '',
        serviceType: appt.serviceType || 'session',
        billingType: appt.billingType || 'particular',
        paymentMethod: appt.billingType === 'convenio'
            ? 'Convênio'
            : (appt.paymentMethod || appt.metadata?.paymentMethod || ''),
        notes: appt.notes || '',
        packageId: appt.package?._id || appt.package || '',
        sessionId: appt.session?._id || appt.session || '',
        advancedSessions: [],
        patient: appt.patient
            ? { _id: appt.patient._id, fullName: appt.patient.fullName || appt.patient.nome || appt.patient.name || appt.patientInfo?.fullName || appt.patientInfo?.nome || 'Desconhecido' }
            : { _id: '', fullName: appt.patientInfo?.fullName || appt.patientInfo?.nome || appt.patientName || 'Desconhecido' },
        doctor: appt.doctor
            ? { _id: appt.doctor._id, fullName: appt.doctor.fullName || appt.doctor.nome || appt.doctor.name || appt.professionalName || 'Desconhecido' }
            : { _id: '', fullName: appt.professionalName || 'Desconhecido' },
        appointment: { date: appt.date || '', time: appt.time || '', status: appt.operationalStatus || '' },
        advanceSessions: [],
        __isAppointmentRecord: true,
        __appointmentId: appt.id || appt._id,
        __hasPayment: hasPayment,
        __realPaymentId: realPaymentId || undefined,
        __isPackageAppointment: isPackageAppointment,
    };
}

function computeDateRange(period: string, customStart: string, customEnd: string): { start: string; end: string } | null {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (period === 'day') {
        return { start: fmt(now), end: fmt(now) };
    }
    if (period === 'week') {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: fmt(monday), end: fmt(sunday) };
    }
    if (period === 'month') {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: fmt(s), end: fmt(e) };
    }
    if (period === 'last_week') {
        const day = now.getDay();
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        return { start: fmt(lastMonday), end: fmt(lastSunday) };
    }
    if (period === 'last_month') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: fmt(s), end: fmt(e) };
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
        const [y, m] = period.split('-').map(Number);
        return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
    }
    if (period === 'custom' && customStart && customEnd) {
        return { start: customStart, end: customEnd };
    }
    return null;
}

// ─── Componente: Card de Pacientes (Leads + Novos) ──────────────────────────
const PatientsSummaryCard = ({
    leads,
    novos,
    periodRange,
    selectedPeriod,
    loading: externalLoading = false,
    onOpenNewPatients,
}: {
    leads: any[];
    novos: any[];
    periodRange: { start: string; end: string } | null;
    selectedPeriod?: string;
    loading?: boolean;
    onOpenNewPatients?: () => void;
}) => {
    const periodLabel = selectedPeriod === 'day' ? 'Agendamentos do dia'
        : selectedPeriod === 'week' ? 'Agendamentos da semana'
        : selectedPeriod === 'last_week' ? 'Agendamentos semana passada'
        : selectedPeriod === 'month' ? 'Agendamentos do mês'
        : selectedPeriod === 'last_month' ? 'Agendamentos mês passado'
        : 'Agendamentos do período';
    const [leadsModalOpen, setLeadsModalOpen] = useState(false);
    const [newPatientsModalOpen, setNewPatientsModalOpen] = useState(false);
    const theme = useTheme();

    if (!periodRange) return null;

    return (
        <Box
            sx={{
                backgroundColor: 'white',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                p: 3,
                border: `1px solid ${theme.palette.divider}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 700,
                        color: 'grey.900',
                        letterSpacing: '-0.02em'
                    }}
                >
                    Pacientes
                </Typography>
            </Box>

            <Grid container spacing={2} sx={{ flex: 1 }}>
                {/* Agendamentos do dia */}
                <Grid item xs={12} sm={6} sx={{ display: 'flex' }}>
                    <Box
                        sx={{
                            backgroundColor: '#FDF2F8',
                            borderRadius: 2,
                            p: 2.5,
                            border: '1px solid #DB2777',
                            cursor: 'pointer',
                            width: '100%',
                            height: '100%',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                        }}
                        onClick={() => leads.length > 0 && setLeadsModalOpen(true)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 20 20" fill="#DB2777">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                            <Typography variant="caption" sx={{ color: '#DB2777', fontWeight: 600 }}>
                                {periodLabel}
                            </Typography>
                        </Box>

                        {externalLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500" />
                            </Box>
                        ) : (
                            <>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#DB2777', fontSize: '1.5rem' }}>
                                    {leads.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                    {leads.length === 1 ? 'lead' : 'agendamentos'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#DB2777', mt: 0.5, display: 'block' }}>
                                    {leads.length > 0 ? 'Clique para ver detalhes' : 'Nenhum lead no período'}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Grid>

                {/* Pacientes Novos Cadastrados */}
                <Grid item xs={12} sm={6} sx={{ display: 'flex' }}>
                    <Box
                        sx={{
                            backgroundColor: '#ECFDF5',
                            borderRadius: 2,
                            p: 2.5,
                            border: '1px solid #059669',
                            cursor: 'pointer',
                            width: '100%',
                            height: '100%',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                        }}
                        onClick={() => novos.length > 0 && onOpenNewPatients?.()}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 20 20" fill="#059669">
                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                            <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                                Pacientes Novos Cadastrados
                            </Typography>
                        </Box>

                        {externalLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500" />
                            </Box>
                        ) : (
                            <>
                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669', fontSize: '1.5rem' }}>
                                    {novos.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                    {novos.length === 1 ? 'novo paciente' : 'novos pacientes'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#059669', mt: 0.5, display: 'block' }}>
                                    {novos.length > 0 ? 'Clique para ver detalhes' : 'Nenhum paciente novo no período'}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Grid>
            </Grid>

            {/* Total */}
            <Box
                sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                    Total do Período
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'grey.800' }}>
                    {(leads.length || 0) + (novos.length || 0)}
                </Typography>
            </Box>

            {/* Modal de Leads */}
            {leadsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setLeadsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Agendamentos do Período</h3>
                                <p className="text-sm text-gray-500 mt-1">Período: {periodRange.start} a {periodRange.end}</p>
                            </div>
                            <button onClick={() => setLeadsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            {leads.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Nenhum lead encontrado.</p>
                            ) : (
                                <div className="space-y-3">
                                    {leads.map((lead: any) => (
                                        <div key={lead._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{lead.patientInfo?.fullName || 'Nome não informado'}</p>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                            </svg>
                                                            {lead.patientInfo?.phone || 'Sem telefone'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                            </svg>
                                                            {lead.date ? new Date(lead.date).toLocaleDateString('pt-BR') : ''} {lead.time}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-pink-100 text-pink-700">Pré-agendado</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <p className="text-sm text-gray-600 text-center">
                                Total de <strong>{leads.length}</strong> agendamento{leads.length !== 1 ? 's' : ''} no período
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pacientes Novos */}
            {newPatientsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNewPatientsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Pacientes Novos</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Período: {periodRange.start} a {periodRange.end}
                                </p>
                            </div>
                            <button
                                onClick={() => setNewPatientsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            {novos.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Nenhum paciente novo encontrado.</p>
                            ) : (
                                <div className="space-y-3">
                                    {novos.map((patient: any) => (
                                        <div key={patient._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {patient.patient?.fullName || patient.patientInfo?.fullName || 'Nome não informado'}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                            </svg>
                                                            {patient.patient?.phone || patient.patientInfo?.phone || 'Sem telefone'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                            </svg>
                                                            {patient.date ? new Date(patient.date).toLocaleDateString('pt-BR') : ''} {patient.time}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                                            {patient.specialty}
                                                        </span>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                            {patient.doctor?.fullName || 'Profissional não informado'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_MAP[patient.operationalStatus]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {STATUS_MAP[patient.operationalStatus]?.label || patient.operationalStatus}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                            <p className="text-sm text-gray-600 text-center">
                                Total de <strong>{novos.length}</strong> paciente{novos.length !== 1 ? 's' : ''} novo{novos.length !== 1 ? 's' : ''} no período
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </Box>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

interface PaymentPageProps {
    doctors?: IDoctor[];
    onMarkAsPaid?: (payment: FinancialRecord) => void;
    registerAppointmentAndPayemntFuture?: (payment: FinancialRecord) => void;
    onCancelPayment?: (paymentId: string) => void;
    enabled?: boolean;
    month?: number;
    year?: number;
}

const PaymentPage = ({ doctors, onMarkAsPaid, onCancelPayment: onCancelPaymentProp, registerAppointmentAndPayemntFuture, enabled = true, month, year }: PaymentPageProps) => {
    // 🚀 SOURCE OF TRUTH: Context API (padrão do projeto)
    const {
        payments: allPaymentsRaw = [],
        setPayments: setAllPayments = () => { },
        updatePayment: updatePaymentContext,
    } = usePaymentsContext();

    // 🆕 DTO: Normaliza FinancialRecord → PaymentDTO na borda
    const allPayments = useMemo(() => mapFinancialRecordListToPaymentDTO(allPaymentsRaw), [allPaymentsRaw]);

    // 🚀 NOVO: Usa AppointmentsContext como fonte única de dados
    const { appointments, fetchAppointments, isLoading: appointmentsLoading } = useAppointmentsContext();

    // 🆕 Analytics de novos pacientes / retornos 45+ dias (inclui pré-agendamentos)
    const { data: analyticsData, loading: analyticsLoading, fetch: fetchAnalytics } = useAppointmentsByType();

    const [appointmentRecords, setAppointmentRecords] = useState<FinancialRecord[]>([]);

    const [filteredPayments, setFilteredPayments] = useState<PaymentDTO[]>([]);
    // 🚀 Loading vem do AppointmentsContext (fonte única)
    const loading = appointmentsLoading;
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [paymentToEdit, setPaymentToEdit] = useState<FinancialRecord | undefined>(undefined);

    // 🆕 NOVO: Modal de agendamento (para registros de appointment)
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<any>(null);

    // 🆕 Modal de detalhes de Pacientes Novos
    const [isNewPatientsModalOpen, setIsNewPatientsModalOpen] = useState(false);

    // 🆕 NOVO: Referência para funções do calendário (mock por enquanto)
    const mockDoctors = doctors || [];
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'last_week' | 'last_month' | 'custom' | string>('day');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    useEffect(() => {
        if (month && year) {
            setSelectedPeriod(`${year}-${String(month).padStart(2, '0')}`);
        }
    }, [month, year]);

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const patientParam = params.get("patient");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);
    const [selectedAppointments, setSelectedAppointments] = useState<any[]>([]);

    const {
        fetchPayments,
        paymentTotals,
        fetchPaymentTotals,
    } = usePayment();

    // 🚀 NOVO: Sincroniza appointments do contexto para FinancialRecords
    useEffect(() => {
        const mapped: FinancialRecord[] = (appointments || [])
            .map(mapAppointmentToRecord)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        console.log('[PaymentPage] AppointmentsContext mapeados:', mapped.length, 'registros');
        setAppointmentRecords(mapped);
        setAllPayments(mapped);
    }, [appointments, setAllPayments]);

    // 🚀 NOVO: Busca appointments no contexto de acordo com o período
    const syncAppointments = useCallback(async (params: { startDate?: string; endDate?: string } = {}) => {
        console.log('[PaymentPage] Sincronizando appointments via contexto:', params);
        await fetchAppointments({
            startDate: params.startDate,
            endDate: params.endDate,
            force: false
        });
    }, [fetchAppointments]);

    // 🆕 Busca analytics de lifecycle (novos / retornos 45+) quando o período muda
    // Usa mode='date' para alinhar com a visão operacional da tabela financeira
    useEffect(() => {
        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
        if (range) {
            fetchAnalytics({ startDate: range.start, endDate: range.end, mode: 'date' });
        }
    }, [selectedPeriod, customStartDate, customEndDate, fetchAnalytics]);

    // 🔹 Carregar role do usuário
    useEffect(() => {
        const userString = localStorage.getItem('user') ?? '{}';

        try {
            const parsedUser = JSON.parse(userString);

            if (parsedUser) {
                setUserRole(parsedUser.role?.trim().toLowerCase() ?? null);
                setUser(parsedUser);
            }
        } catch (e) {
            console.error('Erro ao ler usuário do localStorage', e);
        }
    }, []);


    // 🔹 Filtrar por paciente na URL - apenas atualiza estado inicial dos filtros
    useEffect(() => {
        if (patientParam && allPayments.length > 0) {
            const filtered = allPayments.filter(p =>
                p.patient.name.toLowerCase().includes(patientParam.toLowerCase())
            );

            if (filtered.length > 0) {
                toast.info(`🔍 Exibindo pagamentos de ${patientParam}`);
            } else {
                toast.warn(`Nenhum pagamento encontrado para ${patientParam}`);
            }
        }
    }, [patientParam, allPayments]);

    // 🔹 Carregar pagamentos de hoje quando a aba for ativada
    useEffect(() => {
        if (!enabled) return;

        const today = new Date().toISOString().split('T')[0];
        syncAppointments({ startDate: today, endDate: today });
        fetchPaymentTotals({ period: 'day' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    // 🔹 FILTRO DE PERÍODO NO FRONTEND: Filtra os pagamentos já carregados
    useEffect(() => {
        if (allPayments.length === 0) return;

        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
        if (!range) {
            setFilteredPayments(allPayments);
            return;
        }

        console.log('[PaymentPage] Filtrando período:', selectedPeriod, range);

        const filtered = allPayments.filter(payment => {
            const paymentDate = payment.date;
            return paymentDate >= range.start && paymentDate <= range.end;
        });

        console.log('[PaymentPage] Filtrado:', filtered.length, 'de', allPayments.length);
        setFilteredPayments(filtered);
    }, [allPayments, selectedPeriod, customStartDate, customEndDate]);

    const handleEditAmount = (paymentId: string) => {
        const payment = allPayments.find(p => p.id === paymentId);

        if (!payment) {
            toast.error('Registro não encontrado.');
            return;
        }

        setPaymentToEdit(payment);
        setIsEditModalOpen(true);
    };

    const handleUpdateAmount = async (data: {
        id: string;
        amount: number;
        date: string;
        status: string;
        paymentMethod: string;
        serviceType: string;
        specialty: string;
    }) => {
        try {
            // 🚨 GARANTIA: usa o paymentId real, nunca o appointmentId
            const targetPaymentId = paymentToEdit?.__realPaymentId || data.id;

            const response = await updatePayment(targetPaymentId, {
                amount: data.amount,
                date: data.date,
                status: data.status,
                serviceType: data.serviceType,
                paymentMethod: data.paymentMethod,
                specialty: data.specialty,
            });

            // ✅ Normaliza a resposta (mesmo padrão do usePayment)
            const updated = response.data?.data ?? response.data ?? response;

            // ✅ Atualiza Context (Source of Truth)
            updatePaymentContext(updated);
            setFilteredPayments(prev => prev.map(p => p._id === targetPaymentId ? updated : p));

            // ✅ Fecha modal
            setIsEditModalOpen(false);
            setPaymentToEdit(undefined);

            // 🔄 RECARREGA LISTA para refletir mudanças no backend
            const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
            if (range) {
                await syncAppointments({ startDate: range.start, endDate: range.end });
            }
            fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });

            toast.success('💚 Pagamento atualizado!');

        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error);
            toast.error('Erro ao atualizar pagamento');
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await exportCSV();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'pagamentos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            toast.error('Erro ao exportar CSV');
        }
    };

    const handleExportPDF = async () => {
        try {
            const res = await exportPDF();
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_pagamentos.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            toast.error('Erro ao exportar PDF');
        }
    };

    const handleOpenNewPatients = () => {
        const novosList = analyticsData?.novos || [];
        setSelectedAppointments(novosList);
        if (novosList.length > 0) {
            setIsNewPatientsModalOpen(true);
        }
    };

    const [selectedPackage, setSelectedPackage] = useState<any>(null);

    const addPayment = async (newPaymentData?: any) => {
        if (!newPaymentData) return;

        setSelectedPackage((prev: any) => ({
            ...prev,
            payments: [...(prev?.payments || []), newPaymentData.payment],
            totalPaid: newPaymentData.updatedPackage?.totalPaid,
            balance: newPaymentData.updatedPackage?.balance,
            financialStatus: newPaymentData.updatedPackage?.financialStatus
        }));

        // 🔄 RECARREGA LISTA para mostrar novo pagamento
        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
        if (range) {
            await syncAppointments({ startDate: range.start, endDate: range.end });
        }
        fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });

        toast.success("Pacote atualizado com o novo pagamento 💚");
    };

    const getServiceTypeLabel = (type: string) => {
        const types: { [key: string]: string } = {
            'evaluation': 'Avaliação',
            'session': 'Sessão do Pacote',
            'package_session': 'Sessão do Pacote',
            'tongue_tie_test': 'Teste da Linguinha',
            'neuropsych_evaluation': 'Aval. Neuropsicóliga',
            'individual_session': 'Sessão Avulsa',
            'package': 'Pacote'
        };
        return types[type] || type;
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };

    // 🔄 Wrapper para onCancelPayment que recarrega a lista após cancelamento
    const handleCancelPayment = async (paymentId: string) => {
        if (onCancelPaymentProp) {
            await onCancelPaymentProp(paymentId);
            // 🔄 RECARREGA LISTA após cancelar pagamento
            const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
            if (range) {
                await syncAppointments({ startDate: range.start, endDate: range.end });
            }
            fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
        }
    };

    return (
        <div className="space-y-4 p-3 sm:p-4">
            {/* Área de Filtros e Resumo Financeiro */}
            <div className="space-y-4">
                {/* Linha de período e botões de exportação */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Seletor de período (mantido exatamente igual) */}
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs font-medium text-gray-600">Período:</label>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { key: 'day', label: 'Hoje', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
                                { key: 'week', label: 'Esta Semana', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
                                { key: 'month', label: 'Este Mês', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
                                { key: 'last_week', label: 'Semana Passada', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
                                { key: 'last_month', label: 'Mês Passado', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' },
                            ].map((chip) => (
                                <button
                                    key={chip.key}
                                    onClick={() => {
                                        setSelectedPeriod(chip.key as any);
                                        // ... lógica original
                                        if (chip.key === 'last_week') {
                                            const now = new Date();
                                            const dayOfWeek = now.getDay();
                                            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                            const lastMonday = new Date(now);
                                            lastMonday.setDate(now.getDate() - diffToMonday - 7);
                                            lastMonday.setHours(0, 0, 0, 0);
                                            const lastSunday = new Date(lastMonday);
                                            lastSunday.setDate(lastMonday.getDate() + 6);
                                            lastSunday.setHours(23, 59, 59, 999);
                                            fetchPaymentTotals({
                                                period: 'custom',
                                                startDate: lastMonday.toISOString(),
                                                endDate: lastSunday.toISOString()
                                            });
                                        } else if (chip.key === 'last_month') {
                                            const now = new Date();
                                            const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                            const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                            lastDayLastMonth.setHours(23, 59, 59, 999);
                                            fetchPaymentTotals({
                                                period: 'custom',
                                                startDate: firstDayLastMonth.toISOString(),
                                                endDate: lastDayLastMonth.toISOString()
                                            });
                                        } else {
                                            fetchPaymentTotals({ period: chip.key as any });
                                            const range = computeDateRange(chip.key, '', '');
                                            if (range) syncAppointments({ startDate: range.start, endDate: range.end });
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedPeriod === chip.key
                                        ? 'ring-2 ring-offset-1 ring-green-500 ' + chip.color
                                        : chip.color
                                        }`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>

                        <select
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={selectedPeriod}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedPeriod(value);
                                // ... lógica original
                                if (/^\d{4}-\d{2}$/.test(value)) {
                                    const [year, month] = value.split('-').map(Number);
                                    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
                                    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                                    fetchPaymentTotals({ period: 'custom', startDate, endDate });
                                    syncAppointments({ startDate, endDate });
                                } else if (value === 'last_week') {
                                    const now = new Date();
                                    const dayOfWeek = now.getDay();
                                    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                    const lastMonday = new Date(now);
                                    lastMonday.setDate(now.getDate() - diffToMonday - 7);
                                    lastMonday.setHours(0, 0, 0, 0);
                                    const lastSunday = new Date(lastMonday);
                                    lastSunday.setDate(lastMonday.getDate() + 6);
                                    lastSunday.setHours(23, 59, 59, 999);
                                    const lwStart = lastMonday.toISOString().split('T')[0];
                                    const lwEnd = lastSunday.toISOString().split('T')[0];
                                    fetchPaymentTotals({ period: 'custom', startDate: lwStart, endDate: lwEnd });
                                    syncAppointments({ startDate: lwStart, endDate: lwEnd });
                                } else if (value === 'last_month') {
                                    const now = new Date();
                                    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                    lastDayLastMonth.setHours(23, 59, 59, 999);
                                    const sd = firstDayLastMonth.toISOString().split('T')[0];
                                    const ed = lastDayLastMonth.toISOString().split('T')[0];
                                    fetchPaymentTotals({ period: 'custom', startDate: sd, endDate: ed });
                                    syncAppointments({ startDate: sd, endDate: ed });
                                } else if (value === 'custom') {
                                    return;
                                } else {
                                    fetchPaymentTotals({ period: value as 'day' | 'week' | 'month' | 'year' | 'all' });
                                    const range = computeDateRange(value, '', '');
                                    if (range) syncAppointments({ startDate: range.start, endDate: range.end });
                                }
                            }}
                        >
                            <optgroup label="Períodos Rápidos">
                                <option value="day">Hoje</option>
                                <option value="week">Esta Semana</option>
                                <option value="month">Este Mês</option>
                                <option value="last_week">📅 Semana Passada</option>
                                <option value="last_month">📅 Mês Passado</option>
                                <option value="year">Este Ano</option>
                                <option value="all">Todo Período</option>
                                <option value="custom">📆 Período Customizado</option>
                            </optgroup>
                            <optgroup label="Últimos 12 Meses">
                                {(() => {
                                    const months = [];
                                    const now = new Date();
                                    const monthNames = [
                                        'Janeiro', 'Fevereiro', 'Março', 'Abril',
                                        'Maio', 'Junho', 'Julho', 'Agosto',
                                        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                                    ];
                                    for (let i = 0; i < 12; i++) {
                                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                        const year = d.getFullYear();
                                        const month = d.getMonth();
                                        const value = `${year}-${String(month + 1).padStart(2, '0')}`;
                                        const label = `${monthNames[month]} ${year}`;
                                        months.push(<option key={value} value={value}>{label}</option>);
                                    }
                                    return months;
                                })()}
                            </optgroup>
                        </select>

                        {selectedPeriod === 'custom' && (
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-green-500"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                                <span className="text-gray-500 text-xs">até</span>
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-green-500"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                                <button
                                    onClick={() => {
                                        if (customStartDate && customEndDate) {
                                            fetchPaymentTotals({
                                                period: 'custom',
                                                startDate: new Date(customStartDate).toISOString(),
                                                endDate: new Date(customEndDate + 'T23:59:59').toISOString()
                                            });
                                            syncAppointments({ startDate: customStartDate, endDate: customEndDate });
                                        } else {
                                            toast.warning('Selecione as datas inicial e final');
                                        }
                                    }}
                                    disabled={!customStartDate || !customEndDate}
                                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Aplicar
                                </button>
                            </div>
                        )}

                        {loading && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-500"></div>}
                    </div>

                    {/* Botões de exportação */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outlined"
                            startIcon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            }
                            onClick={handleExportCSV}
                            disabled={loading}
                            size="small"
                            sx={{
                                borderRadius: 1.5,
                                px: 2,
                                py: 0.5,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                textTransform: 'none'
                            }}
                        >
                            CSV
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            }
                            onClick={handleExportPDF}
                            disabled={loading}
                            size="small"
                            sx={{
                                borderRadius: 1.5,
                                px: 2,
                                py: 0.5,
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                textTransform: 'none',
                                borderColor: 'grey.300',
                                color: 'grey.700',
                            }}
                        >
                            PDF
                        </Button>
                    </div>
                </div>

                {/* Cards de resumo */}
                {paymentTotals && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
                        <div className="h-full">
                            <FinancialSummaryCard
                                data={{
                                    totalReceived: paymentTotals.totalReceived || 0,
                                    totalPending: paymentTotals.totalPending || 0,
                                    countReceived: paymentTotals.countReceived || 0,
                                    countPending: paymentTotals.countPending || 0,
                                    particularReceived: paymentTotals.particularReceived || 0,
                                    particularPending: paymentTotals.particularPending || 0,
                                    particularCountReceived: paymentTotals.particularCountReceived || 0,
                                    particularCountPending: paymentTotals.particularCountPending || 0,
                                }}
                                periodLabel={
                                    customStartDate && customEndDate
                                        ? `${customStartDate} a ${customEndDate}`
                                        : selectedPeriod === 'day'
                                            ? 'Hoje'
                                            : selectedPeriod === 'week'
                                                ? 'Esta Semana'
                                                : selectedPeriod === 'month'
                                                    ? 'Este Mês'
                                                    : new Date().toLocaleDateString('pt-BR')
                                }
                            />
                        </div>
                        <div className="h-full">
                            <PatientsSummaryCard
                                leads={analyticsData?.leads || []}
                                novos={analyticsData?.novos || []}
                                periodRange={computeDateRange(selectedPeriod, customStartDate, customEndDate)}
                                selectedPeriod={selectedPeriod}
                                loading={analyticsLoading}
                                onOpenNewPatients={handleOpenNewPatients}
                            />
                        </div>
                    </div>
                )}

                {/* Mensagem quando não há resumo */}
                {!paymentTotals && !loading && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700 text-xs">Selecione um período acima para visualizar o resumo financeiro.</p>
                    </div>
                )}

                {/* Filtro de paciente na URL (opcional) */}
                {patientParam && (
                    <div className="flex justify-end">
                        <Button
                            variant="outlined"
                            startIcon={
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            }
                            onClick={() => {
                                window.history.replaceState(null, "", "/financeiro");
                                setFilteredPayments(allPayments);
                                toast.info("Filtro de paciente removido");
                            }}
                            size="small"
                            sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                        >
                            Limpar filtro de {patientParam}
                        </Button>
                    </div>
                )}

                {/* Componente de filtros avançados (PaymentsFilters) */}
                <PaymentsFilters doctors={doctors || []} payments={allPayments} onFilter={setFilteredPayments} />

                {/* Tabela de pagamentos */}
                {error ? (
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.light', color: 'error.dark' }}>
                        <Typography variant="body2" gutterBottom>{error}</Typography>
                        <Button variant="contained" startIcon={<RefreshCw size={14} />} onClick={fetchPayments} size="small">
                            Tentar novamente
                        </Button>
                    </Paper>
                ) : loading ? (
                    <FinancialTableLoading rowCount={6} colSpan={1} />
                ) : (
                    <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'grey.200' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paciente / Profissional</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Agendamento</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Sessões</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Método</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentPayments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <User className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                    <span
                                                        className="cursor-pointer hover:text-blue-600 hover:underline font-medium text-xs text-gray-900 truncate max-w-[130px]"
                                                        title={payment.patient.name}
                                                        onClick={() => payment.patient.id && handleOpen360(payment.patient.id)}
                                                    >
                                                        {payment.patient.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Stethoscope className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 truncate max-w-[130px]" title={payment.doctor?.name}>
                                                        {payment.doctor?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 hidden md:table-cell">
                                                {(() => {
                                                    const appointmentDate = payment.appointment?.date || payment.date;
                                                    const appointmentTime = payment.appointment?.time;
                                                    const operationalStatus = payment.appointment?.status || 'scheduled';
                                                    const statusColors: Record<string, string> = {
                                                        scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                                                        confirmed: 'bg-green-100 text-green-800 border-green-200',
                                                        completed: 'bg-purple-100 text-purple-800 border-purple-200',
                                                        canceled: 'bg-red-100 text-red-800 border-red-200',
                                                        missed: 'bg-orange-100 text-orange-800 border-orange-200',
                                                        processing_complete: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                    };
                                                    const colors = statusColors[operationalStatus] || statusColors.scheduled;
                                                    if (!appointmentDate) return <span className="text-xs text-gray-400">—</span>;
                                                    return (
                                                        <div className={`inline-flex flex-col px-2 py-1 rounded-md border ${colors}`}>
                                                            <span className="text-[10px] font-medium">{formatDateToDMY(appointmentDate)}</span>
                                                            {appointmentTime && <span className="text-xs font-bold">{appointmentTime}</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-2 text-center text-xs text-gray-600 hidden lg:table-cell">
                                                {payment && payment.advancedSessions?.length > 0 ? payment.advancedSessions.length : '0'}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-600 hidden lg:table-cell">
                                                {getServiceTypeLabel(payment.serviceType)}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-semibold text-gray-900">
                                                {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${payment.status === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : payment.status === 'partial'
                                                        ? 'bg-orange-100 text-orange-800'
                                                        : payment.status === 'pending'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {payment.status === 'paid'
                                                        ? 'PAGO'
                                                        : payment.status === 'partial'
                                                            ? 'PARCIAL'
                                                            : payment.status === 'pending'
                                                                ? 'PENDENTE'
                                                                : 'CANCELADO'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 hidden sm:table-cell">
                                                {(() => {
                                                    const billingType = payment.billingType || 'particular';
                                                    const billingConfig: Record<string, { label: string; color: string; icon: string }> = {
                                                        particular: { label: 'Particular', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '💵' },
                                                        convenio: { label: 'Convênio', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🏥' },
                                                        liminar: { label: 'Liminar', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⚖️' },
                                                        sus: { label: 'SUS', color: 'bg-teal-100 text-teal-800 border-teal-200', icon: '🏛️' }
                                                    };
                                                    const config = billingConfig[billingType] || billingConfig.particular;
                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.color}`}>
                                                            <span>{config.icon}</span>
                                                            <span>{config.label}</span>
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-2">
                                                <PaymentActionIcons
                                                    payment={payment}
                                                    onMarkAsPaid={() => onMarkAsPaid(payment)}
                                                    registerAppointmentAndPayemntFuture={() => registerAppointmentAndPayemntFuture(payment)}
                                                    onCancelPayment={handleCancelPayment}
                                                    onEditAmount={handleEditAmount}
                                                    onAddPaymentToPackage={(pkg) => {
                                                        setSelectedPackage(pkg);
                                                        setSelectedPackageId(pkg._id);
                                                        setIsAddModalOpen(true);
                                                    }}
                                                    disabled={!(userRole && ['admin', 'secretary'].includes(userRole) && payment.status !== 'canceled')}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginação */}
                        <div className="px-4 py-3 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Typography variant="body2" color="grey.600" className="text-xs">
                                        Itens por página:
                                    </Typography>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="border border-gray-300 rounded-md px-2 py-0.5 text-xs"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button variant="outlined" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} size="small" sx={{ minWidth: '32px', height: '32px' }}>
                                        Anterior
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                                        const page = index + 1;
                                        const isActive = currentPage === page;
                                        return (
                                            <Button
                                                key={page}
                                                variant={isActive ? "contained" : "outlined"}
                                                onClick={() => setCurrentPage(page)}
                                                size="small"
                                                sx={{ minWidth: '32px', height: '32px', fontWeight: isActive ? 'bold' : 'normal' }}
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                    {totalPages > 5 && <span className="text-gray-500 text-xs">...</span>}
                                    <Button variant="outlined" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} size="small" sx={{ minWidth: '32px', height: '32px' }}>
                                        Próxima
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Paper>
                )}
            </div>

            {/* Modais */}
            {isEditModalOpen && paymentToEdit && (
                <PaymentModal
                    open={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setPaymentToEdit(undefined); }}
                    payment={paymentToEdit}
                    doctors={mockDoctors}
                    onPaymentSuccess={async (data) => {
                        const targetId = paymentToEdit.__realPaymentId || paymentToEdit._id;
                        await updatePayment(targetId, {
                            amount: data.amount,
                            paymentMethod: data.paymentMethod,
                            serviceType: data.serviceType,
                            specialty: data.specialty,
                            status: data.status,
                            notes: data.notes,
                        });
                        setIsEditModalOpen(false);
                        setPaymentToEdit(undefined);
                        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
                        if (range) await syncAppointments({ startDate: range.start, endDate: range.end });
                        fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
                        toast.success('Pagamento atualizado!');
                    }}
                />
            )}

            {/* 🆕 NOVO: Modal de Agendamento (para registros de appointment) */}
            {isAppointmentModalOpen && appointmentToEdit && (
                <AppointmentDetailModal
                    isOpen={isAppointmentModalOpen}
                    onClose={() => {
                        setIsAppointmentModalOpen(false);
                        // 🔄 RECARREGA LISTA quando fechar o modal (após edição)
                        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
                        if (range) {
                            syncAppointments({ startDate: range.start, endDate: range.end });
                        }
                        fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
                    }}
                    event={appointmentToEdit}
                    doctors={mockDoctors}
                    onCancelAppointment={async (id, reason) => {
                        console.log('Cancelar agendamento:', id, reason);
                        toast.success('Agendamento cancelado');
                        setIsAppointmentModalOpen(false);
                        // 🔄 RECARREGA LISTA após cancelar
                        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
                        if (range) {
                            await syncAppointments({ startDate: range.start, endDate: range.end });
                        }
                        fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
                    }}
                    onCompleteAppointment={async (id, data) => {
                        console.log('Completar agendamento:', id, data);
                        toast.success('Agendamento completado');
                        setIsAppointmentModalOpen(false);
                        // 🔄 RECARREGA LISTA após completar
                        const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
                        if (range) {
                            await syncAppointments({ startDate: range.start, endDate: range.end });
                        }
                        fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
                    }}
                    onEditAppointment={async (id, data) => {
                        try {
                            await appointmentService.update(id, data);
                            toast.success('Agendamento atualizado');
                            setIsAppointmentModalOpen(false);
                            const range = computeDateRange(selectedPeriod, customStartDate, customEndDate);
                            if (range) {
                                await syncAppointments({ startDate: range.start, endDate: range.end });
                            }
                            fetchPaymentTotals({ period: selectedPeriod === 'custom' ? 'day' : selectedPeriod });
                        } catch (err: any) {
                            toast.error(err?.response?.data?.message || 'Erro ao atualizar agendamento');
                        }
                    }}
                />
            )}
            {isAddModalOpen && (
                <AddPaymentModal
                    packageData={selectedPackage}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={addPayment}
                />
            )}
            {selectedPatient360Id && (
                <Patient360Modal
                    patientId={selectedPatient360Id}
                    open={is360ModalOpen}
                    onClose={() => setIs360ModalOpen(false)}
                />
            )}

            {/* 🆕 Modal de detalhes: Pacientes Novos */}
            {isNewPatientsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setIsNewPatientsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Pacientes Novos</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedAppointments.length} {selectedAppointments.length === 1 ? 'paciente novo' : 'pacientes novos'} no período
                                </p>
                            </div>
                            <button
                                onClick={() => setIsNewPatientsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6">
                            <div className="space-y-3">
                                {selectedAppointments.map((apt: any) => (
                                    <div key={apt._id} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">
                                                    {apt.patient?.fullName || apt.patientName || apt.patientInfo?.fullName || 'Nome não informado'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Stethoscope className="h-4 w-4" />
                                                        {apt.doctor?.fullName || apt.doctorName || 'Profissional não informado'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {apt.date ? new Date(apt.date).toLocaleDateString('pt-BR') : '-'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        {apt.time || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right md:text-right">
                                                <span className="text-xs uppercase tracking-wide text-gray-400">{apt.specialty}</span>
                                                <p className="font-semibold text-gray-900">
                                                    {/* 💰 V2 RULE: exibir paymentAmount (Payment), não sessionValue */}
                                                    R$ {(apt.payment?.amount || apt.paymentAmount || apt.valor || 0).toFixed(2)}
                                                </p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${apt.operationalStatus === 'pre_agendado'
                                                        ? 'bg-pink-100 text-pink-700'
                                                        : apt.operationalStatus === 'scheduled'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : apt.operationalStatus === 'confirmed'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {apt.operationalStatus === 'pre_agendado' ? 'Pré-agendado'
                                                        : apt.operationalStatus === 'scheduled' ? 'Agendado'
                                                            : apt.operationalStatus === 'confirmed' ? 'Confirmado'
                                                                : apt.operationalStatus || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 p-4 flex justify-end">
                            <button
                                onClick={() => setIsNewPatientsModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentPage;