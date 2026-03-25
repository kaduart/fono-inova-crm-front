import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Button, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { ptBR } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Plus, User, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { INSURANCE_PROVIDERS } from '../../constants/insuranceProviders';
import { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment, SelectedEvent } from '../../utils/types/types';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import AppointmentDetailModal from './appointmentDetailModal';

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: ScheduleAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string, data?: { addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string }) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    onMonthChange?: (startDate: Date, endDate: Date) => void;
    statusConfig?: StatusConfig;
    openModalAppointment?: boolean;
    closeModalSignal?: number;
    onConvertPreAgendamento?: (id: string) => Promise<void>;
}

export const PAYMENT_STATUS_CONFIG = {
    paid: {
        label: "Pago",
        color: "#1c7721ff",
        icon: CheckCircle,
        bgColor: "#b1eeafff",
        textColor: "#4da088ff",
    },
    package_paid: {
        label: "Pacote",
        color: "#16a34a",
        icon: CheckCircle,
        bgColor: "#dcfce7",
        textColor: "#166534",
    },
    partial: {
        label: "Parcial",
        color: "#f59e0b",
        icon: AlertCircle,
        bgColor: "#fef9c3",
        textColor: "#92400e",
    },
    advanced: {
        label: "Adiantado",
        color: "#2563eb",
        icon: DollarSign,
        bgColor: "#e0f2fe",
        textColor: "#1e3a8a",
    },
    canceled: {
        label: "Cancelado",
        color: "#dc2626",
        icon: XCircle,
        bgColor: "#a9afb9ff",
        textColor: "#7f1d1d",
    },
    pending: {
        label: "Pendente",
        color: "#b91c1c",
        icon: DollarSign,
        bgColor: "rgba(235, 130, 219, 1)",
        textColor: "#7f1d1d",
    },
};

export const OPERATIONAL_STATUS_VISUAL_CONFIG = {
    scheduled: {
        label: "Agendado",
        color: "#3b82f6",
        icon: Clock,
    },
    confirmed: {
        label: "Confirmado",
        color: "#10b981",
        icon: CheckCircle,
    },
    in_progress: {
        label: "Em Andamento",
        color: "#f59e0b",
        icon: AlertCircle,
    },
    completed: {
        label: "Concluído",
        color: "#22c55e",
        icon: CheckCircle,
    },
    canceled: {
        label: "Cancelado",
        color: "#6b7280",
        icon: XCircle,
    },
    absent: {
        label: "Não Compareceu",
        color: "#ef4444",
        icon: XCircle,
    },
    pre_agendado: {
        label: "Pré-Agendado",
        color: "#ec4899", // Rosa
        icon: Clock,
    },
};

