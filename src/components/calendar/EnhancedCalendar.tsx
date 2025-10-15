import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Button, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import { ptBR } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Plus, User, XCircle } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { IAppointment, IDoctor, IPatient, SelectedEvent } from '../../utils/types/types';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import AppointmentDetailModal from './appointmentDetailModal';

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: IAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    statusConfig?: StatusConfig;
    openModalAppointment?: boolean;
    closeModalSignal?: number;
}

const PAYMENT_STATUS_CONFIG = {
    'paid': {
        label: 'Pago',
        color: '#22c55e',
        icon: CheckCircle,
        bgColor: '#dcfce7',
        textColor: '#166534'
    },
    'package_paid': {
        label: 'Pacote',
        color: '#10b981',
        icon: CheckCircle,
        bgColor: '#d1fae5',
        textColor: '#065f46'
    },
    'partial': {
        label: 'Parcial',
        color: '#f59e0b',
        icon: AlertCircle,
        bgColor: '#fef3c7',
        textColor: '#92400e'
    },
    'advanced': {
        label: 'Adiantado',
        color: '#3b82f6',
        icon: DollarSign,
        bgColor: '#dbeafe',
        textColor: '#1e40af'
    },
    'canceled': {
        label: 'Cancelado',
        color: '#6b7280',
        icon: XCircle,
        bgColor: '#f3f4f6',
        textColor: '#374151'
    },
    'pending': {
        label: 'Pendente',
        color: '#ef4444',
        icon: Clock,
        bgColor: '#fef2f2',
        textColor: '#991b1b'
    }
};

const OPERATIONAL_STATUS_VISUAL_CONFIG = {
    'agendado': {
        label: 'Agendado',
        color: '#3b82f6',
        icon: Clock
    },
    'confirmado': {
        label: 'Confirmado',
        color: '#10b981',
        icon: CheckCircle
    },
    'em_andamento': {
        label: 'Em Andamento',
        color: '#f59e0b',
        icon: AlertCircle
    },
    'concluido': {
        label: 'Concluído',
        color: '#22c55e',
        icon: CheckCircle
    },
    'cancelado': {
        label: 'Cancelado',
        color: '#6b7280',
        icon: XCircle
    },
    'nao_compareceu': {
        label: 'Não Compareceu',
        color: '#ef4444',
        icon: XCircle
    }
};

