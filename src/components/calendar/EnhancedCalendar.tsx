import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Button, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { ptBR } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Plus, User, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment, SelectedEvent } from '../../utils/types/types';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import AppointmentDetailModal from './appointmentDetailModal';

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: ScheduleAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    statusConfig?: StatusConfig;
    openModalAppointment?: boolean;
    closeModalSignal?: number;
}

export const PAYMENT_STATUS_CONFIG = {
    paid: {
        label: "Pago",
        color: "#1c7721ff",       // 💚 Verde vibrante
        icon: CheckCircle,
        bgColor: "#b1eeafff",     // Fundo verde-claro quase branco
        textColor: "#4da088ff",   // Texto verde escuro
    },
    package_paid: {
        label: "Pacote",
        color: "#16a34a",       // 💚 Verde médio
        icon: CheckCircle,
        bgColor: "#dcfce7",     // Fundo verde pastel
        textColor: "#166534",   // Texto verde escuro
    },
    partial: {
        label: "Parcial",
        color: "#f59e0b",       // 🟡 Amarelo vivo
        icon: AlertCircle,
        bgColor: "#fef9c3",     // Amarelo suave (lembra atenção leve)
        textColor: "#92400e",   // Texto âmbar escuro
    },
    advanced: {
        label: "Adiantado",
        color: "#2563eb",       // 💙 Azul médio
        icon: DollarSign,
        bgColor: "#e0f2fe",     // Azul claro, limpo
        textColor: "#1e3a8a",   // Texto azul escuro
    },
    canceled: {
        label: "Cancelado",
        color: "#dc2626",       // 🔴 Vermelho vivo (destaque)
        icon: XCircle,
        bgColor: "#a9afb9ff",     // Fundo rosado leve
        textColor: "#7f1d1d",   // Texto vermelho escuro
    },
    pending: {
        label: "Pendente",
        color: "#b91c1c",       // 🔴 Vermelho forte (mais tenso)
        icon: Clock,
        bgColor: "rgba(235, 130, 219, 1)",     // Fundo igual ao cancelado (mesmo grupo de alerta)
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
    statusConfig = OPERATIONAL_STATUS_CONFIG
}) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [appointmentData, setAppointmentData] = useState<IAppointment | null>(null);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [isAppointmentDetailModalOpen, setIsAppointmentDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const theme = useTheme();
    const [isCalendarLoading, setIsCalendarLoading] = useState(true);
    
    // 🔹 Estado para lazy loading - apenas eventos visíveis
    const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

    useEffect(() => {
        if (closeModalSignal && closeModalSignal > 0) {
            setOpenSchedule(false);
            setSelectedEvent(null);
        }
    }, [closeModalSignal]);

    useEffect(() => {
        if (!appointments) return;

        setIsCalendarLoading(true);
        // 🔹 Simula um delay mínimo para mostrar loading sem travar a UI
        const timer = setTimeout(() => {
            setIsCalendarLoading(false);
        }, 100);
        return () => clearTimeout(timer);
    }, [appointments]);

    // 🔹 Handler para quando a view do calendário muda (lazy loading)
    const handleDatesSet = useCallback((dateInfo: any) => {
        setVisibleRange({
            start: dateInfo.start,
            end: dateInfo.end
        });
    }, []);

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


        setSelectedEvent({
            id: event.id,
            patient: {
                id: extendedProps.patient?._id || extendedProps.patient?.id || '',
                fullName: extendedProps.patient?.fullName || "Paciente não informado"
            },
            doctor: {
                id: extendedProps.doctor?._id || extendedProps.doctor?.id || '',
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
            reason: extendedProps.reason || ""
        });

        setIsAppointmentDetailModalOpen(true);
    };

    // 🔹 MEMOIZAÇÃO AVANÇADA PARA EVENTOS COM LAZY LOADING
    const events = useMemo(() => {
        if (!appointments) return [];
        
        // 🔹 Filtra apenas eventos do range visível + margem de segurança
        let filteredAppointments = appointments.filter(a => a?.date && a?.time);
        
        if (visibleRange) {
            const rangeStart = new Date(visibleRange.start);
            const rangeEnd = new Date(visibleRange.end);
            // Adiciona margem de 7 dias antes e depois
            rangeStart.setDate(rangeStart.getDate() - 7);
            rangeEnd.setDate(rangeEnd.getDate() + 7);
            
            filteredAppointments = filteredAppointments.filter(appt => {
                const [year, month, day] = appt.date.split('-').map(Number);
                const apptDate = new Date(year, month - 1, day);
                return apptDate >= rangeStart && apptDate <= rangeEnd;
            });
        }
        
        return filteredAppointments.map(appt => {
            const [hours, minutes] = appt.time.split(':').map(Number);
            const [year, month, day] = appt.date.split('-').map(Number);
            const startDate = new Date(year, month - 1, day, hours, minutes);
            const endDate = new Date(startDate.getTime() + (appt.duration || 60) * 60000);

            const paymentConfig = getPaymentStatusConfig(appt.paymentStatus || 'pending');
            const operationalConfig = getOperationalStatusConfig(appt.operationalStatus || 'agendado');

            // 🔧 Resolve visualFlag priorizando lógica coerente
            let visualFlagKey = appt.visualFlag;

            if (!visualFlagKey) {
                switch (appt.paymentStatus) {
                    case 'paid':
                    case 'package_paid':
                    case 'advanced':
                        visualFlagKey = 'ok';
                        break;
                    case 'partial':
                        visualFlagKey = 'partial';
                        break;
                    case 'pending':
                    default:
                        visualFlagKey = 'pending';
                        break;
                }
            }

            const visualConfig = VISUAL_FLAG_CONFIG[visualFlagKey];

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
                    visualConfig,
                    patientName: appt.patient?.fullName || 'Paciente',
                    doctorName: appt.doctor?.fullName || 'Profissional'
                },

                // 🎨 Regras de cor finais:
                backgroundColor: paymentConfig.bgColor,
                borderColor: operationalConfig.color,
                textColor: paymentConfig.textColor,
                borderWidth: 4
            };
        });

    }, [appointments, visibleRange, getPaymentStatusConfig, getOperationalStatusConfig]);

    // 🔹 CONFIGURAÇÃO CENTRALIZADA DO CALENDÁRIO
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
        slotLabelInterval: "00:30:00",
        slotDuration: "00:30:00",

        eventDisplay: "block",
        eventTimeFormat: {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        } as Intl.DateTimeFormatOptions,

        nowIndicator: true,
        dayMaxEventRows: 4,
        dayMaxEvents: true,
        eventMaxStack: true,
        stickyHeaderDates: true,
        eventBorderColor: "transparent",
        eventClassNames: "cursor-pointer hover:!opacity-90 transition-all duration-200",
        dayCellClassNames: "hover:bg-gray-50/50 transition-colors duration-200",

        windowResizeDelay: 100,

        // ✅ ALTURA DOS EVENTOS
        eventMinHeight: 120,
        eventShortHeight: false,

        // ✅ LAZY LOADING - atualiza range visível
        datesSet: handleDatesSet,

        // ✅ CALLBACK PARA AJUSTAR VIEW SEMANAL
        viewDidMount: (info: any) => {
            if (info.view.type === 'timeGridWeek' || info.view.type === 'timeGridDay') {
                const events = document.querySelectorAll('.fc-timegrid-event');
                events.forEach((event: any) => {
                    event.style.minHeight = '70px';
                });
            }
        }
    }), [handleDatesSet]);

    // 🔹 Não precisamos mais disso - loading é controlado no useEffect dos appointments

    // 🔹 RENDERIZAÇÃO PREMIUM DE EVENTOS COM MEMOIZAÇÃO
    const renderEventContent = useCallback((arg: any) => {
        const paymentConfig = arg.event.extendedProps.paymentConfig;
        const operationalConfig = arg.event.extendedProps.operationalConfig;
        const patientName = arg.event.extendedProps.patientName || 'Paciente';
        const doctorName = arg.event.extendedProps.doctorName || 'Profissional';

        const packageData = arg.event.extendedProps.package;
        const hasPackage = !!packageData;

        const financialStatus = hasPackage
            ? packageData.financialStatus
            : arg.event.extendedProps.paymentStatus;

        // ✅ CONFIG PAGAMENTO (💰 Verde/Amarelo/Vermelho)
        const PAYMENT_BADGE = {
            paid: {
                label: 'Pago',
                icon: '💰',
                bg: 'bg-green-600',
                text: 'text-white'
            },
            package_paid: {
                label: 'Pacote',
                icon: '📦',
                bg: 'bg-green-600',
                text: 'text-white'
            },
            partial: {
                label: 'Parcial',
                icon: '⚠️',
                bg: 'bg-amber-500',
                text: 'text-white'
            },
            advanced: {
                label: 'Adiant.',
                icon: '💵',
                bg: 'bg-blue-600',
                text: 'text-white'
            },
            open: {
                label: 'Aberto',
                icon: '❌',
                bg: 'bg-red-600',
                text: 'text-white'
            },
            pending: {
                label: 'Pendente',
                icon: '⏱️',
                bg: 'bg-red-600',
                text: 'text-white'
            },
            overdue: {
                label: 'Vencido',
                icon: '🔴',
                bg: 'bg-rose-700',
                text: 'text-white'
            },
            canceled: {
                label: 'Cancel.',
                icon: '⛔',
                bg: 'bg-gray-500',
                text: 'text-white'
            },
        };

        // ✅ CONFIG AGENDAMENTO (📅 Azul/Verde/Cinza)
        const OPERATIONAL_BADGE = {
            scheduled: { label: '📅 Agendado', bg: 'bg-blue-500', text: 'text-white' },
            confirmed: { label: '✔️ Confirm.', bg: 'bg-emerald-600', text: 'text-white' },
            in_progress: { label: '⏳ Andamento', bg: 'bg-orange-500', text: 'text-white' },
            completed: { label: '✅ Concluído', bg: 'bg-green-700', text: 'text-white' },
            canceled: { label: '❌ Cancel.', bg: 'bg-gray-600', text: 'text-white' },
            absent: { label: '🚫 Faltou', bg: 'bg-red-700', text: 'text-white' },
        };

        const paymentBadge = PAYMENT_BADGE[financialStatus] || PAYMENT_BADGE.pending;
        const operationalBadge = OPERATIONAL_BADGE[arg.event.extendedProps.operationalStatus] || OPERATIONAL_BADGE.scheduled;

        const OperationalIcon = operationalConfig.icon;
        const formatTime = (time) => {
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

                        <div className="text-xs text-slate-300 mb-4 flex items-center gap-2">
                            <div className="p-1 bg-slate-700 rounded">
                                <User size={10} className="text-slate-400" />
                            </div>
                            Dr. {doctorName}
                        </div>

                        {hasPackage && (
                            <div className="mb-3 p-2 bg-slate-700/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-300">📦 Pacote</span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {paymentBadge.label}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 space-y-1">
                                    <div>💰 Valor/sessão: R$ {packageData.sessionValue?.toFixed(2)}</div>
                                    <div>📊 Saldo: {packageData.balance} sessões</div>
                                    <div>✅ Pago: R$ {packageData.totalPaid?.toFixed(2)}</div>
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
                        background: 'linear-gradient(135deg, #a2ddbfff 0%, #1aac68ff 100%)', // ✅ VERDE CLARO
                        borderLeft: `6px solid ${operationalConfig.color}`,
                        opacity: ['canceled', 'absent'].includes(arg.event.extendedProps.operationalStatus) ? 0.7 : 1,
                    }}
                >
                    {/* 🔹 HEADER - Horário + Badge Pagamento */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-sm font-bold text-gray-800 bg-white/80 px-2 py-1 rounded">
                            {formatTime(arg.timeText)}
                        </span>

                        {/* 💰 BADGE PAGAMENTO (Direita) */}
                        <div className={`${paymentBadge.bg} ${paymentBadge.text} px-2 py-1 rounded-md text-[10px] font-extrabold shadow-md flex items-center gap-1`}>
                            <span>{paymentBadge.icon}</span>
                            <span>{paymentBadge.label}</span>
                        </div>
                    </div>

                    {/* 🔹 CENTRO - Nome do Paciente */}
                    <div className="flex-1 min-w-0 mb-2">
                        <p className="text-sm font-bold truncate leading-tight text-gray-900">
                            {patientName}
                        </p>
                        <p className="text-xs truncate text-gray-700 leading-tight mt-0.5">
                            Dr. {doctorName}
                        </p>
                    </div>

                    {/* 🔹 FOOTER - Badge Agendamento */}
                    <div className="flex items-center justify-between gap-2">
                        {/* 📅 BADGE AGENDAMENTO (Esquerda) */}
                        <div className={`${operationalBadge.bg} ${operationalBadge.text} px-2 py-1 rounded-md text-[10px] font-extrabold shadow-md flex items-center gap-1`}>
                            <OperationalIcon size={10} />
                            {operationalBadge.label}
                        </div>

                        {/* 📦 Indicador de Pacote (se houver) */}
                        {hasPackage && (
                            <div className="bg-purple-600 text-white px-2 py-1 rounded-md text-[9px] font-bold">
                                📦 Pacote
                            </div>
                        )}
                    </div>
                </Paper>
            </Tooltip>
        );
    }, []);

    // 🔹 RENDERIZAÇÃO DE CÉLULAS DE DATA MELHORADA (memoizada)
    const renderDayCellContent = useCallback((arg: any) => (
        <div className="flex justify-end p-1">
            <span className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                : 'text-gray-700 hover:bg-gray-100'
                } ${arg.isPast ? 'opacity-60' : ''}`}>
                {arg.dayNumberText}
            </span>
        </div>
    ), []);

    // 🔹 RENDERIZAÇÃO DE CABEÇALHO DE DIA (memoizada)
    const renderDayHeaderContent = useCallback((arg: any) => (
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {arg.text.substring(0, 3)}
        </span>
    ), []);

    const getPaymentStatusLabel = useCallback((paymentStatus: string) => {
        const labels: { [key: string]: string } = {
            'paid': 'Pago',
            'package_paid': 'Pacote',
            'partial': 'Parcial',
            'advanced': 'Adiantado',
            'canceled': 'Cancelado'
        };
        return labels[paymentStatus] || 'Pendente';
    }, []);

    const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
        setAppointmentData(appointment);
        setMode(modeType);
        setOpenSchedule(true);
    };

    if (isCalendarLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <Box sx={{ p: 3, backgroundColor: 'grey.50', minHeight: '100vh' }}>
            {/* CABEÇALHO PREMIUM */}
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

            {/* CALENDÁRIO PRINCIPAL */}
            <Paper
                elevation={1}
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: `1px solid ${theme.palette.grey[200]}`,
                    background: 'white'
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
                    eventMinHeight={140}        // altura mínima mais confortável
                    eventContentHeight={90}    // garante altura do conteúdo também
                    eventShortHeight={false}   // impede compactação automática

                    dayCellContent={(arg) => (
                        <div className="flex justify-end p-1">
                            <span
                                className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                                    : 'text-gray-700 hover:bg-gray-400'
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

            {/* LEGENDA DUPLA - AGENDAMENTO E PAGAMENTO */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 3 }}>
                {/* LEGENDA STATUS OPERACIONAL */}
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

                {/* LEGENDA STATUS FINANCEIRO */}
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
                    <Typography
                        variant="h6"
                        fontWeight="bold"
                        gutterBottom
                        color="grey.800"
                    >
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
                                        <Typography
                                            variant="body2"
                                            fontWeight="medium"
                                            sx={{ color: config.textColor }}
                                        >
                                            {config.label}
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Paper>

                <style>{`
    /* ✅ Ajusta o botão "+X more events" */
    .fc-timegrid-more-link {
        top: 75px !important;
        bottom: -102px !important;
    }
`}</style>
            </Box>

            {/* MODAIS */}
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
                event={selectedEvent}
                doctors={doctors}
                patients={patients}
            />
        </Box>
    );

};

export default EnhancedCalendar;