export const VISUAL_FLAG_CONFIG = {
    ok: {
        label: 'Tudo Pago',
        color: '#22c55e',
        textColor: '#166534',
        icon: CheckCircle,
    },
    partial: {
        label: 'Parcial',
        color: '#f59e0b',
        textColor: '#92400e',
        icon: AlertCircle,
    },
    pending: {
        label: 'A receber',
        color: '#ef4444',
        textColor: '#991b1b',
        icon: Clock,
    },
    blocked: {
        label: 'Cancelado',
        color: '#991b1b',
        textColor: '#7f1d1d',
        icon: XCircle,
    },
};

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({
    appointments,
    doctors,
    patients,
    onDateClick,
    onNewAppointment,
    onCancelAppointment,
    onCompleteAppointment,
    onEditAppointment,
    openModalAppointment,
    closeModalSignal,
    onFetchAvailableSlots,
    onMonthChange,
    statusConfig = OPERATIONAL_STATUS_CONFIG,
    onConvertPreAgendamento
}) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [appointmentData, setAppointmentData] = useState<IAppointment | null>(null);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [isAppointmentDetailModalOpen, setIsAppointmentDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const theme = useTheme();

    // ✅ CORREÇÃO: Apenas estado essencial, SEM loading automático
    // O loading automático estava causando re-renders infinitos
    const [currentViewDate, setCurrentViewDate] = useState<string>('');

    // Scroll automático para o dia de hoje — dispara no mount e quando appointments carregam
    const hasScrolledToday = useRef(false);
    useEffect(() => {
        if (hasScrolledToday.current) return;
        let attempts = 0;
        const tryScroll = () => {
            const todayCell = document.querySelector('.fc-day-today');
            if (todayCell) {
                todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hasScrolledToday.current = true;
            } else if (attempts < 15) {
                attempts++;
                setTimeout(tryScroll, 300);
            }
        };
        const timer = setTimeout(tryScroll, 300);
        return () => clearTimeout(timer);
    }, [appointments]);

    // ✅ CORREÇÃO: Fecha ambos os modais quando closeModalSignal muda
    useEffect(() => {
        if (closeModalSignal && closeModalSignal > 0) {
            setOpenSchedule(false);
            setIsAppointmentDetailModalOpen(false);
            setSelectedEvent(null);
        }
    }, [closeModalSignal]);

    const getPaymentStatusConfig = useCallback((paymentStatus: string) => {
        return PAYMENT_STATUS_CONFIG[paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;
    }, []);

    const getOperationalStatusConfig = useCallback((operationalStatus: string) => {
        return (
            OPERATIONAL_STATUS_VISUAL_CONFIG[operationalStatus as keyof typeof OPERATIONAL_STATUS_VISUAL_CONFIG] || {
                label: "Indefinido",
                color: "#9ca3af",
                icon: Clock,
            }
        );
    }, []);

    const handleEventClick = (info: { event: any }) => {
        const { event } = info;
        console.log('🗓️ [Calendar] Evento clicado:', event);
        console.log('📦 [Calendar] ExtendedProps:', event.extendedProps);

        const formattedDate = event.start
            ? new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(event.start))
            : "";

        const time = `${String(event.start.getHours()).padStart(2, '0')}:${String(event.start.getMinutes()).padStart(2, '0')}`;
        const extendedProps = event.extendedProps;

        console.log('👤 [Calendar] Patient from extendedProps:', extendedProps.patient);
        console.log('👨‍⚕️ [Calendar] Doctor from extendedProps:', extendedProps.doctor);
        console.log('🆔 [Calendar] patientId:', extendedProps.patientId, 'doctorId:', extendedProps.doctorId);

        // 🔧 CORREÇÃO: Usa patientId/doctorId como fallback quando objeto não tem ID
        const patientId = extendedProps.patient?._id || extendedProps.patient?.id || extendedProps.patientId || '';
        const doctorId = extendedProps.doctor?._id || extendedProps.doctor?.id || extendedProps.doctorId || '';

        const selectedEventData = {
            id: event.id,
            patient: {
                id: patientId,
                fullName: extendedProps.patient?.fullName || "Paciente não informado"
            },
            doctor: {
                id: doctorId,
                fullName: extendedProps.doctor?.fullName || "Profissional não informado"
            },
            date: event.start ? new Date(event.start) : null,
            startTime: time,
            operationalStatus: extendedProps.operationalStatus || "scheduled",
            clinicalStatus: extendedProps.clinicalStatus || "pending",
            formattedDate,
            backgroundColor: event.backgroundColor,
            borderColor: event.borderColor,
            start: formattedDate,
            reason: extendedProps.reason || "",
            billingType: extendedProps.billingType || 'particular',
            insuranceProvider: extendedProps.insuranceProvider || '',
            insuranceValue: extendedProps.insuranceValue || 0,
            authorizationCode: extendedProps.authorizationCode || '',
            serviceType: extendedProps.serviceType || 'individual_session',
            paymentAmount: extendedProps.paymentAmount || extendedProps.sessionValue || 0,
            sessionValue: extendedProps.sessionValue || extendedProps.paymentAmount || 0,
            paymentMethod: extendedProps.paymentMethod || 'dinheiro',
            specialty: extendedProps.specialty || extendedProps.sessionType || '',
            __isPreAgendamento: extendedProps.__isPreAgendamento || false
        };

        console.log('📤 [Calendar] selectedEventData:', selectedEventData);
        setSelectedEvent(selectedEventData);
        setIsAppointmentDetailModalOpen(true);
    };

    // 🔹 MEMOIZAÇÃO DOS EVENTOS - Só recalcula quando appointments mudar
    const events = useMemo(() => {
        console.log('⚙️ Recalculando events:', appointments?.length || 0, 'appointments');

        if (!appointments || appointments.length === 0) {
            return [];
        }

        const validAppointments = appointments.filter(appt => {
            const hasDate = !!appt.date;
            const hasTime = !!appt.time;
            const hasId = !!(appt.id || appt._id);
            // 🎯 SIMPLIFICAÇÃO: Pré-agendamentos agora são tratados como agendamentos normais
            // com operationalStatus = 'pre_agendado', então não precisamos filtrar
            return hasDate && hasTime && hasId;
        });

        return validAppointments.map((appt) => {
            const [hours, minutes] = appt.time!.split(':').map(Number);
            const [year, month, day] = appt.date!.split('-').map(Number);

            const startDate = new Date(year, month - 1, day, hours, minutes);
            const endDate = new Date(startDate.getTime() + (appt.duration || 60) * 60000);

            const paymentConfig = getPaymentStatusConfig(appt.paymentStatus || 'pending');
            const operationalConfig = getOperationalStatusConfig(appt.operationalStatus || 'scheduled');

            return {
                id: appt._id || appt.id,
                title: `${appt.patient?.fullName || 'Paciente'} - ${appt.doctor?.fullName || 'Profissional'}`,
                start: startDate,
                end: endDate,
                extendedProps: {
                    ...appt,
                    paymentConfig,
                    operationalConfig,
                    time: (appt.time || '').trim(),
                    patientName: appt.patient?.fullName || 'Paciente',
                    doctorName: appt.doctor?.fullName || 'Profissional'
                },
                backgroundColor: paymentConfig.bgColor,
                borderColor: operationalConfig.color,
                textColor: paymentConfig.textColor,
                borderWidth: 4
            };
        });

    }, [appointments, getPaymentStatusConfig, getOperationalStatusConfig]);

    // 🔹 Ref para rastrear o último range processado e evitar loops
    const lastDateRangeRef = useRef<string>('');

    // 🔹 CALLBACK datesSet - Atualiza apenas o estado visual (não causa re-render do calendário)
    const handleDatesSet = useCallback((dateInfo: any) => {
        const start = dateInfo.start;
        const end = dateInfo.end;

        const year = start.getFullYear();
        const month = String(start.getMonth() + 1).padStart(2, '0');
        const viewDate = `${year}-${month}`;

        // ✅ Proteção contra loops: só processa se o range mudou
        const rangeKey = `${start.toISOString()}-${end.toISOString()}`;
        if (lastDateRangeRef.current === rangeKey) {
            return;
        }
        lastDateRangeRef.current = rangeKey;

        console.log('📆 datesSet:', viewDate);

        // Atualiza apenas para informação visual (header)
        setCurrentViewDate(viewDate);

        // Notifica o pai
        if (onMonthChange) {
            onMonthChange(start, end);
        }
    }, [onMonthChange]);

    // 🔹 CONFIGURAÇÃO DO CALENDÁRIO - ESTÁTICA (não muda nunca após montar)
    const calendarOptions = useMemo(() => ({
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: "dayGridMonth",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        locales: [ptBR],
        weekends: false,
        locale: 'pt-br',
        allDaySlot: false,
        expandRows: true,
        height: "auto",
        contentHeight: "auto",
        aspectRatio: 1.8,
        slotEventOverlap: false,
        eventOverlap: false,
        slotMinTime: "07:00:00",
        slotMaxTime: "20:00:00",
        slotDuration: "00:40:00",
        slotLabelInterval: "00:40:00",
        eventDisplay: "block",
        eventTimeFormat: {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        } as Intl.DateTimeFormatOptions,
        nowIndicator: true,
        dayMaxEventRows: 4,
        dayMaxEvents: true,
        eventMaxStack: false,
        stickyHeaderDates: true,
        eventBorderColor: "transparent",
        eventClassNames: "cursor-pointer hover:!opacity-90 transition-all duration-200",
        dayCellClassNames: "hover:bg-gray-50/50 transition-colors duration-200",
        windowResizeDelay: 100,
        eventMinHeight: 240,
        eventShortHeight: false,
        slotMinHeight: 140,
        datesSet: handleDatesSet,
        viewDidMount: (info: any) => {
            if (info.view.type === 'timeGridWeek' || info.view.type === 'timeGridDay') {
                const domEvents = document.querySelectorAll('.fc-timegrid-event');
                domEvents.forEach((event: any) => {
                    event.style.minHeight = '70px';
                });
            }
        }
    }), [handleDatesSet]);

    // 🔹 RENDERIZAÇÃO DE EVENTOS (memoizada)
    const renderEventContent = useCallback((arg: any) => {
        const paymentStatus = arg.event.extendedProps.paymentStatus || 'pending';
        const operationalStatus = arg.event.extendedProps.operationalStatus || 'scheduled';

        const paymentConfig = arg.event.extendedProps.paymentConfig || getPaymentStatusConfig(paymentStatus);
        const operationalConfig = arg.event.extendedProps.operationalConfig || getOperationalStatusConfig(operationalStatus);

        const patientName = arg.event.extendedProps.patientName || arg.event.extendedProps.patient?.fullName || 'Paciente';
        const doctorName = arg.event.extendedProps.doctorName || arg.event.extendedProps.doctor?.fullName || 'Profissional';

        const packageData = arg.event.extendedProps.package;
        const hasPackage = !!packageData;

        // 💰 SALDO DEVEDOR DO PACIENTE
        const patientBalance = arg.event.extendedProps.patientBalance || 0;
        const patientHasDebt = arg.event.extendedProps.patientHasDebt || false;

        // 🆕 NOVAS INFORMAÇÕES NO CARD
        const serviceType = arg.event.extendedProps.serviceType || arg.event.extendedProps.sessionType || 'Sessão';
        const specialty = arg.event.extendedProps.specialty || '';
        const sessionValue = arg.event.extendedProps.sessionValue || arg.event.extendedProps.paymentAmount || 0;
        const reason = arg.event.extendedProps.reason || arg.event.extendedProps.notes || '';

        // Mapear tipo de serviço para label amigável
        const SERVICE_TYPE_LABELS: Record<string, string> = {
            'individual_session': 'Sessão',
            'package_session': 'Pacote',
            'evaluation': 'Avaliação',
            'neuropsych_evaluation': 'Neuropsico',
            'return': 'Retorno',
            'alignment': 'Alinhamento',
            'meet': 'Reunião',
            'tongue_tie_test': 'Teste Lingua'
        };
        const serviceLabel = SERVICE_TYPE_LABELS[serviceType] || serviceType;

        // 🆕 DADOS DE CONVÊNIO
        const billingType = arg.event.extendedProps.billingType;
        const insuranceProvider = arg.event.extendedProps.insuranceProvider;
        // ✅ Mostra convênio se tiver insuranceProvider (mesmo se billingType estiver como particular)
        const isConvenio = insuranceProvider && insuranceProvider !== '';
        const insuranceProviderName = isConvenio
            ? INSURANCE_PROVIDERS.find(p => p.id === insuranceProvider)?.name || insuranceProvider
            : '';

        // Status financeiro: prioriza o status do agendamento, depois do pacote
        const appointmentPaymentStatus = arg.event.extendedProps.paymentStatus;
        const financialStatus = appointmentPaymentStatus === 'package_paid' || appointmentPaymentStatus === 'paid'
            ? 'paid'  // Se o agendamento está pago, mostra pago
            : hasPackage
                ? packageData.financialStatus  // Senão, usa do pacote
                : appointmentPaymentStatus || 'pending';

        const PAYMENT_BADGE: Record<string, { label: string; icon: string; bg: string; text: string }> = {
            paid: { label: 'Pago', icon: '$', bg: 'bg-green-600', text: 'text-white' },
            pending: { label: 'Pendente', icon: '$', bg: 'bg-red-600', text: 'text-white' },
            package_paid: { label: 'Pacote', icon: '📦', bg: 'bg-green-600', text: 'text-white' },
            partial: { label: 'Parcial', icon: '⚠️', bg: 'bg-amber-500', text: 'text-white' },
            advanced: { label: 'Adiant.', icon: '💵', bg: 'bg-blue-600', text: 'text-white' },
            open: { label: 'Aberto', icon: '❌', bg: 'bg-red-600', text: 'text-white' },
            overdue: { label: 'Vencido', icon: '🔴', bg: 'bg-rose-700', text: 'text-white' },
            canceled: { label: 'Cancel.', icon: '⛔', bg: 'bg-gray-500', text: 'text-white' },
            
        };

        const OPERATIONAL_BADGE: Record<string, { label: string; bg: string; text: string }> = {
            scheduled: { label: 'Agendado', bg: 'bg-blue-500', text: 'text-white' },
            confirmed: { label: 'Confirm.', bg: 'bg-emerald-600', text: 'text-white' },
            in_progress: { label: 'Andamento', bg: 'bg-orange-500', text: 'text-white' },
            completed: { label: 'Concluído', bg: 'bg-green-700', text: 'text-white' },
            canceled: { label: 'Cancel.', bg: 'bg-gray-600', text: 'text-white' },
            absent: { label: 'Faltou', bg: 'bg-red-700', text: 'text-white' },
            pre_agendado: { label: 'Pré-Agend.', bg: 'bg-pink-500', text: 'text-white' }, // 🎯 NOVO
        };

        const paymentBadge = PAYMENT_BADGE[financialStatus] || PAYMENT_BADGE.pending;
        const operationalBadge = OPERATIONAL_BADGE[arg.event.extendedProps.operationalStatus] || OPERATIONAL_BADGE.scheduled;

        const OperationalIcon = operationalConfig?.icon || Clock;

        const formatTime = (time: string) => {
            if (!time) return '';
            if (time.length === 5 && time.includes(':')) return time;
            return time.toString().padStart(2, '0') + ':00';
        };

        return (
            <Tooltip
                title={
                    <div className="p-4 min-w-[220px] bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl border border-slate-700 rounded-xl backdrop-blur-sm">
                        <div className="font-bold text-sm text-white pb-2 mb-3 border-b border-slate-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>{patientName}</span>
                            </div>
                        </div>

                        <div className="text-xs text-slate-300 mb-2 flex items-center gap-2">
                            <div className="p-1 bg-slate-700 rounded">
                                <User size={10} className="text-slate-400" />
                            </div>
                            {doctorName}
                        </div>

                        {/* 🆕 INFO NA TOOLTIP */}
                        <div className="mb-3 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400">Serviço:</span>
                                <span className="text-white font-medium">{serviceLabel}</span>
                            </div>
                            {specialty && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Especialidade:</span>
                                    <span className="text-white font-medium capitalize">{specialty.replace('_', ' ')}</span>
                                </div>
                            )}
                            {!hasPackage && !isConvenio && sessionValue > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Valor:</span>
                                    <span className="text-green-400 font-medium">R$ {sessionValue.toFixed(2)}</span>
                                </div>
                            )}
                            {reason && (
                                <div className="mt-1 p-1.5 bg-slate-700/50 rounded text-slate-300">
                                    📝 {reason}
                                </div>
                            )}
                        </div>

                        {hasPackage && (
                            <div className={`mb-3 p-2 rounded-lg ${packageData.type === 'liminar' ? 'bg-amber-700/30 border border-amber-500/30' : 'bg-slate-700/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium ${packageData.type === 'liminar' ? 'text-amber-300' : 'text-slate-300'}`}>
                                        {packageData.type === 'liminar' ? '⚖️ Liminar' : '📦 Pacote'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {packageData.type === 'liminar' ? 'Crédito' : paymentBadge.label}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 space-y-1">
                                    <div>💰 Valor/sessão: R$ {packageData.sessionValue?.toFixed(2)}</div>
                                    {packageData.type === 'liminar' ? (
                                        <>
                                            <div>⚖️ Crédito disp: R$ {packageData.liminarCreditBalance?.toFixed(2)}</div>
                                            <div>✅ Reconhecido: R$ {packageData.recognizedRevenue?.toFixed(2)}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div>📊 Saldo: {packageData.balance} sessões</div>
                                            <div>✅ Pago: R$ {packageData.totalPaid?.toFixed(2)}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 🆕 INFO DE CONVÊNIO NA TOOLTIP */}
                        {isConvenio && (
                            <div className="mb-3 p-2 bg-blue-700/30 rounded-lg border border-blue-500/30">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-blue-300">🏥 Convênio</span>
                                </div>
                                <div className="text-[10px] text-slate-300">
                                    <div className="font-semibold text-white">{insuranceProviderName}</div>
                                    <div>💳 Valor tabela: R$ {arg.event.extendedProps.insuranceValue?.toFixed(2) || '0,00'}</div>
                                </div>
                            </div>
                        )}

                        {/* 💰 ALERTA DE SALDO DEVEDOR NA TOOLTIP */}
                        {patientHasDebt && (
                            <div className="mb-3 p-2 bg-red-700/50 rounded-lg border border-red-500/50 animate-pulse">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-red-300">⚠️ SALDO DEVEDOR</span>
                                </div>
                                <div className="text-[10px] text-slate-200">
                                    <div className="font-bold text-red-400 text-lg">R$ {patientBalance.toFixed(2)}</div>
                                    <div className="text-red-300">Paciente deve este valor</div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
                                <span className="text-xs font-medium text-slate-300">Agendamento</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${operationalBadge.bg} ${operationalBadge.text}`}>
                                    {operationalBadge.label}
                                </span>
                            </div>

                            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
                                <span className="text-xs font-medium text-slate-300">Pagamento</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                    {paymentBadge.label}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-600">
                            <span className="text-xs font-medium text-slate-400">Horário</span>
                            <span className="text-xs font-bold text-white bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600">
                                ⏰ {(arg.event?.extendedProps?.time || '').trim()}
                            </span>
                        </div>
                    </div>
                }
                arrow
                placement="top"
                componentsProps={{
                    tooltip: {
                        sx: {
                            backgroundColor: 'transparent',
                            padding: 0,
                        }
                    }
                }}
            >
                <Paper
                    elevation={2}
                    className="flex flex-col p-3 rounded-xl w-full h-full relative transition-all duration-200 hover:shadow-lg"
                    style={{
                        background: 'linear-gradient(135deg, #a2ddbfff 0%, #1aac68ff 100%)',
                        borderLeft: `8px solid ${operationalConfig.color}`,
                        opacity: ['canceled', 'absent'].includes(arg.event.extendedProps.operationalStatus) ? 0.7 : 1,
                        minHeight: '170px', // aumentado para dar mais espaço
                    }}
                >
                    {/* Linha superior: horário e status pagamento */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-sm font-bold bg-white/90 text-gray-800 px-2 py-1 rounded-lg">
                            {formatTime(arg.timeText)}
                        </span>
                        <div className={`${paymentBadge.bg} ${paymentBadge.text} px-2 py-1 rounded-lg text-[10px] font-extrabold shadow-md flex items-center gap-1`}>
                            <span>{paymentBadge.icon}</span>
                            <span>{paymentBadge.label}</span>
                        </div>
                    </div>

                    {/* Nome do paciente em destaque */}
                    <p className="text-base font-bold truncate leading-tight text-gray-900 mb-1">
                        {patientName}
                    </p>

                    {/* Profissional */}
                    <p className="text-xs truncate text-gray-700 leading-tight mb-2">
                        {doctorName}
                    </p>

                    {/* Linha de serviço + especialidade */}
                    <div className="flex flex-wrap gap-1 mb-2">
                        <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium">
                            {serviceLabel}
                        </span>
                        {specialty && (
                            <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium capitalize">
                                {specialty.replace('_', ' ')}
                            </span>
                        )}
                    </div>

                    {/* Valor ou motivo (se houver) */}
                    {!hasPackage && !isConvenio && sessionValue > 0 && (
                        <p className="text-[11px] text-gray-800 font-semibold mb-2">
                            💰 R$ {sessionValue.toFixed(2)}
                        </p>
                    )}
                    {reason && !hasPackage && !isConvenio && sessionValue === 0 && (
                        <p className="text-[10px] text-gray-700 truncate italic mb-2" title={reason}>
                            📝 {reason.length > 25 ? reason.substring(0, 25) + '...' : reason}
                        </p>
                    )}

                    {/* Badges adicionais */}
                    <div className="flex flex-wrap items-center gap-1 mt-auto">
                        <div className={`${operationalBadge.bg} ${operationalBadge.text} px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-1`}>
                            <OperationalIcon size={9} />
                            <span>{operationalBadge.label}</span>
                        </div>
                        {patientHasDebt && (
                            <div className="bg-red-600 text-white px-2 py-0.5 rounded text-[9px] font-bold animate-pulse" title={`Paciente deve R$ ${patientBalance.toFixed(2)}`}>
                                ⚠️ R$ {patientBalance.toFixed(0)}
                            </div>
                        )}
                        {hasPackage && isConvenio && (
                            <div className="bg-orange-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                                📦 Convênio
                            </div>
                        )}
                        {hasPackage && !isConvenio && packageData?.type === 'liminar' && (
                            <div className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                                ⚖️ Liminar
                            </div>
                        )}
                        {hasPackage && !isConvenio && packageData?.type !== 'liminar' && (
                            <div className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                                📦 Pacote
                            </div>
                        )}
                        {!hasPackage && isConvenio && (
                            <div className="bg-orange-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                                🏥 Convênio
                            </div>
                        )}
                    </div>
                </Paper>
            </Tooltip>
        );
    }, [getPaymentStatusConfig, getOperationalStatusConfig]);

    const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
        setAppointmentData(appointment);
        setMode(modeType);
        setOpenSchedule(true);
    };

    return (
        <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar size={24} style={{ color: '#00C087' }} />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800">
                                Calendário de Agendamentos
                            </Typography>
                            {currentViewDate && (
                                <Typography variant="body2" color="grey.600">
                                    Visualizando: {currentViewDate}
                                </Typography>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => handleOpenSchedule(null, 'create')}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            fontWeight: 'bold',
                            background: `linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))`,
                            '&:hover': {
                                background: `linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))`,
                                transform: 'translateY(-1px)',
                                boxShadow: 4,
                            },
                            transition: 'all 0.25s ease-in-out',
                        }}
                    >
                        Novo Agendamento
                    </Button>
                </div>
            </Paper>

            <Paper
                elevation={1}
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.grey[200]}`,
                    background: 'white',
                }}
            >
                <FullCalendar
                    ref={calendarRef}
                    {...calendarOptions}
                    events={events}
                    dateClick={onDateClick}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    slotMinTime="07:00:00"
                    slotMaxTime="20:00:00"
                    eventMaxStack={true}
                    eventOverlap={false}
                    slotEventOverlap={false}
                    expandRows={true}
                    dayMaxEventRows={4}
                    dayMaxEvents={true}
                    eventDisplay="block"
                    eventMinHeight={140}
                    eventShortHeight={false}
                    dayCellContent={(arg) => (
                        <div className="flex justify-end p-1">
                            <span
                                className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                                    : 'text-gray-700 hover:bg-gray-200'
                                    } ${arg.isPast ? 'opacity-60' : ''}`}
                            >
                                {arg.dayNumberText}
                            </span>
                        </div>
                    )}
                    dayHeaderContent={(arg) => (
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {arg.text.substring(0, 3)}
                        </span>
                    )}
                />
            </Paper>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 3 }}>
                <Paper elevation={1} sx={{ p: 3, borderRadius: 2, flex: 1, minWidth: 300 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="grey.800">
                        📅 Status do Agendamento
                    </Typography>
                    <Typography variant="body2" color="grey.600" sx={{ mb: 2 }}>
                        Indicado pela cor da borda esquerda
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {Object.entries(OPERATIONAL_STATUS_VISUAL_CONFIG).map(([status, config]) => {
                            const IconComponent = config.icon;
                            return (
                                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 4,
                                        height: 24,
                                        backgroundColor: config.color,
                                        borderRadius: 1
                                    }} />
                                    <IconComponent size={16} color={config.color} />
                                    <Typography variant="body2" fontWeight="medium">
                                        {config.label}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Paper>

                <Paper
                    elevation={2}
                    sx={{
                        p: 3,
                        borderRadius: 2,
                        flex: 1,
                        minWidth: 300,
                        background: "linear-gradient(135deg, #ffffff, #f9fafb)",
                    }}
                >
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="grey.800">
                        💰 Status do Pagamento
                    </Typography>
                    <Typography variant="body2" color="grey.600" sx={{ mb: 2 }}>
                        Indicado pela cor de fundo do card
                    </Typography>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {Object.entries(PAYMENT_STATUS_CONFIG).map(([status, config]) => {
                            const IconComponent = config.icon;
                            return (
                                <Box
                                    key={status}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        backgroundColor: config.bgColor,
                                        border: `3px solid ${config.color}`,
                                        borderRadius: 2,
                                        px: 2,
                                        py: 1,
                                        boxShadow: `0 0 8px ${config.color}30`,
                                        transition: "all 0.2s ease-in-out",
                                        "&:hover": {
                                            transform: "scale(1.02)",
                                            boxShadow: `0 0 10px ${config.color}60`,
                                        },
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <IconComponent size={18} color={config.color} />
                                        <Typography variant="body2" fontWeight="medium" sx={{ color: config.textColor }}>
                                            {config.label}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Paper>

                <style>{`
                    .fc-timegrid-more-link {
                        top: 75px !important;
                        bottom: -102px !important;
                    }
                `}</style>
            </Box>

            <ScheduleAppointmentModal
                isOpen={openSchedule}
                initialData={null}
                doctors={doctors}
                patients={patients}
                onClose={() => setOpenSchedule(false)}
                onSave={onNewAppointment}
            />

            <AppointmentDetailModal
                isOpen={isAppointmentDetailModalOpen}
                onClose={() => setIsAppointmentDetailModalOpen(false)}
                onCancelAppointment={onCancelAppointment}
                onCompleteAppointment={onCompleteAppointment}
                onEditAppointment={onEditAppointment}
                onConvertPreAgendamento={onConvertPreAgendamento}
                event={selectedEvent}
                doctors={doctors}
                patients={patients}
            />
        </Box>
    );
};

export default EnhancedCalendar;