const VISUAL_FLAG_CONFIG = {
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
        label: 'Pendente',
        color: '#ef4444',
        textColor: '#991b1b',
        icon: Clock,
    },
    blocked: {
        label: 'Sem Saldo',
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
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        patientId: '',
        doctorId: '',
        date: '',
        time: '',
        reason: '',
        status: 'agendado'
    });
    console.log('Renderizando EnhancedCalendar', appointments);
    const theme = useTheme();

    const getStatusConfig = (status: string) => {
        if (statusConfig[status]) return statusConfig[status];
        if (OPERATIONAL_STATUS_CONFIG[status]) return OPERATIONAL_STATUS_CONFIG[status];
        return {
            backgroundColor: '#CCCCCC',
            textColor: '#000000',
            label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    };

    const getPaymentStatusConfig = (paymentStatus: string) => {
        return PAYMENT_STATUS_CONFIG[paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;
    };

    const getOperationalStatusConfig = (operationalStatus: string) => {
        return OPERATIONAL_STATUS_VISUAL_CONFIG[operationalStatus as keyof typeof OPERATIONAL_STATUS_VISUAL_CONFIG] || OPERATIONAL_STATUS_VISUAL_CONFIG.agendado;
    };

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
            operationalStatus: extendedProps.operationalStatus || "agendado",
            clinicalStatus: extendedProps.clinicalStatus || "pendente",
            formattedDate,
            backgroundColor: event.backgroundColor,
            borderColor: event.borderColor,
            start: formattedDate,
            reason: extendedProps.reason || ""
        });

        setIsAppointmentDetailModalOpen(true);
    };

    // 🔹 MEMOIZAÇÃO AVANÇADA PARA EVENTOS
    const events = useMemo(() => {
        if (!appointments) return [];

        return appointments
            .filter(a => a?.date && a?.time)
            .map(appt => {
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
                    id: appt._id || crypto.randomUUID(),
                    title: `${appt.patient?.fullName || 'Paciente'} - ${appt.doctor?.fullName || 'Profissional'}`,
                    start: startDate,
                    end: endDate,
                    extendedProps: {
                        ...appt,
                        paymentConfig,
                        operationalConfig,
                        visualConfig,
                        patientName: appt.patient?.fullName || 'Paciente',
                        doctorName: appt.doctor?.fullName || 'Profissional'
                    },

                    // 🎨 Regras de cor finais:
                    backgroundColor: paymentConfig.bgColor,          // Fundo = pagamento
                    borderColor: operationalConfig.color,            // Borda = status do agendamento
                    textColor: paymentConfig.textColor,              // Texto = pagamento
                    borderWidth: 4
                };
            });

    }, [appointments]);



    // 🔹 CONFIGURAÇÃO CENTRALIZADA DO CALENDÁRIO
    const calendarOptions = useMemo(() => ({
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: "dayGridMonth",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        locale: ptBR,
        weekends: true,
        events: events,
        dateClick: onDateClick,
        eventClick: handleEventClick,

        // 📐 CONFIGURAÇÕES DE TAMANHO E PERFORMANCE
        height: "75vh",
        contentHeight: "auto",
        aspectRatio: 1.8,
        windowResizeDelay: 100,
        dayMaxEventRows: 3,
        eventDisplay: "block",
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },

        // 🎨 CONFIGURAÇÕES DE ESTILO AVANÇADAS
        eventClassNames: "cursor-pointer hover:!opacity-90 transition-all duration-200",
        dayCellClassNames: "hover:bg-gray-50/50 transition-colors duration-200",

        // 🔧 OTIMIZAÇÕES DE PERFORMANCE
        lazyFetching: true,
        eventMinHeight: 25,
        slotMinTime: "06:00:00",
        slotMaxTime: "22:00:00"
    }), [events, onDateClick]);

    // 🔹 RENDERIZAÇÃO PREMIUM DE EVENTOS
    const renderEventContent = (arg: any) => {
        const paymentStatus = arg.event.extendedProps.paymentStatus || 'pending';
        const paymentConfig = arg.event.extendedProps.paymentConfig;
        const operationalStatus = arg.event.extendedProps.operationalStatus || 'agendado';
        const operationalConfig = arg.event.extendedProps.operationalConfig;
        const patientName = arg.event.extendedProps.patientName || 'Paciente';
        const doctorName = arg.event.extendedProps.doctorName || 'Profissional';

        const PaymentIcon = paymentConfig.icon;
        const OperationalIcon = operationalConfig.icon;
        const VisualIcon = arg.event.extendedProps.visualConfig?.icon;

        return (
            <Tooltip
                title={
                    <div className="p-4 min-w-[220px] bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl border border-slate-700 rounded-xl backdrop-blur-sm">
                        {/* CABEÇALHO COM GRADIENTE */}
                        <div className="font-bold text-sm text-white pb-2 mb-3 border-b border-slate-600">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>{patientName || 'Paciente'}</span>
                            </div>
                        </div>

                        {/* DOUTOR */}
                        <div className="text-xs text-slate-300 mb-4 flex items-center gap-2">
                            <div className="p-1 bg-slate-700 rounded">
                                <User size={10} className="text-slate-400" />
                            </div>
                            Dr. {doctorName || 'Profissional'}
                        </div>

                        {/* STATUS COM DESIGN MODERNO */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
                                <span className="text-xs font-medium text-slate-300">Agendamento</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-lg`}
                                    style={{
                                        backgroundColor: operationalConfig.color,
                                        color: 'white',
                                        boxShadow: `0 4px 6px ${operationalConfig.color}40`
                                    }}>
                                    {operationalConfig.label}
                                </span>
                            </div>

                            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2">
                                <span className="text-xs font-medium text-slate-300">Pagamento</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold shadow-lg`}
                                    style={{
                                        backgroundColor: paymentConfig.color,
                                        color: 'white',
                                        boxShadow: `0 4px 6px ${paymentConfig.color}40`
                                    }}>
                                    {paymentConfig.label}
                                </span>
                            </div>
                        </div>

                        {/* HORÁRIO COM DESTAQUE */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-600">
                            <span className="text-xs font-medium text-slate-400">Horário</span>
                            <span className="text-xs font-bold text-white bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-600">
                                ⏰ {arg.timeText}
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
                    elevation={operationalStatus === 'cancelado' ? 0 : 1}
                    className="flex flex-col p-2 rounded-lg w-full h-full relative transition-all duration-200 hover:shadow-md"
                    style={{
                        backgroundColor: paymentConfig.bgColor,
                        borderLeft: `4px solid ${operationalConfig.color}`,
                        opacity: ['cancelado', 'nao_compareceu'].includes(operationalStatus) ? 0.6 : 1,
                        boxShadow:
                            operationalStatus === 'confirmado'
                                ? `0 2px 6px ${operationalConfig.color}30`
                                : operationalStatus === 'em_andamento'
                                    ? `0 0 10px ${operationalConfig.color}40 inset`
                                    : 'none',
                    }}
                >
                    {/* 🔹 TOPO - Status financeiro principal */}
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-700">{arg.timeText}</span>
                        {VisualIcon && (
                            <div
                                className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-bold uppercase"
                                style={{
                                    backgroundColor: arg.event.extendedProps.visualConfig?.color + '15',
                                    color: arg.event.extendedProps.visualConfig?.textColor,
                                    border: `1px solid ${arg.event.extendedProps.visualConfig?.color}50`,
                                }}
                            >
                                <DollarSign size={9} />
                                {arg.event.extendedProps.visualConfig?.label}
                            </div>
                        )}
                    </div>

                    {/* 🔹 Nome do paciente e profissional */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight text-gray-800">
                            {patientName}
                        </p>
                        <p className="text-xs truncate text-gray-600 leading-tight mt-0.5">
                            Dr. {doctorName}
                        </p>
                    </div>

                    {/* 🔹 Rodapé - Status operacional */}
                    <div className="flex items-center gap-1 mt-1">
                        <operationalConfig.icon size={10} color={operationalConfig.color} />
                        <span
                            className="text-[0.65rem] font-medium"
                            style={{ color: operationalConfig.color }}
                        >
                            {operationalConfig.label}
                        </span>
                    </div>
                </Paper>



            </Tooltip>
        );
    };


    // 🔹 RENDERIZAÇÃO DE CÉLULAS DE DATA MELHORADA
    const renderDayCellContent = (arg: any) => (
        <div className="flex justify-end p-1">
            <span className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                : 'text-gray-700 hover:bg-gray-100'
                } ${arg.isPast ? 'opacity-60' : ''}`}>
                {arg.dayNumberText}
            </span>
        </div>
    );

    // 🔹 RENDERIZAÇÃO DE CABEÇALHO DE DIA
    const renderDayHeaderContent = (arg: any) => (
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {arg.text.substring(0, 3)}
        </span>
    );

    const getPaymentStatusLabel = (paymentStatus: string) => {
        const labels: { [key: string]: string } = {
            'paid': 'Pago',
            'package_paid': 'Pacote',
            'partial': 'Parcial',
            'advanced': 'Adiantado',
            'canceled': 'Cancelado'
        };
        return labels[paymentStatus] || 'Pendente';
    };

    const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
        setAppointmentData(appointment);
        setMode(modeType);
        setOpenSchedule(true);
    };

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
                            <Typography variant="body2" color="grey.600">
                                Sistema visual claro: Cor da borda = Status do agendamento | Cor de fundo = Status do pagamento
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
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: "dayGridMonth,timeGridWeek,timeGridDay"
                    }}
                    locale={ptBR}
                    weekends
                    events={events}
                    dateClick={onDateClick}
                    eventClick={handleEventClick}
                    height="75vh"
                    contentHeight="auto"
                    aspectRatio={1.8}
                    eventContent={renderEventContent}
                    dayCellContent={(arg) => (
                        <div className="flex justify-end p-1">
                            <span className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                                : 'text-gray-700 hover:bg-gray-400'
                                } ${arg.isPast ? 'opacity-60' : ''}`}>
                                {arg.dayNumberText}
                            </span>
                        </div>
                    )}
                    dayHeaderContent={(arg) => (
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {arg.text.substring(0, 3)}
                        </span>
                    )}
                    eventClassNames="cursor-pointer hover:!opacity-90 transition-all duration-200"
                    dayCellClassNames="hover:bg-gray-50/50 transition-colors duration-200"
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
                <Paper elevation={1} sx={{ p: 3, borderRadius: 2, flex: 1, minWidth: 300 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="grey.800">
                        💰 Status do Pagamento
                    </Typography>
                    <Typography variant="body2" color="grey.600" sx={{ mb: 2 }}>
                        Indicado pela cor de fundo do card
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {Object.entries(PAYMENT_STATUS_CONFIG).map(([status, config]) => {
                            const IconComponent = config.icon;
                            return (
                                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{
                                        width: 20,
                                        height: 20,
                                        backgroundColor: config.bgColor,
                                        border: `2px solid ${config.color}`,
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