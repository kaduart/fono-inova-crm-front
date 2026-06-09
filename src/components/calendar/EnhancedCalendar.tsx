import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Button, GlobalStyles, Paper, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import { ptBR } from "date-fns/locale";
import { AlertCircle, Calendar, CheckCircle, Clock, DollarSign, Plus, User, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSpecialtyLabel } from '../../constants/specialties';
import { INSURANCE_PROVIDERS } from '../../constants/insuranceProviders';
import { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment, SelectedEvent } from '../../utils/types/types';
import { AppointmentDTO, mapAppointmentListResponseDTO } from '../../dtos/appointment.response.dto';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import AppointmentDetailModal from './appointmentDetailModal';
import CarteiraView from './CarteiraView';
import CarteiraWeeklyView from './CarteiraWeeklyView';
import API from '../../services/api';
import { getHolidays, holidaysToMap, isHoliday as isHolidayUtil, Holiday } from '../../services/calendarService';
import {
    CalendarMode,
    CalendarPermissions,
    CalendarFeatureFlags,
    getDefaultPermissions,
    getDefaultFeatureFlags,
} from '../../types/calendarCapabilities';

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: ScheduleAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string, data?: {
        addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string;
        billingType?: string; paymentMethod?: string; paymentAmount?: number; sessionValue?: number;
        insuranceProvider?: string; insuranceValue?: number; authorizationCode?: string;
        payments?: Array<{ amount: number; date: string; method: string }>;
    }) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    onMonthChange?: (startDate: Date, endDate: Date) => void;
    statusConfig?: StatusConfig;
    openModalAppointment?: boolean;
    closeModalSignal?: number;
    onConvertPreAgendamento?: (id: string) => Promise<void>;
    onRefreshAppointments?: () => void;
    loading?: boolean; // 🆕 NOVO: Estado de loading
    calendarMode?: CalendarMode;
    permissions?: CalendarPermissions;
    featureFlags?: CalendarFeatureFlags;
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
    pending_receipt: {
        label: "Ag. Recibo",
        color: "#f59e0b",
        icon: Clock,
        bgColor: "#fef3c7",
        textColor: "#92400e",
    },
    unknown: {
        label: "Não verificado",
        color: "#6b7280",
        icon: Clock,
        bgColor: "#f3f4f6",
        textColor: "#374151",
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

const getRealPaymentStatus = (appt: any): string => {
    if (appt?.payment?.status) return appt.payment.status;
    const hasPackage = !!appt?.package || appt?.serviceType === 'package_session';
    if (hasPackage) {
        const ps = appt?.paymentStatus;
        if (ps === 'paid') return 'package_paid';
        if (ps === 'pending_receipt') return 'pending_receipt';
        // Para sessões de pacote, 'pending' no appointment é esperado —
        // pagamento é rastreado no pacote, não na sessão individual
        if (ps === 'pending') return 'package_paid';
        return 'package_paid';
    }
    return appt?.paymentStatus || 'unknown';
};

const getPaymentStatusConfig = (paymentStatus: string) =>
    PAYMENT_STATUS_CONFIG[paymentStatus as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;

const getOperationalStatusConfig = (operationalStatus: string) =>
    OPERATIONAL_STATUS_VISUAL_CONFIG[operationalStatus as keyof typeof OPERATIONAL_STATUS_VISUAL_CONFIG] || {
        label: 'Indefinido',
        color: '#9ca3af',
        icon: Clock,
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
    onConvertPreAgendamento,
    onRefreshAppointments,
    loading = false, // 🆕 NOVO: Default false
    calendarMode = 'admin',
    permissions: permissionsProp,
    featureFlags: featureFlagsProp,
}) => {
    // 🎯 CAPABILITY-BASED: defaults seguros (admin = tudo liberado)
    const permissions = permissionsProp ?? getDefaultPermissions(calendarMode);
    const featureFlags = featureFlagsProp ?? getDefaultFeatureFlags(calendarMode);
    const calendarRef = useRef<FullCalendar | null>(null);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [appointmentData, setAppointmentData] = useState<IAppointment | null>(null);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [isAppointmentDetailModalOpen, setIsAppointmentDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const theme = useTheme();

    // 🆕 DTO: Mapeia appointments para contrato estável
    const appointmentDTOs = useMemo(() => mapAppointmentListResponseDTO(appointments || []), [appointments]);

    // 🆕 Helper: filtra appointments por data (YYYY-MM-DD)
    const getAppointmentsByDay = useCallback((dateStr: string) => {
        return appointments.filter(appt => {
            if (!appt.date) return false;
            const apptDateStr = typeof appt.date === 'string'
                ? (appt.date.includes('T') ? appt.date.split('T')[0] : appt.date)
                : new Date(appt.date).toISOString().split('T')[0];
            return apptDateStr === dateStr;
        });
    }, [appointments]);

    // 🆕 Progresso do pacote vem da API (package.sessionsDone / package.totalSessions)
    // Não calculamos no frontend — a API é fonte de verdade

    // ✅ CORREÇÃO: Apenas estado essencial, SEM loading automático
    // O loading automático estava causando re-renders infinitos
    const [currentViewDate, setCurrentViewDate] = useState<string>('');
    const [calendarView, setCalendarView] = useState<'agenda' | 'carteira' | 'semanal'>('agenda');

    // 🆕 Estado para feriados do backend
    const [holidays, setHolidays] = useState<Record<string, Holiday>>({});
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // 🆕 Popup do dia com delay (dá tempo de arrastar mouse para dentro)
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);
    const [activePopup, setActivePopup] = useState<{ dateStr: string; dayAppts: IAppointment[]; rect: DOMRect } | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🆕 Modal de dia (mobile + click desktop) — acessível sem hover
    const [dayModalOpen, setDayModalOpen] = useState(false);
    const [dayModalData, setDayModalData] = useState<{ dateStr: string; dayAppts: IAppointment[] } | null>(null);
    const clearHoverTimeout = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
    };
    const scheduleHide = () => {
        clearHoverTimeout();
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredDay(null);
            setActivePopup(null);
        }, 200);
    };

    // 🆕 Busca feriados do backend quando o ano muda
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const holidaysList = await getHolidays(currentYear);
                const holidaysMap = holidaysToMap(holidaysList);
                setHolidays(holidaysMap);
            } catch (error) {
                console.error('[EnhancedCalendar] Erro ao buscar feriados:', error);
            }
        };
        fetchHolidays();
    }, [currentYear]);

    // 🆕 Funções helpers para feriados (usando serviço centralizado)
    const isHoliday = useCallback((dateStr: string): boolean => {
        return isHolidayUtil(dateStr, holidays);
    }, [holidays]);

    const getHolidayName = useCallback((dateStr: string): string => {
        return holidays[dateStr]?.name || 'Feriado';
    }, [holidays]);

    const getHolidayType = useCallback((dateStr: string): string => {
        return holidays[dateStr]?.type || 'full';
    }, [holidays]);

    // Scroll automático para o dia de hoje — dispara só na mudança de mês/view, não em cada update de appointments
    const hasScrolledToday = useRef(false);
    useEffect(() => {
        if (hasScrolledToday.current) return;
        let attempts = 0;
        const timers: ReturnType<typeof setTimeout>[] = [];
        const tryScroll = () => {
            const todayCell = document.querySelector('.fc-day-today');
            if (todayCell) {
                todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hasScrolledToday.current = true;
            } else if (attempts < 4) {
                attempts++;
                timers.push(setTimeout(tryScroll, 400));
            }
        };
        timers.push(setTimeout(tryScroll, 300));
        return () => timers.forEach(clearTimeout);
    }, [currentViewDate]);

    // ✅ CORREÇÃO: Fecha ambos os modais quando closeModalSignal muda
    useEffect(() => {
        console.log('🔔 [EnhancedCalendar] closeModalSignal mudou:', closeModalSignal);
        if (closeModalSignal && closeModalSignal > 0) {
            console.log('🔒 [EnhancedCalendar] Fechando modais e limpando selectedEvent');
            setOpenSchedule(false);
            setIsAppointmentDetailModalOpen(false);
            setSelectedEvent(null);
        }
    }, [closeModalSignal]);

    // 🚫 REMOVIDO: Evento global de refresh automático
    // Agora o usuário precisa atualizar manualmente (F5 ou trocar de aba)
    /*
    useEffect(() => {
        const handleRefresh = () => {
            console.log('🔄 [EnhancedCalendar] Evento appointments:refresh recebido');
            onRefreshAppointments?.();
        };
        
        window.addEventListener('appointments:refresh', handleRefresh);
        return () => window.removeEventListener('appointments:refresh', handleRefresh);
    }, [onRefreshAppointments]);
    */

    // 🔄 ATUALIZA selectedEvent quando appointments mudam e modal está aberto
    useEffect(() => {
        if (selectedEvent && isAppointmentDetailModalOpen) {
            const updatedAppt = appointments.find(a => a._id === selectedEvent.id || a.id === selectedEvent.id);
            if (updatedAppt) {
                console.log('🔄 [EnhancedCalendar] Atualizando selectedEvent com dados novos:', updatedAppt);
                // 🔄 ATUALIZA TODOS OS CAMPOS do selectedEvent com os dados novos do appointment
                setSelectedEvent(prev => {
                    if (!prev) return null;
                    
                    // 🛡️ CORREÇÃO: Detecta se patient/doctor são objetos populados ou apenas IDs
                    // Quando backend retorna após update, pode vir como string (ObjectId) ou objeto sem nome
                    const isPatientPopulated = updatedAppt.patient && 
                        typeof updatedAppt.patient === 'object' && 
                        (updatedAppt.patient.fullName || updatedAppt.patient.name);
                    
                    const isDoctorPopulated = updatedAppt.doctor && 
                        typeof updatedAppt.doctor === 'object' && 
                        updatedAppt.doctor.fullName;
                    
                    return {
                        ...prev,
                        // Dados do paciente - só atualiza se vier objeto populado com nome
                        patient: isPatientPopulated ? {
                            id: updatedAppt.patient._id || updatedAppt.patient.id || prev.patient?.id,
                            fullName: updatedAppt.patient.fullName || updatedAppt.patient.name
                        } : prev.patient,
                        // Dados do médico - só atualiza se vier objeto populado com nome
                        doctor: isDoctorPopulated ? {
                            id: updatedAppt.doctor._id || updatedAppt.doctor.id || prev.doctor?.id,
                            fullName: updatedAppt.doctor.fullName
                        } : prev.doctor,
                        // Status
                        operationalStatus: updatedAppt.operationalStatus || prev.operationalStatus,
                        clinicalStatus: updatedAppt.clinicalStatus || prev.clinicalStatus,
                        // Dados de pagamento - só atualiza se tiver valor real (não string vazia)
                        paymentMethod: (updatedAppt.paymentMethod && updatedAppt.paymentMethod !== '') 
                            ? updatedAppt.paymentMethod 
                            : prev.paymentMethod,
                        billingType: (updatedAppt.billingType && updatedAppt.billingType !== '') 
                            ? updatedAppt.billingType 
                            : prev.billingType,
                        paymentAmount: updatedAppt.paymentAmount || updatedAppt.sessionValue || prev.paymentAmount,
                        sessionValue: updatedAppt.sessionValue || prev.sessionValue,
                        // Dados do convênio - só atualiza se tiver valor real
                        insuranceProvider: (updatedAppt.insuranceProvider && updatedAppt.insuranceProvider !== '') 
                            ? updatedAppt.insuranceProvider 
                            : prev.insuranceProvider,
                        insuranceValue: updatedAppt.insuranceValue || prev.insuranceValue,
                        authorizationCode: (updatedAppt.authorizationCode && updatedAppt.authorizationCode !== '') 
                            ? updatedAppt.authorizationCode 
                            : prev.authorizationCode,
                        // Outros dados
                        serviceType: updatedAppt.serviceType || prev.serviceType,
                        sessionType: updatedAppt.sessionType || updatedAppt.specialty || prev.sessionType,
                        specialty: updatedAppt.specialty || prev.specialty,
                        reason: updatedAppt.reason || updatedAppt.notes || prev.reason,
                        notes: updatedAppt.notes || prev.notes,
                        // Datas
                        date: updatedAppt.date ? new Date(updatedAppt.date) : prev.date,
                        startTime: updatedAppt.time || prev.startTime,
                        // Package info
                        package: updatedAppt.package || prev.package,
                        paymentStatus: updatedAppt.paymentStatus || prev.paymentStatus,
                        visualFlag: updatedAppt.visualFlag || prev.visualFlag,
                    };
                });
            }
        }
    }, [appointments, selectedEvent?.id, isAppointmentDetailModalOpen]);

    // ℹ️ appointments já chegam via prop — FullCalendar re-renderiza automaticamente.
    // refetchEvents() foi removido pois causava segundo fetch desnecessário após cada save.
    useEffect(() => {
        console.log(`📥 [EnhancedCalendar] appointments prop atualizada — ${appointments?.length ?? 0} itens (FullCalendar vai re-renderizar via prop, sem refetch)`);
    }, [appointments]);


    const handleEventClick = (info: { event: any }) => {
        const { event } = info;
        console.log('🗓️ [Calendar] Evento clicado:', event);
        
        // 🔄 BUSCA DADOS ATUALIZADOS DO APPOINTMENT (não usa extendedProps desatualizado)
        const freshAppointment = appointmentDTOs.find(a => a.id === event.id);
        console.log('📦 [Calendar] Dados frescos do appointment:', freshAppointment);
        
        // Usa dados atualizados se encontrou, senão usa extendedProps como fallback
        const data = freshAppointment || event.extendedProps;

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

        console.log('👤 [Calendar] Patient:', data.patient);
        console.log('👨‍⚕️ [Calendar] Doctor:', data.doctor);
        console.log('🆔 [Calendar] patientId:', data.patient?._id || data.patient?.id, 'doctorId:', data.doctor?._id || data.doctor?.id);
        console.log('🔍 [Calendar] freshAppointment:', freshAppointment);
        console.log('🔍 [Calendar] extendedProps.doctor:', extendedProps.doctor);

        // 🔧 CORREÇÃO: Usa patientId/doctorId como fallback quando objeto não tem ID
        const patientId = data.patient?._id || data.patient?.id || extendedProps.patientId || '';
        const doctorId = data.doctor?._id || data.doctor?.id || extendedProps.doctorId || '';

        const selectedEventData = {
            id: event.id,
            patient: {
                id: patientId,
                fullName: data.patient?.fullName || extendedProps.patient?.fullName || "Paciente não informado"
            },
            doctor: {
                id: doctorId,
                fullName: data.doctor?.fullName || extendedProps.doctor?.fullName || "Profissional não informado"
            },
            date: event.start ? new Date(event.start) : null,
            startTime: time,
            operationalStatus: data.operationalStatus || extendedProps.operationalStatus || "scheduled",
            clinicalStatus: data.clinicalStatus || extendedProps.clinicalStatus || "pending",
            formattedDate,
            backgroundColor: event.backgroundColor,
            borderColor: event.borderColor,
            start: formattedDate,
            reason: data.reason || data.notes || extendedProps.reason || extendedProps.notes || "",
            notes: data.notes || extendedProps.notes || "",
            billingType: data.billingType || extendedProps.billingType || 'particular',
            insuranceProvider: data.insuranceProvider || extendedProps.insuranceProvider || '',
            insuranceValue: data.insuranceValue || extendedProps.insuranceValue || 0,
            authorizationCode: data.authorizationCode || extendedProps.authorizationCode || '',
            serviceType: data.serviceType || extendedProps.serviceType || 'individual_session',
            paymentAmount: data.paymentAmount || data.sessionValue || extendedProps.paymentAmount || extendedProps.sessionValue || 0,
            sessionValue: data.sessionValue || data.paymentAmount || extendedProps.sessionValue || extendedProps.paymentAmount || 0,
            paymentMethod: data.paymentMethod || extendedProps.paymentMethod || 'dinheiro',
            specialty: data.specialty || data.sessionType || extendedProps.specialty || extendedProps.sessionType || '',
            __isPreAgendamento: data.__isPreAgendamento || extendedProps.__isPreAgendamento || false,
            package: data.package || extendedProps.package || null,
            liminarContract: data.liminarContract || extendedProps.liminarContract || null
        };

        console.log('📤 [Calendar] selectedEventData:', selectedEventData);
        setSelectedEvent(selectedEventData);
        setIsAppointmentDetailModalOpen(true);
    };

    // 🆕 Abre modal de detalhe a partir de um appointment (usado pelo popover do dia)
    const openAppointmentDetail = useCallback((appt: IAppointment) => {
        const dateObj = typeof appt.date === 'string'
            ? (appt.date.includes('T') ? new Date(appt.date) : new Date(appt.date + 'T' + (appt.time || '00:00')))
            : new Date(appt.date);
        const time = appt.time || '00:00';
        const formattedDate = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(dateObj);

        const selectedEventData = {
            id: appt._id || appt.id,
            patient: {
                id: appt.patient?._id || appt.patient?.id || '',
                fullName: appt.patient?.fullName || appt.patientInfo?.fullName || "Paciente não informado"
            },
            doctor: {
                id: appt.doctor?._id || appt.doctor?.id || '',
                fullName: appt.doctor?.fullName || "Profissional não informado"
            },
            date: dateObj,
            startTime: time,
            operationalStatus: appt.operationalStatus || "scheduled",
            clinicalStatus: appt.clinicalStatus || "pending",
            formattedDate,
            start: formattedDate,
            reason: appt.reason || appt.notes || "",
            notes: appt.notes || "",
            billingType: appt.billingType || 'particular',
            insuranceProvider: appt.insuranceProvider || '',
            insuranceValue: appt.insuranceValue || 0,
            authorizationCode: appt.authorizationCode || '',
            serviceType: appt.serviceType || appt.sessionType || 'individual_session',
            paymentAmount: appt.sessionValue || appt.paymentAmount || 0,
            sessionValue: appt.sessionValue || appt.paymentAmount || 0,
            paymentMethod: appt.paymentMethod || 'dinheiro',
            specialty: appt.specialty || appt.sessionType || '',
            __isPreAgendamento: (appt as any).__isPreAgendamento || false,
            package: appt.package || null,
            liminarContract: (appt as any).liminarContract || null,
            backgroundColor: '',
            borderColor: ''
        };
        setSelectedEvent(selectedEventData);
        setIsAppointmentDetailModalOpen(true);
    }, []);

    // 🔹 MEMOIZAÇÃO DOS EVENTOS - Só recalcula quando appointments mudar
    const events = useMemo(() => {
        if (!appointments || appointments.length === 0) return [];

        // Filtra só o mês visível — evita passar 500+ eventos de uma vez ao FullCalendar
        const monthFiltered = currentViewDate
            ? appointmentDTOs.filter(appt => {
                if (!appt.date) return false;
                const dateStr = typeof appt.date === 'string'
                    ? (appt.date.includes('T') ? appt.date.split('T')[0] : appt.date)
                    : new Date(appt.date as any).toISOString().split('T')[0];
                return dateStr.startsWith(currentViewDate);
              })
            : appointmentDTOs;

        const validAppointments = monthFiltered.filter(appt => {
            const hasDate = !!appt.date;
            const hasTime = !!appt.time;
            const hasId = !!(appt.id);
            const isNotCanceled = appt.status !== 'canceled' && appt.status !== 'cancelled';
            return hasDate && hasTime && hasId && isNotCanceled;
        });

        console.debug('[Calendar] appointments válidos:', validAppointments.length, '/ total:', appointmentDTOs.length);

        const mappedEvents = validAppointments.map((appt) => {
            
            const [hours, minutes] = appt.time!.split(':').map(Number);
            
            // 🆕 CORREÇÃO: Lida com date como string (YYYY-MM-DD ou ISO) ou Date
            let startDate: Date;
            if (typeof appt.date === 'string') {
                if (appt.date.includes('T')) {
                    // Formato ISO: "2026-04-03T12:00:00.000Z" (vindo do backend)
                    startDate = new Date(appt.date);
                    startDate.setHours(hours, minutes);
                } else {
                    // Formato antigo: "YYYY-MM-DD"
                    const [year, month, day] = appt.date.split('-').map(Number);
                    startDate = new Date(year, month - 1, day, hours, minutes);
                }
            } else if (appt.date instanceof Date) {
                // Formato Date object
                startDate = new Date(appt.date);
                startDate.setHours(hours, minutes);
            } else {
                // Fallback: tenta converter
                startDate = new Date(appt.date as any);
                startDate.setHours(hours, minutes);
            }
            const endDate = new Date(startDate.getTime() + (appt.duration || 60) * 60000);

            const paymentConfig = getPaymentStatusConfig(getRealPaymentStatus(appt));
            const operationalConfig = getOperationalStatusConfig(appt.operationalStatus || 'scheduled');

            const eventObj = {
                id: appt.id,
                title: `${appt.patient.name} - ${appt.doctor.name}`,
                start: startDate,
                end: endDate,
                extendedProps: {
                    ...appt,
                    paymentStatus: getRealPaymentStatus(appt),
                    paymentConfig,
                    operationalConfig,
                    time: (appt.time || '').trim(),
                    patientName: appt.patient.name,
                    doctorName: appt.doctor.name
                },
                backgroundColor: paymentConfig.bgColor,
                borderColor: operationalConfig.color,
                textColor: paymentConfig.textColor,
                borderWidth: 4
            };
            
            return eventObj;
        });
        
        return mappedEvents;

    }, [appointmentDTOs, currentViewDate, getPaymentStatusConfig, getOperationalStatusConfig]);

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
        eventShortHeight: false,
        // Configurações específicas por view para evitar overflow no modo mensal
        views: {
            dayGridMonth: {
                eventDisplay: 'none', // Oculta barras do FC — popup do dayCellContent trata o mês
            },
            timeGridWeek: {
                eventMinHeight: 240,
                slotMinHeight: 140,
            },
            timeGridDay: {
                eventMinHeight: 240,
                slotMinHeight: 140,
            },
        },
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

    // 🆕 COMPONENTE REUTILIZÁVEL: Card visual de agendamento (calendário + popup)
    const AppointmentEventCard = React.memo(({ appointment, timeText, onClick, variant = 'compact' }: {
        appointment: AppointmentDTO;
        timeText?: string;
        onClick?: () => void;
        variant?: 'compact' | 'expanded';
    }) => {
        const apptId = appointment.id;

        const isExpanded = variant === 'expanded';
        const paymentStatus = getRealPaymentStatus(appointment);
        const operationalStatus = appointment.operationalStatus || 'scheduled';
        const paymentConfig = getPaymentStatusConfig(paymentStatus);
        const operationalConfig = getOperationalStatusConfig(operationalStatus);

        const patientName = appointment.patient?.name || appointment.patient?.fullName || 'Paciente';
        const doctorName = appointment.doctor?.name || appointment.doctor?.fullName || 'Profissional';

        // 🎨 DADOS DO PACOTE — trata string (não populado) e objeto (populado)
        const rawPackage = (appointment as any).package;
        const hasPackage = !!rawPackage || appointment.serviceType === 'package_session';
        const packageObj = typeof rawPackage === 'object' && rawPackage !== null ? rawPackage : null;
        const packageId = typeof rawPackage === 'string' ? rawPackage : packageObj?._id || packageObj?.id || '';
        // ⚠️ LEGADO — isLiminarLegacy usa packageObj.type (dados antigos)
        // Fonte de verdade: appointment.liminarContract
        const isLiminarLegacy = packageObj?.type === 'liminar';
        const liminarContract = (appointment as any).liminarContract;
        const isLiminar = isLiminarLegacy || !!liminarContract;
        const totalSessions = packageObj?.totalSessions ?? null;
        const sessionsDone = packageObj?.sessionsDone ?? null;
        const sessionsRemaining = packageObj?.sessionsRemaining ?? null;
        const packageSessionValue = packageObj?.sessionValue ?? null;
        const packageType = packageObj?.type || '';
        const liminarCreditBalance = liminarContract?.creditBalance ?? packageObj?.liminarCreditBalance ?? null;
        const liminarProcessNumber = liminarContract?.processNumber || packageObj?.liminarProcessNumber || '';

        const patientBalance = (appointment as any).patientBalance || 0;
        const patientHasDebt = (appointment as any).patientHasDebt || false;

        const serviceType = appointment.serviceType || appointment.sessionType || 'Sessão';
        const specialty = appointment.specialty || '';
        const sessionValue = appointment.sessionValue || appointment.paymentAmount || 0;
        const reason = appointment.reason || appointment.notes || '';

        const SERVICE_TYPE_LABELS: Record<string, string> = {
            'individual_session': 'Sessão',
            'package_session': 'Pacote',
            'evaluation': 'Avaliação',
            'consultation': 'Consulta',
            'neuropsych_evaluation': 'Neuropsico',
            'return': 'Retorno',
            'alignment': 'Alinhamento',
            'meet': 'Reunião',
            'tongue_tie_test': 'Teste Lingua'
        };
        const serviceLabel = SERVICE_TYPE_LABELS[serviceType] || serviceType;

        const specialtyLabel = getSpecialtyLabel(specialty);

        const billingType = appointment.billingType;
        const insuranceProvider = appointment.insuranceProvider;
        const isConvenio = billingType === 'convenio' || (!!insuranceProvider && insuranceProvider !== '');
        const insuranceProviderName = isConvenio
            ? INSURANCE_PROVIDERS.find(p => p.id === insuranceProvider)?.name || insuranceProvider
            : '';

        const appointmentPaymentStatus = getRealPaymentStatus(appointment);
        const financialStatus = isConvenio
            ? 'convenio'
            : appointmentPaymentStatus === 'paid'
            ? 'paid'
            : appointmentPaymentStatus === 'package_paid'
            ? 'package_paid'
            : hasPackage && packageObj
                ? packageObj.financialStatus || appointmentPaymentStatus || 'pending'
                : appointmentPaymentStatus || 'pending';

        // Convênio paga no mês seguinte — nunca é pendência cobrável no ato
        const isPackageSessionPending = hasPackage && financialStatus === 'pending' && !isConvenio;

        const PAYMENT_BADGE: Record<string, { label: string; icon: string; bg: string; text: string }> = {
            paid: { label: 'Pago', icon: '$', bg: 'bg-green-600', text: 'text-white' },
            pending: { label: 'Pendente', icon: '$', bg: 'bg-red-600', text: 'text-white' },
            package_paid: { label: 'Pacote', icon: '📦', bg: 'bg-green-600', text: 'text-white' },
            convenio: { label: 'Convênio', icon: '🏥', bg: 'bg-blue-500', text: 'text-white' },
            unknown: { label: 'Não verificado', icon: '?', bg: 'bg-gray-400', text: 'text-white' },
            partial: { label: 'Parcial', icon: '⚠️', bg: 'bg-amber-500', text: 'text-white' },
            advanced: { label: 'Adiant.', icon: '💵', bg: 'bg-blue-600', text: 'text-white' },
            open: { label: 'Aberto', icon: '❌', bg: 'bg-red-600', text: 'text-white' },
            overdue: { label: 'Vencido', icon: '🔴', bg: 'bg-rose-700', text: 'text-white' },
            canceled: { label: 'Cancel.', icon: '⛔', bg: 'bg-gray-500', text: 'text-white' },
            pending_receipt: { label: 'Ag. Recibo', icon: '🕐', bg: 'bg-amber-500', text: 'text-white' },
        };

        const OPERATIONAL_BADGE: Record<string, { label: string; bg: string; text: string }> = {
            scheduled: { label: 'Agendado', bg: 'bg-blue-500', text: 'text-white' },
            confirmed: { label: 'Confirm.', bg: 'bg-emerald-600', text: 'text-white' },
            in_progress: { label: 'Andamento', bg: 'bg-orange-500', text: 'text-white' },
            completed: { label: 'Concluído', bg: 'bg-green-700', text: 'text-white' },
            canceled: { label: 'Cancel.', bg: 'bg-gray-600', text: 'text-white' },
            absent: { label: 'Faltou', bg: 'bg-red-700', text: 'text-white' },
            pre_agendado: { label: 'Pré-Agend.', bg: 'bg-pink-500', text: 'text-white' },
        };

        const paymentBadge = PAYMENT_BADGE[financialStatus] || PAYMENT_BADGE.pending;
        const operationalBadge = OPERATIONAL_BADGE[operationalStatus] || OPERATIONAL_BADGE.scheduled;
        const OperationalIcon = operationalConfig?.icon || Clock;

        const fmtTime = (t: string) => {
            if (!t) return '';
            if (t.length === 5 && t.includes(':')) return t;
            return t.toString().padStart(2, '0') + ':00';
        };

        // 🎨 Cor do card por tipo de atendimento
        const getCardBackground = () => {
            if (isPackageSessionPending) return 'linear-gradient(135deg, #fde047 0%, #f97316 100%)';
            if (hasPackage && isLiminar) return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
            if (hasPackage) return 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)';
            if (isConvenio) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            return 'linear-gradient(135deg, #a2ddbfff 0%, #1aac68ff 100%)';
        };

        return (
            <Paper
                elevation={2}
                onClick={onClick}
                className={`flex flex-col ${isExpanded ? 'p-5' : 'p-3'} rounded-xl w-full h-full relative transition-all duration-200 hover:shadow-lg cursor-pointer ${isPackageSessionPending ? 'animate-pulse' : ''}`}
                style={{
                    background: getCardBackground(),
                    borderLeft: `8px solid ${operationalConfig.color}`,
                    opacity: ['canceled', 'absent'].includes(operationalStatus) ? 0.7 : 1,
                    minHeight: isExpanded ? '240px' : '170px',
                    boxShadow: isPackageSessionPending
                        ? '0 0 15px rgba(249, 115, 22, 0.6)'
                        : undefined,
                }}
            >
                {/* Linha superior: horário e status pagamento */}
                <div className="flex justify-between items-start mb-2 gap-2">
                    <span className={`${isExpanded ? 'text-base' : 'text-sm'} font-bold bg-white/90 text-gray-800 px-2 py-1 rounded-lg`}>
                        {fmtTime(timeText || appointment.time || '')}
                    </span>
                    <div className="flex items-center gap-1">
                        {/* 💰 BADGE DE DÍVIDA — só para particular, convênio paga no mês */}
                        {appointment.paymentStatus === 'unpaid' && !isConvenio && (
                            <div className="bg-rose-600 text-white px-2 py-1 rounded-lg text-[10px] font-extrabold shadow-md flex items-center gap-1 animate-pulse">
                                <span>💰</span>
                                <span>Em aberto</span>
                            </div>
                        )}
                        <div className={`${paymentBadge.bg} ${paymentBadge.text} px-2 py-1 rounded-lg ${isExpanded ? 'text-xs' : 'text-[10px]'} font-extrabold shadow-md flex items-center gap-1`}>
                            <span>{paymentBadge.icon}</span>
                            <span>{paymentBadge.label}</span>
                        </div>
                    </div>
                </div>

                {/* Nome do paciente em destaque */}
                <p className={`${isExpanded ? 'text-lg' : 'text-base'} font-bold truncate leading-tight text-gray-900 mb-1`}>
                    {patientName}
                </p>

                {/* Profissional */}
                <p className={`${isExpanded ? 'text-sm' : 'text-xs'} truncate text-gray-700 leading-tight mb-2`}>
                    {doctorName}
                </p>

                {/* Linha de serviço + especialidade */}
                <div className="flex flex-wrap gap-1 mb-2">
                    {/* No card expandido de pacote/convênio, o bloco de info já identifica o tipo — evita redundância */}
                    {!(isExpanded && (hasPackage || isConvenio)) && (
                        <span className={`${isExpanded ? 'text-xs' : 'text-[10px]'} bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium`}>
                            {serviceLabel}
                        </span>
                    )}
                    {specialty && (
                        <span className={`${isExpanded ? 'text-xs' : 'text-[10px]'} bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium capitalize`}>
                            {specialtyLabel}
                        </span>
                    )}
                </div>

                {/* 🆕 INFO PERTINENTE DO AGENDAMENTO */}
                {isExpanded && (
                    <div className="mb-3 space-y-1.5">
                        {/* Tipo de atendimento + detalhes */}
                        {hasPackage && (
                            <div className={`p-2 rounded-lg ${isLiminar ? 'bg-amber-100/80 border border-amber-300' : 'bg-purple-100/80 border border-purple-300'}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-xs font-bold ${isLiminar ? 'text-amber-800' : 'text-purple-800'}`}>
                                        {isLiminar ? '⚖️ Liminar' : '📦 Pacote'}
                                    </span>
                                    {/* Sempre mostra badge de status (do pacote ou do appointment) */}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {paymentBadge.label}
                                    </span>
                                </div>
                                {/* Progresso do pacote: da API (package.sessionsDone / package.totalSessions) */}
                                {totalSessions !== null ? (
                                    <div className="text-[11px] text-gray-700">
                                        <div className="flex justify-between mb-0.5">
                                            <span>Progresso:</span>
                                            <span className="font-bold">
                                                {sessionsDone !== null ? `${sessionsDone}/${totalSessions}` : `${totalSessions} sessões`}
                                            </span>
                                        </div>
                                        {sessionsDone !== null && totalSessions > 0 && (
                                            <div className="w-full bg-white/60 rounded-full h-1.5 mt-1">
                                                <div
                                                    className={`h-1.5 rounded-full ${isLiminar ? 'bg-amber-500' : 'bg-purple-500'}`}
                                                    style={{ width: `${Math.min(100, (sessionsDone / totalSessions) * 100)}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                                {/* Valor: só mostra se > 0; senão indica que está incluso no pacote */}
                                {(packageSessionValue ?? sessionValue ?? 0) > 0 ? (
                                    <div className="text-[11px] text-gray-700 mt-1">
                                        💰 Valor/sessão:{" "}
                                        <span className="font-semibold">
                                            R$ {(packageSessionValue ?? sessionValue ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-gray-600 mt-1 italic">
                                        🎁 Incluído no pacote
                                    </div>
                                )}
                                {isLiminar && liminarProcessNumber && (
                                    <div className="text-[10px] text-amber-700 mt-1">
                                        ⚖️ Processo: {liminarProcessNumber}
                                    </div>
                                )}
                                {isLiminar && liminarCreditBalance !== null && (
                                    <div className="text-[10px] text-amber-700">
                                        💳 Crédito: R$ {Number(liminarCreditBalance).toFixed(2)}
                                    </div>
                                )}
                                {/* Hint quando pacote não está populado */}
                                {!packageObj && packageId && (
                                    <div className="text-[10px] text-purple-600/70 mt-1 italic">
                                        Sessão vinculada a pacote
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Convênio */}
                        {isConvenio && (
                            <div className="p-2 bg-blue-100/80 border border-blue-300 rounded-lg">
                                <div className="text-xs font-bold text-blue-800 mb-0.5">🏥 Convênio</div>
                                <div className="text-[11px] text-gray-700">
                                    {insuranceProviderName && <div>{insuranceProviderName}</div>}
                                    {appointment.insuranceValue > 0 && (
                                        <div>Valor tabela: R$ {appointment.insuranceValue.toFixed(2)}</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Particular com valor */}
                        {!hasPackage && !isConvenio && sessionValue > 0 && (
                            <div className="text-sm text-gray-800 font-semibold">
                                💰 R$ {sessionValue.toFixed(2)}
                            </div>
                        )}

                        {/* Notas/Observações */}
                        {reason && (
                            <div className="text-xs text-gray-700 italic bg-white/50 p-1.5 rounded">
                                📝 {reason}
                            </div>
                        )}
                    </div>
                )}

                {/* Valor ou motivo no modo compacto */}
                {!isExpanded && !hasPackage && !isConvenio && sessionValue > 0 && (
                    <p className={`text-[11px] text-gray-800 font-semibold mb-2`}>
                        💰 R$ {sessionValue.toFixed(2)}
                    </p>
                )}
                {!isExpanded && reason && !hasPackage && !isConvenio && sessionValue === 0 && (
                    <p className={`text-[10px] text-gray-700 truncate italic mb-2`} title={reason}>
                        📝 {reason.length > 25 ? reason.substring(0, 25) + '...' : reason}
                    </p>
                )}

                {/* Badges adicionais */}
                <div className="flex flex-wrap items-center gap-1 mt-auto">
                    <div className={`${operationalBadge.bg} ${operationalBadge.text} px-2 py-0.5 rounded ${isExpanded ? 'text-[11px]' : 'text-[9px]'} font-bold flex items-center gap-1`}>
                        <OperationalIcon size={isExpanded ? 12 : 9} />
                        <span>{operationalBadge.label}</span>
                    </div>
                    {patientHasDebt && (
                        <div className={`bg-red-600 text-white px-2 py-0.5 rounded ${isExpanded ? 'text-[11px]' : 'text-[9px]'} font-bold animate-pulse`} title={`Paciente deve R$ ${patientBalance.toFixed(2)}`}>
                            ⚠️ R$ {patientBalance.toFixed(0)}
                        </div>
                    )}
                    {isPackageSessionPending && (
                        <div className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold animate-pulse" title="Pacote - Receber hoje">
                            💰 RECEBER
                        </div>
                    )}
                    {/* Badges de tipo só no compacto — no expandido o bloco de info já cobre */}
                    {!isExpanded && hasPackage && isConvenio && (
                        <div className="bg-orange-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                            📦 Convênio
                        </div>
                    )}
                    {!isExpanded && hasPackage && !isConvenio && isLiminar && (
                        <div className="bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                            ⚖️ Liminar
                        </div>
                    )}
                    {!isExpanded && hasPackage && !isConvenio && !isLiminar && (
                        <div className="bg-green-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                            📦 Pacote
                        </div>
                    )}
                    {!isExpanded && !hasPackage && isConvenio && (
                        <div className="bg-orange-600 text-white px-2 py-0.5 rounded text-[9px] font-bold">
                            🏥 Convênio
                        </div>
                    )}
                </div>
            </Paper>
        );
    });

    // 🔹 RENDERIZAÇÃO DE EVENTOS (memoizada)
    const renderEventContent = useCallback((arg: any) => {
        // 🎯 Na visualização mensal, não renderizamos cards individuais
        // (o popup group-hover no dayCellContent já mostra os appointments)
        if (arg.view.type === 'dayGridMonth') {
            return <></>;
        }

        // 🎯 BUSCA DADOS ATUALIZADOS diretamente do estado React para evitar stale extendedProps
        const liveAppt = appointments.find(a => (a._id || a.id) === arg.event.id);
        const paymentStatus = getRealPaymentStatus(liveAppt) || getRealPaymentStatus(arg.event.extendedProps) || 'pending';
        const operationalStatus = liveAppt?.operationalStatus || arg.event.extendedProps.operationalStatus || 'scheduled';

        const paymentConfig = arg.event.extendedProps.paymentConfig || getPaymentStatusConfig(paymentStatus);
        const operationalConfig = arg.event.extendedProps.operationalConfig || getOperationalStatusConfig(operationalStatus);

        const patientName = arg.event.extendedProps.patientName || arg.event.extendedProps.patient?.fullName || 'Paciente';
        const doctorName = arg.event.extendedProps.doctorName || arg.event.extendedProps.doctor?.fullName || 'Profissional';

        // 🎨 DADOS DO PACOTE — trata string (não populado) e objeto (populado)
        const rawPackage = arg.event.extendedProps.package;
        const hasPackage = !!rawPackage || arg.event.extendedProps.serviceType === 'package_session';
        const packageObj = typeof rawPackage === 'object' && rawPackage !== null ? rawPackage : null;
        // ⚠️ LEGADO — isLiminarLegacy usa packageObj.type (dados antigos)
        // Fonte de verdade: appointment.liminarContract
        const isLiminarLegacy = packageObj?.type === 'liminar';
        const liminarContract = arg.event.extendedProps.liminarContract;
        const isLiminar = isLiminarLegacy || !!liminarContract;
        const packageId = typeof rawPackage === 'string' ? rawPackage : packageObj?._id || packageObj?.id || '';

        // 💰 SALDO DEVEDOR DO PACIENTE
        const patientBalance = arg.event.extendedProps.patientBalance || 0;
        const patientHasDebt = arg.event.extendedProps.patientHasDebt || false;
        
        // DEBUG
        if (patientHasDebt) {
            console.log('[Calendar] Paciente com dívida:', arg.event.extendedProps.patientName, patientBalance);
        }

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
            'consultation': 'Consulta',
            'neuropsych_evaluation': 'Neuropsico',
            'return': 'Retorno',
            'alignment': 'Alinhamento',
            'meet': 'Reunião',
            'tongue_tie_test': 'Teste Lingua'
        };
        const serviceLabel = SERVICE_TYPE_LABELS[serviceType] || serviceType;

        const specialtyLabel = getSpecialtyLabel(specialty);

        // 🆕 DADOS DE CONVÊNIO
        const billingType = arg.event.extendedProps.billingType;
        const insuranceProvider = arg.event.extendedProps.insuranceProvider;
        // ✅ Mostra convênio se tiver insuranceProvider ou billingType === 'convenio'
        const isConvenio = billingType === 'convenio' || (!!insuranceProvider && insuranceProvider !== '');
        const insuranceProviderName = isConvenio
            ? INSURANCE_PROVIDERS.find(p => p.id === insuranceProvider)?.name || insuranceProvider
            : '';

        // Status financeiro: prioriza o status do agendamento, depois do pacote
        const appointmentPaymentStatus = getRealPaymentStatus(arg.event.extendedProps);
        const financialStatus = isConvenio
            ? 'convenio'
            : appointmentPaymentStatus === 'paid'
            ? 'paid'
            : appointmentPaymentStatus === 'package_paid'
            ? 'package_paid'
            : hasPackage && packageObj
                ? packageObj.financialStatus || appointmentPaymentStatus || 'pending'
                : appointmentPaymentStatus || 'pending';

        // Convênio paga no mês seguinte — nunca é pendência cobrável no ato
        const isPackageSessionPending = hasPackage && financialStatus === 'pending' && !isConvenio;

        const PAYMENT_BADGE: Record<string, { label: string; icon: string; bg: string; text: string }> = {
            paid: { label: 'Pago', icon: '$', bg: 'bg-green-600', text: 'text-white' },
            pending: { label: 'Pendente', icon: '$', bg: 'bg-red-600', text: 'text-white' },
            package_paid: { label: 'Pacote', icon: '📦', bg: 'bg-green-600', text: 'text-white' },
            convenio: { label: 'Convênio', icon: '🏥', bg: 'bg-blue-500', text: 'text-white' },
            partial: { label: 'Parcial', icon: '⚠️', bg: 'bg-amber-500', text: 'text-white' },
            advanced: { label: 'Adiant.', icon: '💵', bg: 'bg-blue-600', text: 'text-white' },
            open: { label: 'Aberto', icon: '❌', bg: 'bg-red-600', text: 'text-white' },
            overdue: { label: 'Vencido', icon: '🔴', bg: 'bg-rose-700', text: 'text-white' },
            canceled: { label: 'Cancel.', icon: '⛔', bg: 'bg-gray-500', text: 'text-white' },
            pending_receipt: { label: 'Ag. Recibo', icon: '🕐', bg: 'bg-amber-500', text: 'text-white' },
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
                                    <span className="text-white font-medium capitalize">{specialtyLabel}</span>
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
                            <div className={`mb-3 p-2 rounded-lg ${isLiminar ? 'bg-amber-700/30 border border-amber-500/30' : 'bg-slate-700/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-medium ${isLiminar ? 'text-amber-300' : 'text-slate-300'}`}>
                                        {isLiminar ? '⚖️ Liminar' : '📦 Pacote'}
                                    </span>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {isLiminar ? 'Crédito' : paymentBadge.label}
                                    </span>
                                </div>
                                {packageObj && (
                                    <div className="text-[10px] text-slate-400 space-y-1">
                                        <div>💰 Valor/sessão: R$ {packageObj.sessionValue?.toFixed(2)}</div>
                                        {isLiminar ? (
                                            <>
                                                {/* ⚠️ LEGADO — packageObj.liminarCreditBalance é fallback para dados antigos */}
                                                <div>⚖️ Crédito disp: R$ {Number(liminarContract?.creditBalance ?? packageObj.liminarCreditBalance ?? 0).toFixed(2)}</div>
                                                {/* ⚠️ LEGADO — packageObj.recognizedRevenue é fallback para dados antigos */}
                                                <div>✅ Reconhecido: R$ {Number(liminarContract?.usedCredit ?? packageObj.recognizedRevenue ?? 0).toFixed(2)}</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>📊 Sessões: {packageObj.sessionsDone ?? 0}/{packageObj.totalSessions ?? 0}</div>
                                                <div>✅ Pago: R$ {packageObj.totalPaid?.toFixed(2)}</div>
                                            </>
                                        )}
                                    </div>
                                )}
                                {!packageObj && packageId && (
                                    <div className="text-[10px] text-slate-500 italic">
                                        Pacote (detalhes não carregados)
                                    </div>
                                )}
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
                <div>
                    <AppointmentEventCard
                        appointment={liveAppt || arg.event.extendedProps}
                        timeText={arg.timeText}
                    />
                </div>
            </Tooltip>
        );
    }, [getPaymentStatusConfig, getOperationalStatusConfig, appointments]);

    const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
        setAppointmentData(appointment);
        setMode(modeType);
        setOpenSchedule(true);
    };

    return (
        <>
            {/* 🆕 Estilos globais para o dia de feriado no FullCalendar */}
            <GlobalStyles
                styles={{
                    '.fc-day-holiday': {
                        backgroundColor: '#fef3c7 !important', // amber-100
                        '& .fc-daygrid-day-frame': {
                            backgroundColor: '#fef3c7 !important',
                        },
                        '& .fc-daygrid-day-top': {
                            backgroundColor: '#fef3c7 !important',
                        },
                        '& .fc-scrollgrid-sync-inner': {
                            backgroundColor: '#fef3c7 !important',
                        },
                    },
                    '.fc-day-holiday .fc-daygrid-day-number': {
                        color: '#92400e !important', // amber-800
                        fontWeight: 'bold !important',
                    },
                    // 🎯 Fundo azul claro para o dia de hoje (sobrescreve amarelo padrão do FC)
                    '.fc-day-today': {
                        backgroundColor: '#9ce0a2 !important', // blue-50
                        '& .fc-daygrid-day-frame': {
                            backgroundColor: '#9ce0a2 !important',
                        },
                        '& .fc-daygrid-day-top': {
                            backgroundColor: '#9ce0a2 !important',
                        },
                        '& .fc-scrollgrid-sync-inner': {
                            backgroundColor: '#9ce0a2 !important',
                        },
                    },
                    // 🎯 Esconde eventos na visualização mensal (popup group-hover já cobre)
                    '.fc-dayGridMonth-view .fc-daygrid-event': {
                        display: 'none !important',
                    },
                }}
            />
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

                    {permissions.canCreate && (
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
                    )}
                </div>
            </Paper>

            {/* ── Toggle Agenda / Acompanhamento / Recorrência ── */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {(['agenda'] as const)
                    .concat(featureFlags.showCarteiraView ? ['carteira'] as const : [])
                    .concat(featureFlags.showRecorrenciaView ? ['semanal'] as const : [])
                    .map(tab => (
                        <button
                            key={tab}
                            onClick={() => setCalendarView(tab)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                calendarView === tab
                                    ? 'bg-[#00C087] text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#00C087] hover:text-[#00C087]'
                            }`}
                        >
                            {tab === 'agenda' ? 'Agenda' : tab === 'carteira' ? 'Acompanhamento' : 'Recorrência'}
                        </button>
                    ))}
            </Box>

            {featureFlags.showCarteiraView && calendarView === 'carteira' && (
                <Paper elevation={1} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', bgcolor: 'white', minHeight: 500 }}>
                    <CarteiraView
                        doctors={doctors}
                        currentMonth={currentViewDate || new Date().toISOString().slice(0, 7)}
                    />
                </Paper>
            )}

            {featureFlags.showRecorrenciaView && calendarView === 'semanal' && (
                <Paper elevation={1} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', bgcolor: 'white', minHeight: 500 }}>
                    <CarteiraWeeklyView doctors={doctors} />
                </Paper>
            )}

            <Paper
                elevation={1}
                sx={{
                    borderRadius: 3,
                    overflow: 'visible',
                    border: `1px solid ${theme.palette.grey[200]}`,
                    background: 'white',
                    position: 'relative',
                    display: calendarView === 'agenda' ? undefined : 'none',
                }}
            >
                {/* Skeleton de loading — overlay sobre o FullCalendar (não desmonta o calendário) */}
                {loading && (
                    <Box sx={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 3, bgcolor: 'white', p: 2, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
                        {/* Toolbar do FC: prev/next/today | título do mês | month/week/day */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Skeleton variant="rounded" width={32} height={32} />
                                <Skeleton variant="rounded" width={32} height={32} />
                                <Skeleton variant="rounded" width={60} height={32} />
                            </Box>
                            <Skeleton variant="text" width={180} height={36} sx={{ borderRadius: 1 }} />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Skeleton variant="rounded" width={68} height={32} />
                                <Skeleton variant="rounded" width={60} height={32} />
                                <Skeleton variant="rounded" width={48} height={32} />
                            </Box>
                        </Box>

                        {/* Cabeçalho dos dias — 5 colunas (sem fim de semana) */}
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderTop: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb' }}>
                            {['SEG', 'TER', 'QUA', 'QUI', 'SEX'].map((d) => (
                                <Box key={d} sx={{ borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', px: 1, py: 0.75, display: 'flex', justifyContent: 'center' }}>
                                    <Skeleton variant="text" width={30} height={18} />
                                </Box>
                            ))}
                        </Box>

                        {/* Grade de semanas: 5 linhas × 5 colunas */}
                        {Array.from({ length: 5 }).map((_, week) => (
                            <Box key={week} sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', flex: 1, borderLeft: '1px solid #e5e7eb' }}>
                                {Array.from({ length: 5 }).map((_, day) => {
                                    // Simula badge de contagem em ~40% das células
                                    const hasBadge = (week * 5 + day) % 3 !== 0;
                                    return (
                                        <Box
                                            key={day}
                                            sx={{
                                                borderRight: '1px solid #e5e7eb',
                                                borderBottom: '1px solid #e5e7eb',
                                                minHeight: 80,
                                                p: 0.75,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-end',
                                                gap: 0.5,
                                            }}
                                        >
                                            {/* Número do dia */}
                                            <Skeleton variant="circular" width={28} height={28} />
                                            {/* Badge de contagem */}
                                            {hasBadge && (
                                                <Skeleton
                                                    variant="rounded"
                                                    width={20}
                                                    height={18}
                                                    sx={{ borderRadius: 9, bgcolor: '#bbf7d0' }}
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>
                )}
                <FullCalendar
                    ref={calendarRef}
                    {...calendarOptions}
                    events={events}
                    dateClick={(arg) => {
                        // 🆕 Validação de feriado
                        const dateStr = arg.date.toISOString().split('T')[0];
                        if (isHoliday(dateStr)) {
                            const holidayName = getHolidayName(dateStr);
                            alert(`🗓️ ${holidayName}\n\nNão é possível agendar em feriado.`);
                            return;
                        }
                        onDateClick(arg);
                    }}
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
                    eventShortHeight={false}
                    eventDidMount={(arg) => {
                        // Esconde barras do FC no modo mensal — popup do dayCellContent trata a visualização
                        if (arg.view.type === 'dayGridMonth') {
                            (arg.el as HTMLElement).style.display = 'none';
                        }
                    }}
                    dayCellClassNames={(arg) => {
                        const dateStr = arg.date.toISOString().split('T')[0];
                        return isHoliday(dateStr) ? 'fc-day-holiday' : '';
                    }}
                    dayCellContent={(arg) => {
                        const dateStr = arg.date.toISOString().split('T')[0];
                        const isHolidayDate = isHoliday(dateStr);
                        const holidayName = isHolidayDate ? getHolidayName(dateStr) : '';
                        const dayAppts = getAppointmentsByDay(dateStr);
                        const dayCount = dayAppts.length;
                        
                        // 🆕 Card de feriado expandido ocupando o espaço
                        if (isHolidayDate) {
                            return (
                                <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: '2px' }}>
                                    <Tooltip title={holidayName}>
                                        <div style={{ 
                                            width: 'calc(100% - 4px)',
                                            height: 'calc(100% - 4px)',
                                            boxSizing: 'border-box',
                                            background: '#fef3c7', 
                                            border: '2px solid #f59e0b', 
                                            borderRadius: '8px', 
                                            padding: '12px', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'not-allowed'
                                        }}>
                                            <span style={{ fontSize: '24px', marginBottom: '8px' }}>🗓️</span>
                                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#92400e', textAlign: 'center', lineHeight: 1.2 }}>
                                                {holidayName}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#b45309', marginTop: '4px', textAlign: 'center' }}>
                                                Sem atendimento
                                            </span>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        }
                        
                        return (
                            <div
                                className="flex flex-col items-end p-1 h-full relative cursor-pointer"
                                style={hoveredDay === dateStr ? { zIndex: 9999, position: 'relative' } : undefined}
                                onMouseEnter={(e) => {
                                    clearHoverTimeout();
                                    setHoveredDay(dateStr);
                                    if (dayCount > 0) {
                                        setActivePopup({ dateStr, dayAppts, rect: e.currentTarget.getBoundingClientRect() });
                                    }
                                }}
                                onMouseLeave={scheduleHide}
                                onClick={() => {
                                    if (dayCount > 0) {
                                        setDayModalData({ dateStr, dayAppts });
                                        setDayModalOpen(true);
                                    }
                                }}
                            >
                                <span
                                    className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-lg transform scale-110'
                                        : 'text-gray-700 hover:bg-gray-200'
                                        } ${arg.isPast ? 'opacity-60' : ''}`}
                                >
                                    {arg.dayNumberText}
                                </span>
                                {dayCount > 0 && (
                                    <span
                                        className="mt-1 inline-flex items-center justify-center px-1.5 py-0 rounded-full text-[10px] font-bold text-white bg-green-600 pointer-events-none select-none"
                                        style={{ minWidth: '18px', height: '18px' }}
                                    >
                                        {dayCount}
                                    </span>
                                )}
                            </div>
                        );
                    }}
                    dayHeaderContent={(arg) => (
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {arg.text.substring(0, 3)}
                        </span>
                    )}
                />
            </Paper>

            {featureFlags.showLegendas && (
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
                    /* 🆕 ESCONDE eventos individuais na view mensal para evitar página gigante */
                    .fc-dayGridMonth-view .fc-daygrid-body-events {
                        display: none !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-event-harness {
                        display: none !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-day-events {
                        min-height: 0 !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-day-frame {
                        min-height: 80px !important;
                        overflow: visible !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-day {
                        overflow: visible !important;
                        position: relative !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-day:hover {
                        z-index: 9999 !important;
                    }
                    .fc-dayGridMonth-view .fc-daygrid-body {
                        overflow: visible !important;
                    }
                    .fc-dayGridMonth-view .fc-scroller {
                        overflow: visible !important;
                    }
                    .fc-dayGridMonth-view {
                        overflow: visible !important;
                    }
                `}</style>
            </Box>
            )}

            <ScheduleAppointmentModal
                isOpen={openSchedule}
                initialData={null}
                doctors={doctors}
                patients={patients}
                onClose={() => setOpenSchedule(false)}
                onSave={onNewAppointment}
                closeModalSignal={closeModalSignal}
            />

            <AppointmentDetailModal
                isOpen={isAppointmentDetailModalOpen}
                onClose={() => setIsAppointmentDetailModalOpen(false)}
                onCancelAppointment={onCancelAppointment}
                onCompleteAppointment={onCompleteAppointment}
                onEditAppointment={onEditAppointment}
                onConvertPreAgendamento={onConvertPreAgendamento}
                onRefreshAppointments={onRefreshAppointments}
                event={selectedEvent}
                doctors={doctors}
                patients={patients}
                permissions={permissions}
            />

            {/* 🆕 PORTAL: Popup do dia — renderiza fora do DOM para ficar acima de tudo */}
            {activePopup && createPortal(
                <div
                    className="fixed z-[99999] w-[360px] max-h-[520px] overflow-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3 space-y-3 hidden md:block"
                    style={{
                        top: activePopup.rect.bottom + 6,
                        left: Math.min(
                            activePopup.rect.left,
                            window.innerWidth - 380
                        ),
                    }}
                    onMouseEnter={clearHoverTimeout}
                    onMouseLeave={scheduleHide}
                >
                    <div className="text-xs font-bold text-gray-700 px-1 py-1 border-b border-gray-100">
                        📅 {new Date(activePopup.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {[...activePopup.dayAppts].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((appt) => (
                        <AppointmentEventCard
                            key={appt._id || appt.id}
                            appointment={appt}
                            timeText={appt.time}
                            variant="expanded"
                            onClick={() => openAppointmentDetail(appt)}
                        />
                    ))}
                </div>,
                document.body
            )}

            {/* 🆕 MODAL DE DIA — Mobile + Click desktop (acessível sem hover) */}
            {dayModalOpen && dayModalData && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setDayModalOpen(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-auto flex flex-col">
                        <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-800">
                                📅 {new Date(dayModalData.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <button
                                onClick={() => setDayModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                aria-label="Fechar"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {[...dayModalData.dayAppts].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((appt) => (
                                <AppointmentEventCard
                                    key={appt._id || appt.id}
                                    appointment={appt}
                                    timeText={appt.time}
                                    variant="expanded"
                                    onClick={() => {
                                        setDayModalOpen(false);
                                        openAppointmentDetail(appt);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </Box>
        </>
    );
};

export default EnhancedCalendar;