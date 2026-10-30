import AppointmentCancellationModal from './AppointmentCancellationModal';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Button, GlobalStyles, Paper, Skeleton, Tooltip, Typography, useTheme } from '@mui/material';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { AlertCircle, Calendar, CalendarClock, CalendarPlus, CheckCircle, Clock, DollarSign, Plus, RotateCcw, User, XCircle } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getSpecialtyLabel } from '../../constants/specialties';
import { useConvenios } from '../../hooks/useConvenios';
import { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment, SelectedEvent } from '../../utils/types/types';
import { AppointmentDTO, mapAppointmentListResponseDTO } from '../../dtos/appointment.response.dto';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import AppointmentDetailModal from './appointmentDetailModal';
import RescheduleDialog, { RescheduleTarget } from './RescheduleDialog';
import CarteiraView from './CarteiraView';
import CarteiraWeeklyView from './CarteiraWeeklyView';
import { AgendaFilterBar, AgendaHeader, DayAgendaModal, DayByProfessional, DayPreviewList, DoctorOption, MonthCell } from './agenda/AgendaParts';
import {
    AgendaFilter, StatusGroup, TypeGroup, doctorIdOf, doctorNameOf, loadFilter, loadPref, matchesFilter, monthTitle,
    prettifyCode, saveFilter, savePref, statusGroupOf, typeGroupOf, ymdOf,
} from './agenda/agendaModel';
import API from '../../services/api';
import { useRetention } from '../../hooks/useRetention';
import { TabErrorBoundary } from '../error/TabErrorBoundary';
import { getHolidays, holidaysToMap, isHoliday as isHolidayUtil, Holiday } from '../../services/calendarService';
import type { CancelExtras } from './CancelRequesterPicker';
import {
    CalendarMode,
    CalendarPermissions,
    CalendarFeatureFlags,
    getDefaultPermissions,
    getDefaultFeatureFlags,
} from '../../types/calendarCapabilities';
/** yyyy-mm-dd na data local (as datas do FullCalendar chegam em horário local) */
// "09:00 - 09:40" do FullCalendar; cai para o horário salvo se vier vazio
const fmtSlimTime = (timeText?: string, fallback?: string) => (timeText || fallback || '').replace(/(\d{2}:\d{2}):\d{2}/g, '$1').trim();

const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CancellationsReport = React.lazy(() => import('../admin/CancellationsReport'));

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: ScheduleAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string, paymentState?: CancelExtras) => Promise<void>;
    onCompleteAppointment: (id: string, data?: {
        addToBalance?: boolean; balanceAmount?: number; balanceDescription?: string;
        billingType?: string; paymentMethod?: string; paymentAmount?: number; sessionValue?: number;
        insuranceProvider?: string; insuranceValue?: number; authorizationCode?: string;
        payments?: Array<{ amount: number; date: string; method: string }>;
    }) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    /** Remarcação rápida (PATCH /v2/appointments/:id/reschedule). Ausente → botões "Mudar data" ficam ocultos. */
    onRescheduleAppointment?: (id: string, data: { date: string; time: string; reason?: string }) => Promise<void>;
    onConfirmAppointment?: (id: string, notes?: string) => Promise<void>;
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
    onOpenPreAppointments?: () => void;
}

const CANCELED_LIKE_STATUSES = ['canceled', 'cancelado', 'cancelada'];

/**
 * Botão "Mudar data" / "Reativar e remarcar" dos cards. Componente de módulo (ícones só são
 * lidos em render — nada no escopo do módulo, evita o TDZ entre chunks documentado abaixo).
 */
const CardActionButton: React.FC<{
    onClick: () => void;
    title: string;
    tone?: 'neutral' | 'danger' | 'success';
    disabled?: boolean;
    children: React.ReactNode;
}> = ({ onClick, title, tone = 'neutral', disabled = false, children }) => {
    const toneClass = tone === 'danger'
        ? 'text-red-800 hover:bg-red-500/25'
        : tone === 'success'
            ? 'text-green-900 bg-white/45 hover:bg-white/65'
            : 'text-gray-900 hover:bg-white/40';
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
            disabled={disabled} data-primary={tone === 'success' ? 'true' : undefined}
            title={title}
            // Vidro translúcido sobre a cor do card — ação secundária discreta, sem bloco branco chamativo
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/40 bg-white/20 px-2 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${disabled ? 'cursor-not-allowed opacity-45 text-gray-700' : toneClass}`}
        >
            {children}
        </button>
    );
};

/**
 * Ações do card: Mudar data · Cancelar · Confirmar. Cancelar abre sua janela única;
 * finalizar abre o modal de atendimento. Nunca abrem os dois juntos.
 * Cancelado: só "Reativar e remarcar". Concluído: os 3 botões desabilitados. Faltou: sem ações.
 * Componente de módulo (ícones só são lidos em render — evita o TDZ entre chunks documentado abaixo).
 */
const CardActions: React.FC<{
    status: string;
    onReschedule?: () => void;
    onCancel?: () => void;
    onFinalize?: () => void;
}> = ({ status, onReschedule, onCancel, onFinalize }) => {
    const canceled = CANCELED_LIKE_STATUSES.includes(status);
    const active = ['scheduled', 'confirmed', 'pre_agendado'].includes(status);
    // Concluído: mesmos botões, desabilitados — mantém os cards alinhados e deixa claro que a ação
    // existe mas não se aplica mais (o atendimento já aconteceu).
    if (status === 'completed' && (onReschedule || onCancel || onFinalize)) {
        const why = 'Atendimento já concluído';
        return (
            <div className="mt-2.5 flex gap-1.5">
                <CardActionButton onClick={() => {}} disabled title={why}>
                    <CalendarClock size={13} strokeWidth={2.3} />
                    <span>Mudar data</span>
                </CardActionButton>
                <CardActionButton onClick={() => {}} disabled tone="danger" title={why}>
                    <XCircle size={13} strokeWidth={2.3} />
                    <span>Cancelar</span>
                </CardActionButton>
                <CardActionButton onClick={() => {}} disabled tone="success" title={why}>
                    <CheckCircle size={13} strokeWidth={2.3} />
                    <span>Confirmar</span>
                </CardActionButton>
            </div>
        );
    }
    if (!canceled && !active) return null;
    if (!(onReschedule || (active && (onCancel || onFinalize)))) return null;
    return (
        <div className="mt-2.5 flex gap-1.5">
            {onReschedule && (
                <CardActionButton
                    onClick={onReschedule}
                    title={canceled ? 'Reativar este agendamento em uma nova data e horário' : 'Mudar data e horário deste agendamento'}
                >
                    {canceled ? <RotateCcw size={13} strokeWidth={2.3} /> : <CalendarClock size={13} strokeWidth={2.3} />}
                    <span>{canceled ? 'Reativar e remarcar' : 'Mudar data'}</span>
                </CardActionButton>
            )}
            {active && onCancel && (
                <CardActionButton onClick={onCancel} tone="danger" title="Cancelar este agendamento">
                    <XCircle size={13} strokeWidth={2.3} />
                    <span>Cancelar</span>
                </CardActionButton>
            )}
            {active && onFinalize && (
                <CardActionButton onClick={onFinalize} tone="success" title="Confirmar / finalizar este atendimento">
                    <CheckCircle size={13} strokeWidth={2.3} />
                    <span>Confirmar</span>
                </CardActionButton>
            )}
        </div>
    );
};

// 🐛 FIX (2026-09-17): as 3 consts abaixo eram de nível de módulo,
// referenciando ícones do lucide-react no carregamento do módulo — mesmo bug
// real de TDZ entre chunks confirmado via sourcemap contra o build de
// produção (`ReferenceError: Cannot access '<ícone>' before initialization`,
// achado em appointmentDetailModal.tsx e reproduzido aqui). Corrigido:
// construção preguiçosa, só no primeiro uso dentro de função — bem depois do
// grafo de módulos já ter inicializado. Mantidos como `export` (compat com
// qualquer import externo futuro), agora como função em vez de objeto.

let _paymentStatusConfigCache: Record<string, { label: string; color: string; icon: any; bgColor: string; textColor: string }> | null = null;
export function getPaymentStatusConfigMap() {
    if (!_paymentStatusConfigCache) {
        _paymentStatusConfigCache = {
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
                color: "#d97706",
                icon: DollarSign,
                bgColor: "#fde68a",
                textColor: "#92400e",
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
    }
    return _paymentStatusConfigCache;
}

let _operationalStatusVisualConfigCache: Record<string, { label: string; color: string; icon: any }> | null = null;
export function getOperationalStatusVisualConfigMap() {
    if (!_operationalStatusVisualConfigCache) {
        _operationalStatusVisualConfigCache = {
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
            // 🚨 FIX (2026-08-14): 'missed' é o valor real do enum operationalStatus
            // (models/Appointment.js) — 'absent' não existe nos dados reais, então
            // todo appointment com falta automática (auto_expired) caía no fallback
            // pra 'scheduled' e aparecia como "Agendado" na agenda, mascarando faltas.
            missed: {
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
    }
    return _operationalStatusVisualConfigCache;
}

let _visualFlagConfigCache: Record<string, { label: string; color: string; textColor: string; icon: any }> | null = null;
export function getVisualFlagConfigMap() {
    if (!_visualFlagConfigCache) {
        _visualFlagConfigCache = {
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
    }
    return _visualFlagConfigCache;
}

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

const getPaymentStatusConfig = (paymentStatus: string) => {
    const map = getPaymentStatusConfigMap();
    return map[paymentStatus] || map.pending;
};

const getOperationalStatusConfig = (operationalStatus: string) =>
    getOperationalStatusVisualConfigMap()[operationalStatus] || {
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
    onRescheduleAppointment,
    onConfirmAppointment,
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
    onOpenPreAppointments,
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
    const [cancellationTarget, setCancellationTarget] = useState<SelectedEvent | null>(null);
    const theme = useTheme();

    // 🆕 Convênios para resolução de nomes no calendário (inclui inativos: sessão antiga
    // de convênio desativado aparecia com o código, ex. "unimed-anapolis")
    const { convenios } = useConvenios({ includeInactive: true });
    const convenioName = useCallback((code?: string) =>
        (code ? convenios.find(p => p.code === code)?.name || prettifyCode(code) : ''), [convenios]);

    // Agenda do admin/secretária (mock aprovado 30/10): filtros por profissional, status e tipo,
    // lembrados entre visitas. O terapeuta (modo doctor) continua com a agenda que já aprovou.
    // O DoctorCalendarTab passa `mode="doctor"` (não calendarMode), então o modo vem também das flags:
    // só a visão da clínica tem Acompanhamento.
    const isAdminMode = calendarMode === 'admin' && featureFlags.showCarteiraView;
    const [agendaFilter, setAgendaFilterState] = useState<AgendaFilter>(() => (isAdminMode ? loadFilter() : { doctor: 'all', status: 'all', type: 'all' }));
    const setAgendaFilter = useCallback((f: AgendaFilter) => { setAgendaFilterState(f); saveFilter(f); }, []);
    const visibleAppointments = useMemo(
        () => (isAdminMode ? (appointments || []).filter(a => matchesFilter(a, agendaFilter)) : (appointments || [])),
        [appointments, agendaFilter, isAdminMode]
    );

    // 🆕 DTO: Mapeia appointments para contrato estável
    const appointmentDTOs = useMemo(() => mapAppointmentListResponseDTO(visibleAppointments), [visibleAppointments]);

    // 🆕 Helper: filtra appointments por data (YYYY-MM-DD)
    const getAppointmentsByDay = useCallback((dateStr: string) => {
        return visibleAppointments.filter(appt => {
            if (!appt.date) return false;
            const apptDateStr = typeof appt.date === 'string'
                ? (appt.date.includes('T') ? appt.date.split('T')[0] : appt.date)
                : new Date(appt.date).toISOString().split('T')[0];
            return apptDateStr === dateStr;
        });
    }, [visibleAppointments]);

    // 🆕 Progresso do pacote vem da API (package.sessionsDone / package.totalSessions)
    // Não calculamos no frontend — a API é fonte de verdade

    // ✅ CORREÇÃO: Apenas estado essencial, SEM loading automático
    // O loading automático estava causando re-renders infinitos
    const [currentViewDate, setCurrentViewDate] = useState<string>('');
    // Intervalo realmente visível (yyyy-mm-dd, fim exclusivo). Filtrar pelo mês escondia as sessões
    // do mês seguinte na semana que vira o mês (ex.: 28/09–02/10 sem 01 e 02/10).
    const [visibleRange, setVisibleRange] = useState<{ start: string; end: string } | null>(null);
    const [calendarView, setCalendarView] = useState<'agenda' | 'carteira' | 'semanal' | 'cancelamentos'>('agenda');
    // View do FullCalendar e o dia em foco (para o "Dia por profissional")
    const [fcView, setFcView] = useState<string>('dayGridMonth');
    const [fcDate, setFcDate] = useState<string>(() => toYmd(new Date()));
    const [dayLayout, setDayLayoutState] = useState<'pro' | 'single'>(() => (loadPref('agenda.dayLayout', 'pro') === 'single' ? 'single' : 'pro'));
    const setDayLayout = (v: 'pro' | 'single') => { setDayLayoutState(v); savePref('agenda.dayLayout', v); };

    // Contagens do mês em tela para os chips (cada grupo conta com os outros dois filtros aplicados)
    const agendaCounts = useMemo(() => {
        if (!isAdminMode || !currentViewDate) return null;
        const month = (appointments || []).filter(a => ymdOf(a).startsWith(currentViewDate));
        const status = { todo: 0, done: 0, missed: 0, canceled: 0, pre: 0 } as Record<StatusGroup, number>;
        const type = { particular: 0, convenio: 0, pacote: 0, liminar: 0 } as Record<TypeGroup, number>;
        const docs = new Map<string, { fullName: string; count: number }>();
        let statusTotal = 0, typeTotal = 0, doctorTotal = 0;
        month.forEach(a => {
            if (matchesFilter(a, agendaFilter, 'status')) { status[statusGroupOf(a)]++; statusTotal++; }
            if (matchesFilter(a, agendaFilter, 'type')) { type[typeGroupOf(a)]++; typeTotal++; }
            if (matchesFilter(a, agendaFilter, 'doctor')) {
                doctorTotal++;
                const id = doctorIdOf(a);
                if (id) {
                    const cur = docs.get(id) || { fullName: doctorNameOf(a), count: 0 };
                    cur.count++;
                    docs.set(id, cur);
                }
            }
        });
        // Garante o chip do profissional filtrado mesmo sem sessão no mês
        if (agendaFilter.doctor !== 'all' && !docs.has(agendaFilter.doctor)) {
            const d = (doctors || []).find((x: any) => String(x._id || x.id) === agendaFilter.doctor) as any;
            docs.set(agendaFilter.doctor, { fullName: d?.fullName || d?.name || 'Profissional', count: 0 });
        }
        const firstNames = [...docs.values()].map(d => d.fullName.split(' ')[0]);
        const doctorOptions: DoctorOption[] = [...docs.entries()]
            .map(([id, d]) => {
                const parts = d.fullName.split(' ');
                const dup = firstNames.filter(n => n === parts[0]).length > 1;
                return { id, fullName: d.fullName, count: d.count, label: dup && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0] };
            })
            .sort((x, y) => y.count - x.count || x.label.localeCompare(y.label));
        const todayStr = toYmd(new Date());
        const preUpcoming = (appointments || []).filter(a => statusGroupOf(a) === 'pre' && ymdOf(a) >= todayStr).length;
        return { total: month.length, status, statusTotal, type, typeTotal, doctorOptions, doctorTotal, preUpcoming };
    }, [isAdminMode, currentViewDate, appointments, agendaFilter, doctors]);

    // Contador da aba Acompanhamento (pacientes que pedem atenção no mês)
    const { data: retentionAll } = useRetention('', isAdminMode ? currentViewDate : '');
    const attentionCount = retentionAll ? retentionAll.patients.filter(p => p.needsAttention).length : 0;

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
    const [dayModalFilter, setDayModalFilter] = useState('');
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
            setCancellationTarget(null);
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
                        depositAmount: updatedAppt.depositAmount ?? prev.depositAmount,
                        remainingAmount: updatedAppt.remainingAmount ?? prev.remainingAmount,
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
            billingType: (() => {
                const bt = data.billingType || extendedProps.billingType;
                const pm = data.paymentMethod || extendedProps.paymentMethod;
                if (bt === 'liminar') return 'liminar';
                if (bt === 'convenio' || pm === 'convenio') return 'convenio';
                return bt || 'particular';
            })(),
            insuranceProvider: data.insuranceProvider || extendedProps.insuranceProvider || '',
            insuranceValue: data.insuranceValue || extendedProps.insuranceValue || 0,
            insuranceGuide: data.insuranceGuide || extendedProps.insuranceGuide || null,
            insuranceGuideNumber: data.insuranceGuideNumber || extendedProps.insuranceGuideNumber || data.insuranceGuide?.number || extendedProps.insuranceGuide?.number || null,
            insurancePlan: data.insurancePlan || extendedProps.insurancePlan || null,
            insuranceGuideId: data.insuranceGuideId || extendedProps.insuranceGuideId || data.insuranceGuide || extendedProps.insuranceGuide || null,
            authorizationCode: data.authorizationCode || extendedProps.authorizationCode || '',
            serviceType: data.serviceType || extendedProps.serviceType || 'individual_session',
            paymentAmount: data.paymentAmount || data.sessionValue || extendedProps.paymentAmount || extendedProps.sessionValue || 0,
            sessionValue: data.sessionValue || data.paymentAmount || extendedProps.sessionValue || extendedProps.paymentAmount || 0,
            depositAmount: data.depositAmount ?? extendedProps.depositAmount ?? 0,
            remainingAmount: data.remainingAmount ?? extendedProps.remainingAmount ?? null,
            paymentMethod: data.paymentMethod || extendedProps.paymentMethod || '',
            paymentOrigin: data.paymentOrigin || extendedProps.paymentOrigin || '',
            specialty: data.specialty || data.sessionType || extendedProps.specialty || extendedProps.sessionType || '',
            __isPreAgendamento: data.__isPreAgendamento || extendedProps.__isPreAgendamento || false,
            package: data.package || extendedProps.package || null,
            liminarContract: data.liminarContract || extendedProps.liminarContract || null
        };

        console.log('📤 [Calendar] selectedEventData:', selectedEventData);
        setCancellationTarget(null);
        setDetailInitialTab('details');
        setSelectedEvent(selectedEventData);
        setIsAppointmentDetailModalOpen(true);
    };

    // 🆕 Abre modal de detalhe a partir de um appointment (usado pelo popover do dia)
    const [detailInitialTab, setDetailInitialTab] = useState<'details' | 'confirm' | 'cancel' | 'edit'>('details');
    const openAppointmentDetail = useCallback((appt: IAppointment, tab: 'details' | 'confirm' | 'cancel' | 'edit' = 'details') => {
        setDetailInitialTab(tab);
        const time = appt.time || '00:00';
        let dateObj: Date;
        if (typeof appt.date === 'string') {
            const datePart = appt.date.includes('T') ? appt.date.split('T')[0] : appt.date;
            dateObj = new Date(`${datePart}T${time}`);
        } else {
            dateObj = new Date(appt.date);
        }
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
            billingType: appt.billingType === 'liminar' ? 'liminar' :
                (appt.billingType === 'convenio' || appt.paymentMethod === 'convenio') ? 'convenio' :
                (appt.billingType || 'particular'),
            insuranceProvider: appt.insuranceProvider || '',
            insuranceValue: appt.insuranceValue || 0,
            insuranceGuide: appt.insuranceGuide || null,
            insuranceGuideNumber: appt.insuranceGuideNumber || appt.insuranceGuide?.number || null,
            insurancePlan: appt.insurancePlan || null,
            authorizationCode: appt.authorizationCode || '',
            serviceType: appt.serviceType || appt.sessionType || 'individual_session',
            paymentAmount: appt.sessionValue || appt.paymentAmount || 0,
            sessionValue: appt.sessionValue || appt.paymentAmount || 0,
            depositAmount: appt.depositAmount ?? 0,
            remainingAmount: appt.remainingAmount ?? null,
            paymentMethod: appt.paymentMethod || '',
            paymentOrigin: appt.paymentOrigin || '',
            specialty: appt.specialty || appt.sessionType || '',
            __isPreAgendamento: (appt as any).__isPreAgendamento || false,
            package: appt.package || null,
            liminarContract: (appt as any).liminarContract || null,
            backgroundColor: '',
            borderColor: ''
        };
        if (tab === 'cancel') {
            setIsAppointmentDetailModalOpen(false);
            setSelectedEvent(null);
            setDayModalOpen(false);
            setActivePopup(null);
            setHoveredDay(null);
            setCancellationTarget(selectedEventData);
        } else {
            setCancellationTarget(null);
            setSelectedEvent(selectedEventData);
            setIsAppointmentDetailModalOpen(true);
        }
    }, []);

    // 🚀 AÇÕES RÁPIDAS NO CARD DO CALENDÁRIO
    const handleQuickConfirm = useCallback(async (appointmentId: string) => {
        if (!onConfirmAppointment) return;
        try {
            await onConfirmAppointment(appointmentId);
        } catch (err) {
            console.error('[EnhancedCalendar] Erro na confirmação rápida:', err);
        }
    }, [onConfirmAppointment]);

    const handleQuickComplete = useCallback(async (appointmentId: string) => {
        if (!onCompleteAppointment) return;
        try {
            await onCompleteAppointment(appointmentId);
        } catch (err) {
            console.error('[EnhancedCalendar] Erro na conclusão rápida:', err);
        }
    }, [onCompleteAppointment]);

    // ─── REMARCAÇÃO RÁPIDA ("Mudar data") ──────────────────────────────────
    const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleTarget | null>(null);
    const [pendingFocus, setPendingFocus] = useState<{ id: string; date: string } | null>(null);
    const canReschedule = !!onRescheduleAppointment && permissions.canEdit;

    const toDateOnly = (value: any): string => {
        if (!value) return '';
        return typeof value === 'string' ? value.split('T')[0] : new Date(value).toISOString().split('T')[0];
    };

    const openReschedule = useCallback((appt: any, prefill?: { date?: string; time?: string }) => {
        if (!appt) return;
        const doctorObj = appt.doctor && typeof appt.doctor === 'object' ? appt.doctor : null;
        setRescheduleTarget({
            id: appt._id || appt.id,
            patientName: appt.patient?.fullName || appt.patient?.name || appt.patientInfo?.fullName || 'Paciente',
            doctorId: doctorObj?._id || doctorObj?.id || (typeof appt.doctor === 'string' ? appt.doctor : ''),
            doctorName: doctorObj?.fullName || doctorObj?.name || 'Profissional',
            specialtyLabel: appt.specialty ? getSpecialtyLabel(appt.specialty) : undefined,
            currentDate: toDateOnly(appt.date),
            currentTime: appt.time || '',
            initialDate: prefill?.date,
            initialTime: prefill?.time,
            reactivating: ['canceled', 'cancelado', 'cancelada'].includes(appt.operationalStatus),
        });
    }, []);

    // Cancelar abre a janela única; finalizar abre o modal de atendimento.
    const openDetailTabById = useCallback((appointmentId: string, tab: 'confirm' | 'cancel') => {
        const appt = appointments.find((a: any) => (a._id || a.id) === appointmentId);
        if (appt) openAppointmentDetail(appt, tab);
    }, [appointments, openAppointmentDetail]);

    const handleRescheduleById = useCallback((appointmentId: string) => {
        const appt = appointments.find((a: any) => (a._id || a.id) === appointmentId);
        openReschedule(appt);
    }, [appointments, openReschedule]);

    // Arrastar (semana/dia): o FullCalendar já moveu o card visualmente; se a secretária cancelar
    // o diálogo (ou a API recusar), `revert` devolve o card ao lugar de origem.
    const dragRevertRef = useRef<(() => void) | null>(null);

    const handleRescheduleClose = useCallback(() => {
        dragRevertRef.current?.();
        dragRevertRef.current = null;
        setRescheduleTarget(null);
    }, []);

    const NON_DRAGGABLE_STATUSES = ['completed', 'canceled', 'cancelled', 'missed', 'absent', 'force_cancelled'];

    const handleEventAllow = useCallback((dropInfo: any, draggedEvent: any) => {
        const props = draggedEvent?.extendedProps || {};
        if (NON_DRAGGABLE_STATUSES.includes(props.operationalStatus || 'scheduled')) return false;
        if (props.__isPreAgendamento) return false;
        const dayStr = dropInfo.start.toLocaleDateString('en-CA'); // YYYY-MM-DD no fuso local
        if (dayStr < new Date().toLocaleDateString('en-CA')) return false; // nunca para o passado
        if (isHoliday(dayStr)) return false;
        return true;
    }, [isHoliday]);

    const handleEventDrop = useCallback((info: any) => {
        const { event } = info;
        const appt = appointments.find((a: any) => (a._id || a.id) === event.id);
        if (!appt || !event.start) {
            info.revert();
            return;
        }
        dragRevertRef.current?.(); // se havia outro arraste pendente, desfaz antes
        dragRevertRef.current = info.revert;
        const hh = String(event.start.getHours()).padStart(2, '0');
        const mm = String(event.start.getMinutes()).padStart(2, '0');
        // Não grava direto: abre o diálogo pré-preenchido para confirmar (e validar horário livre)
        openReschedule(appt, { date: event.start.toLocaleDateString('en-CA'), time: `${hh}:${mm}` });
    }, [appointments, openReschedule]);

    const handleRescheduleConfirm = useCallback(async (
        id: string,
        data: { date: string; time: string; reason?: string }
    ) => {
        if (!onRescheduleAppointment) throw new Error('Remarcação indisponível neste calendário.');
        await onRescheduleAppointment(id, data); // lança em erro → o diálogo mostra a mensagem inline
        dragRevertRef.current = null; // gravou: o card fica onde foi solto (refetch já reposicionou)
        setDayModalOpen(false); // snapshot do dia antigo ficou desatualizado
        setPendingFocus({ id, date: data.date });
        calendarRef.current?.getApi().gotoDate(data.date); // pula para o dia/mês novo
    }, [onRescheduleAppointment]);

    // Quando o agendamento remarcado aparece no dia novo (após o refetch), abre o dia com ele
    useEffect(() => {
        if (!pendingFocus) return;
        const moved = appointments.find((a: any) =>
            (a._id || a.id) === pendingFocus.id && toDateOnly(a.date) === pendingFocus.date
        );
        if (!moved) return;
        setDayModalData({ dateStr: pendingFocus.date, dayAppts: getAppointmentsByDay(pendingFocus.date) });
        setDayModalFilter('');
        setDayModalOpen(true);
        setPendingFocus(null);
    }, [appointments, pendingFocus, getAppointmentsByDay]);

    // Segurança: se o dia novo nunca chegar (falha de carga), não deixa o foco pendente para sempre
    useEffect(() => {
        if (!pendingFocus) return;
        const t = setTimeout(() => setPendingFocus(null), 10000);
        return () => clearTimeout(t);
    }, [pendingFocus]);

    // 🔹 MEMOIZAÇÃO DOS EVENTOS - Só recalcula quando appointments mudar
    const events = useMemo(() => {
        if (!appointments || appointments.length === 0) return [];

        // Filtra só o intervalo visível — evita passar 500+ eventos de uma vez ao FullCalendar
        const monthFiltered = visibleRange
            ? appointmentDTOs.filter(appt => {
                if (!appt.date) return false;
                const dateStr = typeof appt.date === 'string'
                    ? (appt.date.includes('T') ? appt.date.split('T')[0] : appt.date)
                    : new Date(appt.date as any).toISOString().split('T')[0];
                return dateStr >= visibleRange.start && dateStr < visibleRange.end;
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
            // Usa SEMPRE a parte YYYY-MM-DD + time no fuso local, ignorando o horário UTC que vem no ISO.
            let startDate: Date;
            if (typeof appt.date === 'string') {
                const datePart = appt.date.includes('T') ? appt.date.split('T')[0] : appt.date;
                const [year, month, day] = datePart.split('-').map(Number);
                startDate = new Date(year, month - 1, day, hours, minutes);
            } else if (appt.date instanceof Date) {
                // Formato Date object: preserva dia/mês/ano locais e aplica o time
                startDate = new Date(appt.date.getFullYear(), appt.date.getMonth(), appt.date.getDate(), hours, minutes);
            } else {
                // Fallback: tenta converter
                const datePart = String(appt.date).includes('T') ? String(appt.date).split('T')[0] : String(appt.date);
                const [year, month, day] = datePart.split('-').map(Number);
                startDate = new Date(year, month - 1, day, hours, minutes);
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

    }, [appointmentDTOs, visibleRange, getPaymentStatusConfig, getOperationalStatusConfig]);

    // 🔹 Ref para rastrear o último range processado e evitar loops
    const lastDateRangeRef = useRef<string>('');

    // 🔹 CALLBACK datesSet - Atualiza apenas o estado visual (não causa re-render do calendário)
    const handleDatesSet = useCallback((dateInfo: any) => {
        const start = dateInfo.start;
        const end = dateInfo.end;

        // Mês de referência = mês da view, não o 1º dia visível (no mês, a grade começa no fim do
        // mês anterior e o cabeçalho mostrava "2026-09" em outubro)
        const ref = dateInfo.view?.currentStart || start;
        const year = ref.getFullYear();
        const month = String(ref.getMonth() + 1).padStart(2, '0');
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
        setVisibleRange({ start: toYmd(start), end: toYmd(end) });
        setFcView(dateInfo.view?.type || 'dayGridMonth');
        setFcDate(toYmd(ref));

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
        // Locale do FullCalendar (antes passava o locale do date-fns, e os botões saíam em inglês)
        locales: [ptBrLocale],
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
        // Grade de 20 min: os horários da clínica caem em 09:20, 10:40... (com 40 min a partir das
        // 07:00 eles ficavam no meio de um slot). Rótulo só de hora em hora, em "09:00".
        slotDuration: "00:20:00",
        slotLabelInterval: "01:00:00",
        slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: false } as Intl.DateTimeFormatOptions,
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
            // 240px fazia um card de 1h cobrir a tarde inteira na semana/dia
            timeGridWeek: {
                eventMinHeight: 36,
            },
            timeGridDay: {
                eventMinHeight: 36,
            },
        },
        datesSet: handleDatesSet,
    }), [handleDatesSet]);

    // 🆕 COMPONENTE REUTILIZÁVEL: Card visual de agendamento (calendário + popup)
    const AppointmentEventCard = React.memo(({ appointment, timeText, onClick, variant = 'compact', onComplete, onReschedule, onCancelCard, onFinalizeCard }: {
        appointment: AppointmentDTO;
        timeText?: string;
        onClick?: () => void;
        variant?: 'compact' | 'expanded' | 'premium';
        onConfirm?: (id: string) => void;
        onComplete?: (id: string) => void;
        onReschedule?: (id: string) => void;
        /** Cancelar abre a janela única; Finalizar abre o atendimento. */
        onCancelCard?: (id: string) => void;
        onFinalizeCard?: (id: string) => void;
    }) => {
        const apptId = appointment.id;

        const isExpanded = variant === 'expanded';
        const isPremium = variant === 'premium';
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
        // Fonte de verdade: billingType === 'liminar' (pós-desacoplamento 2026-05-01)
        const isLiminarLegacy = packageObj?.type === 'liminar';
        const liminarContract = (appointment as any).liminarContract;
        const isLiminar = isLiminarLegacy || !!liminarContract || (appointment as any).billingType === 'liminar';
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
        const sessionValue = appointment.amount || appointment.sessionValue || appointment.paymentAmount || 0;
        const reason = appointment.reason || appointment.notes || '';

        const SERVICE_TYPE_LABELS: Record<string, string> = {
            'individual_session': 'Sessão',
            'session': 'Sessão',
            'convenio_session': 'Sessão',
            'liminar_session': 'Sessão',
            'joint_session': 'Sessão conjunta',
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
            ? convenioName(insuranceProvider) || insuranceProvider
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
            // 'missed' é o valor real gravado pelo backend (auto_expired) — 'absent'
            // não existe nos dados reais; sem esta chave o lookup caía no fallback
            // .scheduled e a falta aparecia como "Agendado" no calendário.
            missed: { label: 'Faltou', bg: 'bg-red-700', text: 'text-white' },
            pre_agendado: { label: 'Pré-Agend.', bg: 'bg-pink-500', text: 'text-white' },
        };

        const basePaymentBadge = PAYMENT_BADGE[financialStatus] || PAYMENT_BADGE.pending;
        // Para pacote pago com valor, mostra o valor da sessão no badge em vez de "Pendente" / ícone cifrão
        const effectiveSessionValue = packageSessionValue ?? sessionValue ?? 0;
        const paymentBadge = (() => {
            // Convênio: badge mostra o valor tabela (fonte de verdade do convênio)
            if (isConvenio && appointment.insuranceValue > 0) {
                return { ...PAYMENT_BADGE.convenio, label: `R$ ${appointment.insuranceValue.toFixed(2)}` };
            }
            // Pacote pré-pago: badge mostra o valor da sessão
            if (hasPackage && effectiveSessionValue > 0) {
                return { ...basePaymentBadge, label: `R$ ${effectiveSessionValue.toFixed(2)}`, icon: '💰' };
            }
            return basePaymentBadge;
        })();
        const operationalBadge = OPERATIONAL_BADGE[operationalStatus] || OPERATIONAL_BADGE.scheduled;
        const OperationalIcon = operationalConfig?.icon || Clock;

        const fmtTime = (t: string) => {
            if (!t) return '';
            // timeText do FullCalendar já vem como "09:00" ou "09:00 - 09:40"
            if (t.includes(':')) return t;
            return t.toString().padStart(2, '0') + ':00';
        };

        // 🎨 Cor do card por tipo de atendimento
        const getCardBackground = () => {
            if (isPackageSessionPending) return 'linear-gradient(135deg, #fde047 0%, #f97316 100%)';
            if (isLiminar) return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
            if (hasPackage) return 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)';
            if (isConvenio) return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            return 'linear-gradient(135deg, #a2ddbfff 0%, #1aac68ff 100%)';
        };

        // 🌟 Variante "premium" — mesma paleta por tipo (liminar/pacote/convênio/particular)
        // do card clássico, com layout mais respirado. Reaproveita 100% dos dados/regras
        // já calculados acima; só muda a apresentação.
        if (isPremium) {
            const isDimmed = ['canceled', 'absent'].includes(operationalStatus);
            
            // Concluído: véu branco sobre a cor do tipo de atendimento → card "apagado",
            // contrastando com o Agendado que mantém a cor cheia e o botão "Realizar".
            // Fundo = TIPO de atendimento (particular, convênio, pacote, liminar) em tom pastel, com texto escuro legível.
            // Faixa lateral = STATUS do atendimento (operationalConfig.color).
            const typeMeta = isPackageSessionPending
                ? { label: 'Pacote', bg: 'linear-gradient(135deg, #fef9c3 0%, #fed7aa 100%)', chip: '#c2410c' }
                : isLiminar
                    ? { label: 'Liminar', bg: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', chip: '#c2410c' }
                    : hasPackage
                        ? { label: 'Pacote', bg: 'linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 100%)', chip: '#7e22ce' }
                        : isConvenio
                            ? { label: 'Convênio', bg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)', chip: '#1d4ed8' }
                            : { label: 'Particular', bg: 'linear-gradient(135deg, #dcfce7 0%, #86efac 100%)', chip: '#047857' };
            const packagePct = totalSessions && sessionsDone !== null
                ? Math.min(100, Math.round((sessionsDone / totalSessions) * 100))
                : null;
            // Convênio: progresso da guia (sessões usadas / autorizadas)
            const guideTotal = (appointment as any).insuranceGuideTotalSessions as number | null | undefined;
            const guideUsed = (appointment as any).insuranceGuideUsedSessions as number | null | undefined;
            const guidePct = isConvenio && guideTotal && guideTotal > 0 && typeof guideUsed === 'number'
                ? Math.min(100, Math.round((guideUsed / guideTotal) * 100))
                : null;
            // Liminar (contrato, sem pacote): consumo do crédito em R$
            const liminarTotalCredit = Number(liminarContract?.totalCredit) || 0;
            const liminarUsedCredit = Number(liminarContract?.usedCredit) || 0;
            const liminarPct = isLiminar && !hasPackage && liminarTotalCredit > 0
                ? Math.min(100, Math.round((liminarUsedCredit / liminarTotalCredit) * 100))
                : null;
            const renderBar = (pct: number, label: string, title: string) => (
                <div className="mt-2" title={title}>
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-slate-800">
                        <span>{title}</span><strong className="tabular-nums text-sm">{label}</strong>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/60" role="progressbar" aria-label={title} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: typeMeta.chip }} />
                    </div>
                </div>
            );
            const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const financialLabel = isConvenio ? 'A faturar pelo convênio'
                : isLiminar && !hasPackage ? 'Vinculado ao contrato'
                : financialStatus === 'package_paid' ? 'Pago no pacote'
                : basePaymentBadge.label;
            return (
                <Paper elevation={0} onClick={onClick}
                    className="agenda-list-card [&_button]:min-h-9 [&_button]:flex-none [&_button]:border-0 [&_button]:bg-transparent [&_button]:backdrop-blur-none [&_button]:text-xs [&_button[data-primary=true]]:ml-auto [&_button[data-primary=true]]:bg-emerald-800 [&_button[data-primary=true]]:text-white w-full cursor-pointer rounded-xl border border-black/10 p-3 text-slate-800 transition-colors"
                    style={{ background: CANCELED_LIKE_STATUSES.includes(operationalStatus) ? `linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.65)), ${typeMeta.bg}` : typeMeta.bg, opacity: isDimmed ? 0.7 : 1 }}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <strong className="text-[23px] font-bold leading-none tabular-nums text-slate-900">{fmtTime(timeText || appointment.time || '')}</strong>
                        <span className="text-xs font-semibold" style={{ color: typeMeta.chip }}>{typeMeta.label}</span>
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white/50 px-2 py-1 text-xs font-semibold text-slate-800">
                            <OperationalIcon size={13} />{operationalConfig?.label || operationalBadge.label}
                        </span>
                    </div>
                    <p className="mt-2 break-words text-base font-bold leading-snug text-slate-900">{patientName}</p>
                    <div className="mt-1 flex items-start gap-2 text-[13px] leading-relaxed">
                        <User size={15} className="mt-0.5 shrink-0" />
                        <div className="min-w-0 break-words">{doctorName}{specialtyLabel && <div className="text-xs">{specialtyLabel}</div>}</div>
                    </div>
                    <div className="mt-2 border-t border-black/10 pt-2">
                        {(serviceLabel !== typeMeta.label || isConvenio || (isLiminar && liminarProcessNumber)) && <div className="break-words text-xs leading-relaxed">{serviceLabel !== typeMeta.label && serviceLabel}{isConvenio && ` · ${insuranceProviderName || 'Convênio'}`}{isConvenio && appointment.insuranceGuideNumber && ` · Guia ${appointment.insuranceGuideNumber}`}{isLiminar && liminarProcessNumber && ` · Processo ${liminarProcessNumber}`}</div>}
                        {hasPackage && (packagePct !== null
                            ? renderBar(packagePct, `${sessionsDone ?? 0} / ${totalSessions} sessões`, 'Sessões realizadas do pacote')
                            : totalSessions ? <p className="mt-2 text-xs">Total do pacote: {totalSessions} sessões</p> : null)}
                        {hasPackage && sessionsRemaining !== null && <p className="mt-1 text-xs">{sessionsRemaining} sessões restantes</p>}
                        {guidePct !== null && renderBar(guidePct, `${guideUsed} / ${guideTotal} sessões`, 'Sessões utilizadas da guia')}
                        {liminarPct !== null && <p className="mt-2 text-xs leading-relaxed">Crédito utilizado: <strong className="tabular-nums">{fmtBRL(liminarUsedCredit)}</strong> de {fmtBRL(liminarTotalCredit)}</p>}
                        {!hasPackage && !isConvenio && reason && <p className="mt-2 break-words text-xs leading-relaxed">{reason}</p>}
                        <div className="mt-2 grid grid-cols-2 gap-3 text-xs leading-relaxed">
                            <div><span className="block">{isLiminar && liminarCreditBalance !== null ? 'Crédito disponível' : isConvenio ? 'Valor tabela' : hasPackage ? 'Valor da sessão' : 'Valor do atendimento'}</span>
                                <strong className="mt-1 block text-[15px] tabular-nums text-slate-900">{fmtBRL(isLiminar && liminarCreditBalance !== null ? Number(liminarCreditBalance) : isConvenio ? Number(appointment.insuranceValue || 0) : Number(effectiveSessionValue))}</strong>
                            </div>
                            <div><span className="block">Situação financeira</span><strong className="mt-1 block text-[13px]">{financialLabel}</strong></div>
                        </div>
                        {patientHasDebt && <p className="mt-2 text-xs font-semibold text-red-900" title="Saldo devedor do paciente, independente desta sessão">Débito do paciente: {fmtBRL(patientBalance)}</p>}
                    </div>
                    <div className="mt-2 border-t border-black/10 pt-1 [&>div]:mt-1 [&>div]:flex-wrap">
                        {operationalStatus === 'completed'
                            ? (onClick && <button type="button" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-800" onClick={(e) => { e.stopPropagation(); onClick(); }}>Ver detalhes</button>)
                            : <CardActions status={operationalStatus}
                            onReschedule={onReschedule ? () => onReschedule(apptId) : undefined}
                            onCancel={onCancelCard ? () => onCancelCard(apptId) : undefined}
                            onFinalize={onFinalizeCard ? () => onFinalizeCard(apptId) : undefined} />}
                    </div>
                </Paper>
            );
        }

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
                            <div className="bg-rose-600 text-white px-2 py-1 rounded-lg text-3xs font-extrabold shadow-md flex items-center gap-1 animate-pulse">
                                <span>💰</span>
                                <span>Em aberto</span>
                            </div>
                        )}
                        <div className={`${paymentBadge.bg} ${paymentBadge.text} px-2 py-1 rounded-lg ${isExpanded ? 'text-xs' : 'text-3xs'} font-extrabold shadow-md flex items-center gap-1`}>
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
                        <span className={`${isExpanded ? 'text-xs' : 'text-3xs'} bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium`}>
                            {serviceLabel}
                        </span>
                    )}
                    {specialty && (
                        <span className={`${isExpanded ? 'text-xs' : 'text-3xs'} bg-white/80 px-2 py-0.5 rounded text-gray-800 font-medium capitalize`}>
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
                                    <span className={`text-3xs px-1.5 py-0.5 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {paymentBadge.label}
                                    </span>
                                </div>
                                {/* Progresso do pacote: da API (package.sessionsDone / package.totalSessions) */}
                                {totalSessions !== null ? (
                                    <div className="text-2xs text-gray-700">
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
                                    <div className="text-2xs text-gray-700 mt-1">
                                        💰 Valor/sessão:{" "}
                                        <span className="font-semibold">
                                            R$ {(packageSessionValue ?? sessionValue ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="text-2xs text-gray-600 mt-1 italic">
                                        🎁 Incluído no pacote
                                    </div>
                                )}
                                {isLiminar && liminarProcessNumber && (
                                    <div className="text-3xs text-amber-700 mt-1">
                                        ⚖️ Processo: {liminarProcessNumber}
                                    </div>
                                )}
                                {isLiminar && liminarCreditBalance !== null && (
                                    <div className="text-3xs text-amber-700">
                                        💳 Crédito: R$ {Number(liminarCreditBalance).toFixed(2)}
                                    </div>
                                )}
                                {/* Hint quando pacote não está populado */}
                                {!packageObj && packageId && (
                                    <div className="text-3xs text-purple-600/70 mt-1 italic">
                                        Sessão vinculada a pacote
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Convênio */}
                        {isConvenio && (
                            <div className="p-2 bg-blue-100/80 border border-blue-300 rounded-lg">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-xs font-bold text-blue-800">🏥 Convênio</span>
                                    {serviceType === 'evaluation' && (
                                        <span className="text-3xs font-semibold bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full">
                                            Avaliação
                                        </span>
                                    )}
                                </div>
                                <div className="text-2xs text-gray-700">
                                    {insuranceProviderName && <div>{insuranceProviderName}</div>}
                                    {appointment.insuranceGuideNumber && <div>Guia #{appointment.insuranceGuideNumber}</div>}
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
                    <p className={`text-2xs text-gray-800 font-semibold mb-2`}>
                        💰 R$ {sessionValue.toFixed(2)}
                    </p>
                )}
                {!isExpanded && reason && !hasPackage && !isConvenio && sessionValue === 0 && (
                    <p className={`text-3xs text-gray-700 truncate italic mb-2`} title={reason}>
                        📝 {reason.length > 25 ? reason.substring(0, 25) + '...' : reason}
                    </p>
                )}

                {/* Badges adicionais */}
                <div className="flex flex-wrap items-center gap-1 mt-auto">
                    <div className={`${operationalBadge.bg} ${operationalBadge.text} px-2 py-0.5 rounded text-3xs font-semibold leading-4 flex items-center gap-1`}>
                        <OperationalIcon size={isExpanded ? 12 : 9} />
                        <span>{operationalBadge.label}</span>
                    </div>

                    {/* 🚀 AÇÕES RÁPIDAS NO CARD (sem abrir modal) */}
                    {/* 🚨 FIX (2026-08-18): ver comentário equivalente na variante premium acima —
                        "Confirmar" deixava a sessão presa em 'confirmed' sem ninguém fechar depois.
                        Agora completa direto, igual ao modal de detalhe. */}
                    {!isExpanded && operationalStatus === 'scheduled' && onComplete && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onComplete(apptId);
                            }}
                            className="relative bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded text-3xs font-semibold leading-4 shadow-sm before:absolute before:-inset-2 before:content-['']"
                        >
                            Realizar
                        </button>
                    )}
                    {!isExpanded && operationalStatus === 'confirmed' && onComplete && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onComplete(apptId);
                            }}
                            className="relative bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded text-3xs font-semibold leading-4 shadow-sm before:absolute before:-inset-2 before:content-['']"
                        >
                            Realizar
                        </button>
                    )}

                    {patientHasDebt && (
                        <div className="rounded bg-red-600 px-2 py-0.5 text-3xs font-semibold leading-4 text-white animate-pulse" title={`Saldo devedor do paciente (não relacionado a esta sessão/pacote): R$ ${patientBalance.toFixed(2)}`}>
                            ⚠️ Débito R$ {patientBalance.toFixed(0)}
                        </div>
                    )}
                    {isPackageSessionPending && (
                        <div className="rounded bg-amber-500 px-2 py-0.5 text-3xs font-semibold leading-4 text-white animate-pulse" title="Pacote - Receber hoje">
                            💰 RECEBER
                        </div>
                    )}
                    {/* Badges de tipo só no compacto — no expandido o bloco de info já cobre */}
                    {!isExpanded && hasPackage && isConvenio && (
                        <div className="rounded bg-orange-600 px-2 py-0.5 text-3xs font-semibold leading-4 text-white">
                            📦 Convênio
                        </div>
                    )}
                    {!isExpanded && hasPackage && !isConvenio && isLiminar && (
                        <div className="rounded bg-amber-500 px-2 py-0.5 text-3xs font-semibold leading-4 text-white">
                            ⚖️ Liminar
                        </div>
                    )}
                    {!isExpanded && hasPackage && !isConvenio && !isLiminar && (
                        <div className="rounded bg-green-600 px-2 py-0.5 text-3xs font-semibold leading-4 text-white">
                            📦 Pacote
                        </div>
                    )}
                    {!isExpanded && !hasPackage && isConvenio && (
                        <div className="rounded bg-orange-600 px-2 py-0.5 text-3xs font-semibold leading-4 text-white">
                            🏥 Convênio
                        </div>
                    )}
                </div>

                {/* 📅 Mudar data — popup do dia (expandido), em linha própria; no compacto o card é pequeno demais */}
                {isExpanded && (
                    <CardActions
                        status={operationalStatus}
                        onReschedule={onReschedule ? () => onReschedule(apptId) : undefined}
                        onCancel={onCancelCard ? () => onCancelCard(apptId) : undefined}
                        onFinalize={onFinalizeCard ? () => onFinalizeCard(apptId) : undefined}
                    />
                )}
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
            ? convenioName(insuranceProvider) || insuranceProvider
            : '';

        // Semana e Dia: bloco fino (horário, paciente, status). O card grande tinha 170px e ficava
        // cortado na grade, sem o nome do paciente. Valor só para quem vê financeiro.
        if (arg.view.type === 'timeGridWeek' || arg.view.type === 'timeGridDay') {
            const typeTone = isLiminar
                ? { bg: '#ffedd5', ink: '#9a3412', label: 'Liminar' }
                : hasPackage
                    ? { bg: '#f3e8ff', ink: '#6b21a8', label: 'Pacote' }
                    : isConvenio
                        ? { bg: '#dbeafe', ink: '#1e40af', label: insuranceProviderName || 'Convênio' }
                        : { bg: '#dcfce7', ink: '#166534', label: 'Particular' };
            const dimmed = CANCELED_LIKE_STATUSES.includes(operationalStatus) || operationalStatus === 'absent';
            const statusLabel = operationalConfig?.label || '';
            const range = fmtSlimTime(arg.timeText, arg.event.extendedProps.time);
            return (
                <div
                    className="flex h-full min-w-0 flex-col gap-0.5 overflow-hidden rounded-md px-2 py-1 text-left leading-tight"
                    style={{ background: typeTone.bg, borderLeft: `4px solid ${operationalConfig.color}`, opacity: dimmed ? 0.6 : 1 }}
                    title={`${range} · ${patientName} · ${statusLabel} · ${typeTone.label}`}
                >
                    <div className="flex min-w-0 items-baseline gap-1.5">
                        {/* Cores fixas: o fundo é pastel nos dois temas (o dark.css clarearia text-slate-*) */}
                        <span className="shrink-0 text-xs font-bold tabular-nums text-[#0f172a]">{range}</span>
                        <span className={`truncate text-xs font-semibold text-[#0f172a] ${dimmed ? 'line-through' : ''}`}>{patientName}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-[#334155]">
                        <span className="truncate">{statusLabel}</span>
                        <span aria-hidden>·</span>
                        <span className="truncate font-medium" style={{ color: typeTone.ink }}>{typeTone.label}</span>
                        {permissions.canSeeFinancial && arg.event.extendedProps.paymentStatus === 'unpaid' && !isConvenio && (
                            <span className="ml-auto shrink-0 rounded bg-rose-600 px-1 text-[10px] font-bold text-white">Em aberto</span>
                        )}
                    </div>
                </div>
            );
        }

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
            // 'missed' é o valor real gravado pelo backend (auto_expired) — 'absent'
            // não existe nos dados reais; sem esta chave o lookup caía no fallback
            // .scheduled e a falta aparecia como "Agendado" no calendário.
            missed: { label: 'Faltou', bg: 'bg-red-700', text: 'text-white' },
            pre_agendado: { label: 'Pré-Agend.', bg: 'bg-pink-500', text: 'text-white' }, // 🎯 NOVO
        };

        const effectiveSessionValue = packageObj?.sessionValue ?? sessionValue ?? 0;
        const insuranceValue = arg.event.extendedProps.insuranceValue || 0;
        const basePaymentBadge = PAYMENT_BADGE[financialStatus] || PAYMENT_BADGE.pending;
        const paymentBadge = (() => {
            // Convênio: badge mostra o valor tabela (fonte de verdade do convênio)
            if (isConvenio && insuranceValue > 0) {
                return { ...PAYMENT_BADGE.convenio, label: `R$ ${Number(insuranceValue).toFixed(2)}` };
            }
            // Pacote pré-pago: badge mostra o valor da sessão
            if (hasPackage && effectiveSessionValue > 0) {
                return { ...basePaymentBadge, label: `R$ ${effectiveSessionValue.toFixed(2)}`, icon: '💰' };
            }
            return basePaymentBadge;
        })();
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
                                    <span className={`text-3xs px-2 py-1 rounded-full font-bold ${paymentBadge.bg} ${paymentBadge.text}`}>
                                        {isLiminar ? 'Crédito' : paymentBadge.label}
                                    </span>
                                </div>
                                {packageObj && (
                                    <div className="text-3xs text-slate-400 space-y-1">
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
                                    <div className="text-3xs text-slate-500 italic">
                                        Pacote (detalhes não carregados)
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 🆕 INFO DE CONVÊNIO NA TOOLTIP */}
                        {isConvenio && (
                            <div className="mb-3 p-2 bg-blue-700/30 rounded-lg border border-blue-500/30">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-medium text-blue-300">🏥 Convênio</span>
                                    {serviceType === 'evaluation' && (
                                        <span className="text-3xs font-semibold bg-violet-900/60 text-violet-300 border border-violet-500/40 px-1.5 py-0.5 rounded-full">
                                            Avaliação
                                        </span>
                                    )}
                                </div>
                                <div className="text-3xs text-slate-300">
                                    <div className="font-semibold text-white">{insuranceProviderName}</div>
                                    {arg.event.extendedProps.insuranceGuideNumber && (
                                        <div>Guia #{arg.event.extendedProps.insuranceGuideNumber}</div>
                                    )}
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
                                <div className="text-3xs text-slate-200">
                                    <div className="font-bold text-red-400 text-lg">R$ {patientBalance.toFixed(2)}</div>
                                    <div className="text-red-300">Saldo geral do paciente (não é o valor desta sessão/pacote)</div>
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
                        onConfirm={handleQuickConfirm}
                        onComplete={handleQuickComplete}
                    />
                </div>
            </Tooltip>
        );
    }, [getPaymentStatusConfig, getOperationalStatusConfig, appointments, permissions.canSeeFinancial, convenioName]);

    const showDayByPro = isAdminMode && fcView === 'timeGridDay' && dayLayout === 'pro';

    // Legenda compacta do admin (mesmo conteúdo dos três quadros antigos)
    const agendaLegend = (
        <div className="grid gap-4 text-[13px] text-gray-700 sm:grid-cols-3">
            <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Status (borda do card na semana)</p>
                <ul className="flex flex-col gap-1">
                    {Object.entries(getOperationalStatusVisualConfigMap()).filter(([st]) => st !== 'absent').map(([st, cfg]) => (
                        <li key={st} className="flex items-center gap-2"><span className="h-3.5 w-1 rounded" style={{ background: cfg.color }} />{cfg.label}</li>
                    ))}
                </ul>
            </div>
            <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo (cor do card)</p>
                <ul className="flex flex-col gap-1">
                    {[['Particular', '#86efac'], ['Convênio', '#93c5fd'], ['Pacote', '#d8b4fe'], ['Liminar', '#fdba74']].map(([label, c]) => (
                        <li key={label} className="flex items-center gap-2"><span className="h-3.5 w-6 rounded" style={{ background: c }} />{label}</li>
                    ))}
                </ul>
                <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Barra do mês</p>
                <ul className="flex flex-wrap gap-x-3 gap-y-1">
                    {[['Realizadas', '#1baf7a'], ['A fazer', '#cbd5e1'], ['Faltas', '#eda100'], ['Canceladas', '#e5484d']].map(([label, c]) => (
                        <li key={label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{label}</li>
                    ))}
                </ul>
            </div>
            {permissions.canSeeFinancial && (
                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Pagamento (etiqueta do card)</p>
                    <ul className="flex flex-col gap-1">
                        {Object.entries(getPaymentStatusConfigMap()).map(([st, cfg]) => (
                            <li key={st} className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded border-2" style={{ background: cfg.bgColor, borderColor: cfg.color }} />{cfg.label}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

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
                    // Hoje na semana/dia: só um tom leve na coluna (o verde forte cobria a grade inteira)
                    '.fc-timeGridWeek-view .fc-day-today, .fc-timeGridDay-view .fc-day-today': {
                        backgroundColor: '#ecfdf5 !important',
                    },
                    // Linhas de 20 min com 24px: uma sessão de 40 min cabe em 2 linhas (horário + nome / status)
                    '.fc .fc-timegrid-slot': { height: '24px' },
                    '.fc .fc-timegrid-slot-minor': { borderTopStyle: 'dotted' },
                    '.fc .fc-timegrid-slot-label-cushion': { fontSize: '12px', fontVariantNumeric: 'tabular-nums', color: '#475569' },
                    '.fc .fc-timegrid-event': { background: 'transparent', border: 'none', boxShadow: 'none' },
                    '.fc .fc-timegrid-event .fc-event-main': { padding: 0 },
                    // 🎯 Fundo verde para o dia de hoje no mês (sobrescreve amarelo padrão do FC)
                    '.fc-dayGridMonth-view .fc-day-today': {
                        backgroundColor: '#d1fae5 !important', // emerald-100
                        '& .fc-daygrid-day-frame': {
                            backgroundColor: '#d1fae5 !important',
                        },
                        '& .fc-daygrid-day-top': {
                            backgroundColor: '#d1fae5 !important',
                        },
                        '& .fc-scrollgrid-sync-inner': {
                            backgroundColor: '#d1fae5 !important',
                        },
                    },
                    // 🎯 Conteúdo do dia ocupa a célula inteira (permite centralizar o card de progresso)
                    '.fc-dayGridMonth-view .fc-daygrid-day-frame': {
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    '.fc-dayGridMonth-view .fc-daygrid-day-top': {
                        flex: '1 1 auto',
                        width: '100%',
                        flexDirection: 'row',
                    },
                    '.fc-dayGridMonth-view .fc-daygrid-day-number': {
                        flex: '1 1 auto',
                        width: '100%',
                        padding: 0,
                        display: 'flex',
                    },
                    '.fc-dayGridMonth-view .fc-daygrid-day-number > div': {
                        flex: '1 1 auto',
                    },
                    ...(isAdminMode ? {
                        '.fc .fc-today-button': { background: 'transparent !important', color: '#047857 !important', border: '1px solid #10b981 !important', fontWeight: 600, opacity: '1 !important', textTransform: 'none' },
                        '.fc .fc-today-button:disabled': { color: '#64748b !important', borderColor: '#cbd5e1 !important' },
                        '.fc-dayGridMonth-view .fc-day-today': { backgroundColor: 'rgba(16,185,129,0.07) !important', '& .fc-daygrid-day-frame, & .fc-daygrid-day-top, & .fc-scrollgrid-sync-inner': { backgroundColor: 'transparent !important' } },
                        '.fc-dayGridMonth-view .fc-day-holiday': { backgroundColor: '#fffbeb !important', '& .fc-daygrid-day-frame, & .fc-daygrid-day-top, & .fc-scrollgrid-sync-inner': { backgroundColor: 'transparent !important' } },
                        // Tema escuro (mesma paleta do dark.css)
                        'html.dark .fc': { '--fc-border-color': '#26312d', '--fc-page-bg-color': '#161d1b', '--fc-neutral-bg-color': '#1b2421', '--fc-today-bg-color': 'rgba(16,185,129,0.08)' },
                        'html.dark .fc .fc-toolbar-title': { color: '#eef3f1' },
                        'html.dark .fc .fc-toolbar': { borderColor: '#26312d' },
                        'html.dark .fc .fc-scrollgrid-section-header th': { backgroundColor: '#1b2421' },
                        'html.dark .fc .fc-button': { background: '#1b2421', borderColor: '#33413c', color: '#cfd8d4' },
                        'html.dark .fc .fc-button-primary:not(:disabled).fc-button-active': { background: '#047857', borderColor: '#047857', color: '#fff' },
                        'html.dark .fc .fc-today-button': { color: '#6ee7b7 !important' },
                        'html.dark .fc .fc-timegrid-slot-label-cushion': { color: '#a9b5b0' },
                        'html.dark .fc-timeGridWeek-view .fc-day-today, html.dark .fc-timeGridDay-view .fc-day-today': { backgroundColor: 'rgba(16,185,129,0.06) !important' },
                        'html.dark .fc-dayGridMonth-view .fc-day-holiday': { backgroundColor: 'rgba(245,158,11,0.1) !important' },
                    } : {}),
                    // 🎯 Esconde eventos na visualização mensal (popup group-hover já cobre)
                    '.fc-dayGridMonth-view .fc-daygrid-event': {
                        display: 'none !important',
                    },
                }}
            />
        <Box sx={{ backgroundColor: isAdminMode ? undefined : 'grey.50', minHeight: '100vh' }}>
            {isAdminMode ? (
                <AgendaHeader
                    monthLabel={monthTitle(currentViewDate)}
                    total={agendaCounts?.total ?? null}
                    preCount={agendaCounts?.preUpcoming ?? 0}
                    onOpenPre={onOpenPreAppointments}
                    onCreate={permissions.canCreate ? () => handleOpenSchedule(null, 'create') : undefined}
                />
            ) : calendarView !== 'cancelamentos' && <div className="mb-2 flex flex-col items-stretch justify-between gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/40 p-4 shadow-sm md:flex-row md:items-center md:p-5">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                        <Calendar size={22} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                            Calendário de Agendamentos
                        </h1>
                        {currentViewDate && (
                            <p className="mt-0.5 text-sm text-gray-600">
                                Visualizando: {currentViewDate}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    {onOpenPreAppointments && (
                        <button
                            type="button"
                            onClick={onOpenPreAppointments}
                            className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <CalendarPlus size={14} />
                            Pré-Agendamentos
                        </button>
                    )}
                    {permissions.canCreate && (
                        <button
                            type="button"
                            onClick={() => handleOpenSchedule(null, 'create')}
                            className="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                        >
                            <Plus size={14} />
                            Novo Agendamento
                        </button>
                    )}
                </div>
            </div>

            }
            {/* ── Toggle Agenda / Acompanhamento / Recorrência ── */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {(['agenda'] as const)
                    .concat(featureFlags.showCarteiraView ? ['carteira'] as const : [])
                    .concat(featureFlags.showRecorrenciaView ? ['semanal'] as const : [])
                    .concat(['cancelamentos'] as const)
                    .map(tab => (
                        <button
                            key={tab}
                            role="tab"
                            aria-selected={calendarView === tab}
                            onClick={() => setCalendarView(tab)}
                            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                                calendarView === tab
                                    ? 'border-emerald-600 text-emerald-700'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab === 'agenda' ? 'Agenda' : tab === 'carteira' ? 'Acompanhamento' : tab === 'semanal' ? 'Recorrência' : 'Cancelamentos'}
                            {isAdminMode && (tab as string) === 'carteira' && attentionCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-xs font-bold tabular-nums text-amber-800" title="Pacientes que pedem atenção">{attentionCount}</span>
                            )}
                        </button>
                    ))}
            </Box>

            {isAdminMode && calendarView === 'agenda' && agendaCounts && (
                <AgendaFilterBar
                    filter={agendaFilter}
                    onChange={setAgendaFilter}
                    doctorOptions={agendaCounts.doctorOptions}
                    doctorTotal={agendaCounts.doctorTotal}
                    statusCounts={agendaCounts.status}
                    statusTotal={agendaCounts.statusTotal}
                    typeCounts={agendaCounts.type}
                    typeTotal={agendaCounts.typeTotal}
                    legend={agendaLegend}
                />
            )}

            {featureFlags.showCarteiraView && calendarView === 'carteira' && (
                <Paper elevation={1} className={isAdminMode ? 'border border-gray-200 bg-white' : undefined} sx={{ borderRadius: 3, border: isAdminMode ? undefined : '1px solid', borderColor: isAdminMode ? undefined : 'grey.200', bgcolor: isAdminMode ? undefined : 'white', minHeight: 500 }}>
                    {/* Falha numa aba fica dentro dela, sem derrubar a Agenda */}
                    <TabErrorBoundary tabName="Acompanhamento">
                        <CarteiraView
                            doctors={doctors}
                            currentMonth={currentViewDate || new Date().toISOString().slice(0, 7)}
                        />
                    </TabErrorBoundary>
                </Paper>
            )}

            {calendarView === 'cancelamentos' && (
                <React.Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Carregando…</div>}>
                    <TabErrorBoundary tabName="Cancelamentos">
                        <CancellationsReport />
                    </TabErrorBoundary>
                </React.Suspense>
            )}

            {featureFlags.showRecorrenciaView && calendarView === 'semanal' && (
                <Paper elevation={1} className={isAdminMode ? 'border border-gray-200 bg-white' : undefined} sx={{ borderRadius: 3, border: isAdminMode ? undefined : '1px solid', borderColor: isAdminMode ? undefined : 'grey.200', bgcolor: isAdminMode ? undefined : 'white', minHeight: 500 }}>
                    <TabErrorBoundary tabName="Recorrência">
                        <CarteiraWeeklyView doctors={doctors} />
                    </TabErrorBoundary>
                </Paper>
            )}

            <Paper
                elevation={1}
                // admin: cor pelas classes do tema (o dark.css escurece .bg-white e .border-gray-200)
                className={isAdminMode ? 'border border-gray-200 bg-white' : undefined}
                sx={{
                    borderRadius: 3,
                    overflow: 'visible',
                    border: isAdminMode ? undefined : `1px solid ${theme.palette.grey[200]}`,
                    background: isAdminMode ? undefined : 'white',
                    position: 'relative',
                    display: calendarView === 'agenda' ? undefined : 'none',
                    ...(showDayByPro ? { '& .fc-view-harness': { display: 'none' } } : {}),
                }}
            >
                {isAdminMode && fcView === 'timeGridDay' && (
                    <div className="flex items-center justify-end gap-2 px-3 pt-3">
                        <span className="text-xs font-medium text-gray-500">Dia:</span>
                        <div className="inline-flex rounded-lg border border-gray-200 p-0.5" role="group" aria-label="Como mostrar o dia">
                            {([['single', 'Uma coluna'], ['pro', 'Por profissional']] as const).map(([v, label]) => (
                                <button key={v} type="button" aria-pressed={dayLayout === v} onClick={() => setDayLayout(v)}
                                    className={`rounded-md px-2.5 py-1 text-[13px] font-medium ${dayLayout === v ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {/* Skeleton de loading — overlay sobre o FullCalendar (não desmonta o calendário) */}
                {loading && (
                    <Box className={isAdminMode ? 'bg-white' : undefined} sx={{ position: 'absolute', inset: 0, zIndex: 10, borderRadius: 3, bgcolor: isAdminMode ? undefined : 'white', p: 2, display: 'flex', flexDirection: 'column', minHeight: 560 }}>
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
                                    // Simula o cartão de progresso do dia (a maioria das células tem atendimentos)
                                    const hasBadge = (week * 5 + day) % 6 !== 0;
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
                                                alignItems: 'center',
                                                gap: 0.5,
                                            }}
                                        >
                                            {/* Número do dia */}
                                            <Skeleton variant="circular" width={28} height={28} />
                                            {/* Cartão de progresso: x/y + barra + % */}
                                            {hasBadge && (
                                                <Box sx={{ width: '88%', maxWidth: 150, my: 'auto', borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#fff', px: 1.25, py: 0.75, boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}>
                                                    <Skeleton variant="text" width="45%" height={20} sx={{ mx: 'auto' }} />
                                                    <Skeleton variant="rounded" height={8} sx={{ borderRadius: 9, mt: 0.5 }} />
                                                    <Skeleton variant="text" width="60%" height={12} sx={{ mx: 'auto', mt: 0.5 }} />
                                                </Box>
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
                    // 📅 Arrastar para remarcar (semana/dia — no mensal as barras do FC ficam ocultas).
                    // eventDragMinDistance: só vira arraste após 8px, então o clique continua abrindo o modal.
                    editable={canReschedule}
                    eventStartEditable={canReschedule}
                    eventDurationEditable={false}
                    eventDragMinDistance={8}
                    eventAllow={handleEventAllow}
                    eventDrop={handleEventDrop}
                    eventContent={renderEventContent}
                    slotMinTime="07:00:00"
                    slotMaxTime="20:00:00"
                    eventMaxStack={true}
                    // eventOverlap só governa soltar/redimensionar sobre outro card (o layout lado a lado é
                    // slotEventOverlap, abaixo). Vários profissionais compartilham o mesmo horário, então o
                    // arraste não pode ser barrado por haver outro card ali — conflito real (mesmo
                    // profissional/paciente) é validado pelo diálogo + backend.
                    eventOverlap={true}
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
                        // O card de resumo e o número em círculo são do mês; na semana/dia o FC usa a
                        // mesma célula no topo da coluna e o card aparecia no meio da grade de horários.
                        if (arg.view.type !== 'dayGridMonth') return null;
                        if (isAdminMode) {
                            const ymd = toYmd(arg.date);
                            const holidayName = isHoliday(ymd) ? getHolidayName(ymd) : undefined;
                            const dayAppts = holidayName ? [] : getAppointmentsByDay(ymd);
                            return (
                                <div className={`h-full w-full ${dayAppts.length ? 'cursor-pointer' : ''}`}
                                    onMouseEnter={(e) => {
                                        clearHoverTimeout();
                                        setHoveredDay(ymd);
                                        if (dayAppts.length > 0) setActivePopup({ dateStr: ymd, dayAppts, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                    onMouseLeave={scheduleHide}
                                    onClick={() => {
                                        if (dayAppts.length === 0) return;
                                        clearHoverTimeout();
                                        setActivePopup(null);
                                        setDayModalData({ dateStr: ymd, dayAppts });
                                        setDayModalOpen(true);
                                    }}>
                                    <MonthCell dayNumber={arg.dayNumberText} isToday={arg.isToday} isPast={arg.isPast} appts={dayAppts} holidayName={holidayName} />
                                </div>
                            );
                        }
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
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', textAlign: 'center', lineHeight: 1.25 }}>
                                                {holidayName}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', textAlign: 'center', lineHeight: 1.5 }}>
                                                Sem atendimento
                                            </span>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        }
                        
                        return (
                            <div
                                className="flex flex-col items-center p-1 h-full relative cursor-pointer"
                                style={{ width: '100%', ...(hoveredDay === dateStr ? { zIndex: 9999, position: 'relative' } : {}) }}
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
                                        setDayModalFilter('');
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
                                {dayCount > 0 && (() => {
                                    const statusOf = (a: any) => a.operationalStatus || a.status;
                                    const doneCount = dayAppts.filter((a: any) => statusOf(a) === 'completed').length;
                                    // dayCount inclui cancelados e faltas: sem separar, "12/25" parece ter 13 aguardando.
                                    const canceledCount = dayAppts.filter((a: any) => ['canceled', 'cancelled'].includes(statusOf(a))).length;
                                    const missedCount = dayAppts.filter((a: any) => ['missed', 'absent'].includes(statusOf(a))).length;
                                    const pendingCount = Math.max(0, dayCount - doneCount - canceledCount - missedCount);
                                    const pct = Math.round((doneCount / dayCount) * 100);
                                    // Verde = progresso (inclusive em dias passados); cinza = nada feito; verde escuro = dia 100%.
                                    const tone = doneCount === 0
                                        ? { count: 'text-slate-700', pct: 'text-slate-400', fill: 'linear-gradient(90deg,#cbd5e1,#94a3b8)', ring: '#e2e8f0' }
                                        : doneCount === dayCount
                                            ? { count: 'text-emerald-700', pct: 'text-emerald-700', fill: 'linear-gradient(90deg,#10b981,#047857)', ring: '#6ee7b7' }
                                            : { count: 'text-emerald-600', pct: 'text-emerald-600', fill: 'linear-gradient(90deg,#6ee7b7,#10b981)', ring: '#a7f3d0' };
// Legenda: só o que existe no dia. Cada fatia da barra tem a mesma cor do ponto.
                                    const legend = [
                                        { n: doneCount, text: `${doneCount} ${doneCount === 1 ? 'realizado' : 'realizados'}`, full: doneCount === 1 ? 'realizado' : 'realizados', color: '#10b981' },
                                        { n: pendingCount, text: `${pendingCount} aguardando`, full: 'aguardando', color: '#94a3b8' },
                                        { n: missedCount, text: `${missedCount} ${missedCount === 1 ? 'falta' : 'faltas'}`, full: missedCount === 1 ? 'falta' : 'faltas', color: '#f59e0b' },
                                        { n: canceledCount, text: `${canceledCount} ${canceledCount === 1 ? 'cancelado' : 'cancelados'}`, full: canceledCount === 1 ? 'cancelado' : 'cancelados', color: '#f43f5e' },
                                    ].filter((i) => i.n > 0);
                                    const breakdown = legend.map((i) => ` · ${i.n} ${i.full}`).join('');
                                    return (
                                        <div
                                            className="rounded-xl bg-white px-2.5 py-2 pointer-events-none select-none"
                                            style={{
                                                width: '90%', maxWidth: 156, marginTop: 'auto', marginBottom: 'auto',
                                                border: `1px solid ${tone.ring}`,
                                                boxShadow: '0 1px 2px rgba(15,23,42,0.06), 0 4px 10px -4px rgba(15,23,42,0.12)',
                                            }}
                                            title={`${doneCount} de ${dayCount} atendimentos realizados (${pct}%)${breakdown}`}
                                        >
                                            <div className="flex items-baseline justify-center gap-1.5 leading-none whitespace-nowrap">
                                                <span className="flex items-baseline">
                                                    <span className={`text-lg font-extrabold tabular-nums ${tone.count}`}>{doneCount}</span>
                                                    <span className="text-sm font-semibold text-slate-400 tabular-nums">/{dayCount}</span>
                                                </span>
                                                <span className={`text-[10px] font-bold tabular-nums ${tone.pct}`}>{pct}%</span>
                                            </div>
                                            {/* Barra segmentada: feitos | aguardando | faltas | cancelados (proporcional ao total do dia) */}
                                            <div className="mt-1.5 flex w-full overflow-hidden rounded-full" style={{ height: 8, background: '#e5e7eb', boxShadow: 'inset 0 1px 2px rgba(15,23,42,0.12)' }}>
                                                {doneCount > 0 && <div style={{ flex: doneCount, background: tone.fill, minWidth: 6 }} />}
                                                {pendingCount > 0 && <div style={{ flex: pendingCount }} />}
                                                {missedCount > 0 && <div style={{ flex: missedCount, background: '#fbbf24' }} />}
                                                {canceledCount > 0 && <div style={{ flex: canceledCount, background: '#fb7185' }} />}
                                            </div>
                                            {legend.length > 0 && (
                                                <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[10px] font-semibold leading-none text-slate-600">
                                                    {legend.map((i) => (
                                                        <span key={i.full} className="inline-flex items-center gap-1 whitespace-nowrap">
                                                            <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: i.color }} />
                                                            {i.text}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    }}
                    dayHeaderContent={(arg) => (
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            {arg.text.substring(0, 3)}
                        </span>
                    )}
                />
                {showDayByPro && (
                    <DayByProfessional
                        dateStr={fcDate}
                        appts={getAppointmentsByDay(fcDate)}
                        doctors={doctors as any}
                        doctorFilter={agendaFilter.doctor}
                        fetchSlots={onFetchAvailableSlots}
                        onOpen={(a) => openAppointmentDetail(a)}
                        onSlot={permissions.canCreate ? () => handleOpenSchedule(null, 'create') : undefined}
                    />
                )}
            </Paper>

            {featureFlags.showLegendas && calendarView === 'agenda' && (
                // No admin a legenda fica atrás do botão "Legenda" dos filtros; o <style> abaixo continua valendo
                <Box sx={{ display: isAdminMode ? 'none' : 'flex', flexWrap: 'wrap', gap: 3, mt: 3 }}>
                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2, flex: 1, minWidth: 300 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom color="grey.800">
                            📅 Status do Agendamento
                        </Typography>
                        <Typography variant="body2" color="grey.600" sx={{ mb: 2 }}>
                            Indicado pela cor da borda esquerda
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {Object.entries(getOperationalStatusVisualConfigMap()).filter(([status]) => status !== 'absent').map(([status, config]) => {
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

                    <Paper elevation={1} sx={{ p: 3, borderRadius: 2, flex: 1, minWidth: 300 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom color="grey.800">
                            🧩 Tipo de Atendimento
                        </Typography>
                        <Typography variant="body2" color="grey.600" sx={{ mb: 2 }}>
                            Indicado pela cor de fundo do card
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {[
                                { label: 'Particular', bg: 'linear-gradient(135deg, #dcfce7 0%, #86efac 100%)', text: '#047857' },
                                { label: 'Convênio', bg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)', text: '#1d4ed8' },
                                { label: 'Pacote', bg: 'linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 100%)', text: '#7e22ce' },
                                { label: 'Liminar', bg: 'linear-gradient(135deg, #ffedd5 0%, #fdba74 100%)', text: '#c2410c' },
                            ].map((t) => (
                                <Box key={t.label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ width: 44, height: 24, borderRadius: 1, background: t.bg, border: '1px solid rgba(0,0,0,0.08)' }} />
                                    <Typography variant="body2" fontWeight="medium" sx={{ color: t.text }}>
                                        {t.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Pagamento só para quem vê financeiro (o terapeuta da clínica não vê) */}
                    {permissions.canSeeFinancial && (
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
                            Indicado pela etiqueta no rodapé do card
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {Object.entries(getPaymentStatusConfigMap()).map(([status, config]) => {
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
                    )}

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

            <RescheduleDialog
                target={rescheduleTarget}
                onClose={handleRescheduleClose}
                onFetchAvailableSlots={onFetchAvailableSlots}
                onConfirm={handleRescheduleConfirm}
                isHoliday={isHoliday}
                getHolidayName={getHolidayName}
            />

            {cancellationTarget && <AppointmentCancellationModal
                key={cancellationTarget.id} event={cancellationTarget}
                onCancelAppointment={onCancelAppointment}
                onClose={() => setCancellationTarget(null)} />}

            {isAppointmentDetailModalOpen && !cancellationTarget && <AppointmentDetailModal
                isOpen={isAppointmentDetailModalOpen}
                onClose={() => setIsAppointmentDetailModalOpen(false)}
                onCancelAppointment={onCancelAppointment}
                onCompleteAppointment={onCompleteAppointment}
                onEditAppointment={onEditAppointment}
                initialTab={detailInitialTab}
                onRequestReschedule={canReschedule ? (id: string) => {
                    setIsAppointmentDetailModalOpen(false);
                    handleRescheduleById(id);
                } : undefined}
                onConfirmAppointment={onConfirmAppointment}
                onConvertPreAgendamento={onConvertPreAgendamento}
                onRefreshAppointments={onRefreshAppointments}
                event={selectedEvent}
                doctors={doctors}
                patients={patients}
                permissions={permissions}
            />}

            {/* 🆕 PORTAL: Popup do dia — renderiza fora do DOM para ficar acima de tudo */}
            {activePopup && createPortal(
                <div
                    className={`fixed z-[99999] max-h-[600px] overflow-auto bg-white rounded-xl shadow-2xl border border-gray-200 p-3 space-y-3 hidden md:block ${isAdminMode ? 'w-[620px]' : 'w-[460px]'}`}
                    style={{
                        top: activePopup.rect.bottom + 6,
                        left: Math.min(
                            activePopup.rect.left,
                            window.innerWidth - (isAdminMode ? 640 : 480)
                        ),
                    }}
                    onMouseEnter={clearHoverTimeout}
                    onMouseLeave={scheduleHide}
                >
                    <div className="text-xs font-bold text-gray-700 px-1 py-1 border-b border-gray-100">
                        {!isAdminMode && '📅 '}{new Date(activePopup.dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {isAdminMode ? (
                        <DayPreviewList appts={activePopup.dayAppts} convenioName={convenioName} showMoney={permissions.canSeeFinancial}
                            onOpen={(appt) => { clearHoverTimeout(); setHoveredDay(null); setActivePopup(null); openAppointmentDetail(appt); }} />
                    ) : [...activePopup.dayAppts].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map((appt) => (
                        <AppointmentEventCard
                            key={appt._id || appt.id}
                            appointment={appt}
                            timeText={appt.time}
                            variant="premium"
                            onClick={() => openAppointmentDetail(appt)}
                            onConfirm={handleQuickConfirm}
                            onComplete={handleQuickComplete}
                            onReschedule={canReschedule ? (id) => {
                                clearHoverTimeout();
                                setHoveredDay(null);
                                setActivePopup(null);
                                handleRescheduleById(id);
                            } : undefined}
                            onCancelCard={permissions.canCancel ? (id) => {
                                clearHoverTimeout();
                                setHoveredDay(null);
                                setActivePopup(null);
                                openDetailTabById(id, 'cancel');
                            } : undefined}
                            onFinalizeCard={permissions.canComplete ? (id) => {
                                clearHoverTimeout();
                                setHoveredDay(null);
                                setActivePopup(null);
                                openDetailTabById(id, 'confirm');
                            } : undefined}
                        />
                    ))}
                </div>,
                document.body
            )}

            {/* 🆕 MODAL DE DIA — Mobile + Click desktop (acessível sem hover) */}
            {isAdminMode && dayModalOpen && dayModalData && createPortal(
                <DayAgendaModal
                    dateStr={dayModalData.dateStr}
                    appts={getAppointmentsByDay(dayModalData.dateStr)}
                    onClose={() => setDayModalOpen(false)}
                    convenioName={convenioName}
                    showMoney={permissions.canSeeFinancial}
                    actions={{
                        onOpen: (a) => { setDayModalOpen(false); openAppointmentDetail(a); },
                        onReschedule: canReschedule ? (a) => { setDayModalOpen(false); openReschedule(a); } : undefined,
                        onCancel: permissions.canCancel ? (a) => { setDayModalOpen(false); openAppointmentDetail(a, 'cancel'); } : undefined,
                        onFinalize: permissions.canComplete ? (a) => { setDayModalOpen(false); openAppointmentDetail(a, 'confirm'); } : undefined,
                    }}
                />,
                document.body
            )}
            {!isAdminMode && dayModalOpen && dayModalData && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setDayModalOpen(false);
                    }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto flex flex-col">
                        <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-4 border-b border-gray-100">
                            {(() => {
                                const dateObj = new Date(dayModalData.dateStr + 'T12:00:00');
                                const weekdayLong = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                                const weekdayShort = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                                const monthYear = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                                const statusCounts = dayModalData.dayAppts.reduce((acc, a) => {
                                    const st = a.operationalStatus || 'scheduled';
                                    acc[st] = (acc[st] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>);
                                const scheduledCount = (statusCounts.scheduled || 0) + (statusCounts.pre_agendado || 0);
                                const confirmedCount = statusCounts.confirmed || 0;
                                const completedCount = statusCounts.completed || 0;
                                const canceledCount = (statusCounts.canceled || 0) + (statusCounts.absent || 0);
                                const statPills = [
                                    { label: 'agendado', count: scheduledCount, dot: 'bg-blue-500' },
                                    { label: 'confirmado', count: confirmedCount, dot: 'bg-emerald-500' },
                                    { label: 'concluído', count: completedCount, dot: 'bg-green-600' },
                                    { label: 'cancelado', count: canceledCount, dot: 'bg-gray-400' },
                                ].filter(p => p.count > 0);

                                return (
                                    <>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-sm shrink-0">
                                                    <span className="text-3xs font-semibold uppercase leading-none opacity-90">{weekdayShort}</span>
                                                    <span className="text-lg font-bold leading-none mt-0.5">{dateObj.getDate()}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-gray-800 capitalize truncate">{weekdayLong}</h3>
                                                    <p className="text-xs text-gray-500 capitalize truncate">{monthYear}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setDayModalOpen(false)}
                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                                                aria-label="Fechar"
                                            >
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                        {statPills.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                                                {statPills.map(p => (
                                                    <span key={p.label} className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                                                        {p.count} {p.label}{p.count > 1 ? 's' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                            <div className="relative mt-3">
                                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
                                <input
                                    type="text"
                                    value={dayModalFilter}
                                    onChange={(e) => setDayModalFilter(e.target.value)}
                                    placeholder="Buscar paciente pelo nome..."
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>
                        <div className="p-5 space-y-5">
                            {(() => {
                                const query = dayModalFilter.trim().toLowerCase();
                                const filtered = query
                                    ? dayModalData.dayAppts.filter((appt) => {
                                        const name = (appt.patient?.name || appt.patient?.fullName || '').toLowerCase();
                                        return name.includes(query);
                                    })
                                    : dayModalData.dayAppts;

                                if (filtered.length === 0) {
                                    return (
                                        <p className="text-sm text-gray-400 text-center py-6">
                                            Nenhum agendamento encontrado para "{dayModalFilter}".
                                        </p>
                                    );
                                }

                                const getPeriod = (time?: string) => {
                                    const hour = parseInt((time || '00:00').split(':')[0], 10);
                                    if (hour < 12) return 'Manhã';
                                    if (hour < 18) return 'Tarde';
                                    return 'Noite';
                                };
                                const PERIOD_ICON: Record<string, string> = { 'Manhã': '☀️', 'Tarde': '🌤️', 'Noite': '🌙' };

                                const sorted = [...filtered].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                                const groups: { period: string; items: typeof sorted }[] = [];
                                for (const appt of sorted) {
                                    const period = getPeriod(appt.time);
                                    const lastGroup = groups[groups.length - 1];
                                    if (lastGroup && lastGroup.period === period) {
                                        lastGroup.items.push(appt);
                                    } else {
                                        groups.push({ period, items: [appt] });
                                    }
                                }

                                return groups.map((group, idx) => (
                                    <div key={`${group.period}-${idx}`} className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                                            <span>{PERIOD_ICON[group.period]}</span>
                                            {group.period}
                                        </h4>
                                        {group.items.map((appt) => (
                                            <AppointmentEventCard
                                                key={appt._id || appt.id}
                                                appointment={appt}
                                                timeText={appt.time}
                                                variant="premium"
                                                onClick={() => {
                                                    setDayModalOpen(false);
                                                    openAppointmentDetail(appt);
                                                }}
                                                onConfirm={handleQuickConfirm}
                                                onComplete={handleQuickComplete}
                                                onReschedule={canReschedule ? (id) => {
                                                    setDayModalOpen(false);
                                                    handleRescheduleById(id);
                                                } : undefined}
                                                onCancelCard={permissions.canCancel ? (id) => {
                                                    setDayModalOpen(false);
                                                    openDetailTabById(id, 'cancel');
                                                } : undefined}
                                                onFinalizeCard={permissions.canComplete ? (id) => {
                                                    setDayModalOpen(false);
                                                    openDetailTabById(id, 'confirm');
                                                } : undefined}
                                            />
                                        ))}
                                    </div>
                                ));
                            })()}
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
