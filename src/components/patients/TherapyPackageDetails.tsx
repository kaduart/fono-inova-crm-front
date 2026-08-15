import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CalendarDays,
    CheckCircle,
    ChevronRight,
    Clock,
    DollarSign,
    Edit2,
    Edit3,
    Leaf,
    MoreVertical,
    Plus,
    TrendingUp,
    User,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IDoctors, IPatient, ISession } from '../../utils/types/types';
import { mapSessionResponseDTO, sessionDTOToISession } from '../../dtos/session.response.dto';
import { PatientMiniCalendar } from './PatientMiniCalendar';
import { SessionModal } from './SessionModal';
import packageService from '../../services/packageService';

type Props = {
    pack: any;
    onClose: () => void;
    onEdit: () => void;
    onUseSession?: (packId: string, session: any, action: string) => void;
    onRefresh?: () => void;
    patient: IPatient;
    doctors: IDoctors[];
};

const STATUS_STYLES: Record<string, { label: string; text: string; bg: string; border: string; dot: string }> = {
    completed: { label: 'Realizada', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    paid: { label: 'Realizada', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    scheduled: { label: 'Agendada', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
    confirmed: { label: 'Confirmada', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', dot: 'bg-indigo-500' },
    pre_agendado: { label: 'Pré-agendada', text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-500' },
    pending: { label: 'Pendente', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    unpaid: { label: 'Não paga', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
    canceled: { label: 'Cancelada', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
    cancelled: { label: 'Cancelada', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
    missed: { label: 'Faltou', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
};

const normalizeStatus = (status: string): string => {
    if (!status) return 'pending';
    if (status === 'cancelled') return 'canceled';
    if (status === 'pre_agendado') return 'pre_agendado';
    return status;
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    // "2026-08-18" sem hora é interpretado pelo JS como meia-noite UTC, o que
    // em Brasília (−03) exibia o dia ANTERIOR. Ancorar no horário local resolve.
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))
        ? `${dateStr}T00:00:00`
        : dateStr;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
};

const initialSessionState: ISession = {
    _id: '',
    date: '',
    time: '',
    doctorId: '',
    patientId: '',
    package: '',
    sessionType: 'fonoaudiologia',
    status: 'pending',
    paymentAmount: 0,
    paymentMethod: '',
    notes: '',
    isPaid: true,
    confirmedAbsence: false,
};

export default function TherapyPackageDetails({
    pack,
    onClose,
    onEdit,
    onUseSession,
    onRefresh,
    patient,
    doctors,
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);

    // Bulk change
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
    const [bulkDoctorId, setBulkDoctorId] = useState('');
    const [bulkTime, setBulkTime] = useState('');
    const [bulkDayOfWeek, setBulkDayOfWeek] = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    const shiftToWeekday = (dateStr: string, targetDow: number) => {
        const current = new Date(dateStr);
        const currentDay = current.getDay();
        let diff = targetDow - currentDay;
        if (diff <= 0) diff += 7;
        const newDate = new Date(current);
        newDate.setDate(newDate.getDate() + diff);
        return newDate;
    };

    // Transferência de sessões para outro pacote
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferIds, setTransferIds] = useState<string[]>([]);
    const [transferSpecialty, setTransferSpecialty] = useState('');
    const [transferDoctorId, setTransferDoctorId] = useState('');
    const [transferValue, setTransferValue] = useState<string>('');
    const [transferReason, setTransferReason] = useState('');
    const [transferPreview, setTransferPreview] = useState<any>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    // Gerada uma vez por abertura do diálogo: garante que duplo clique no
    // "Confirmar" não crie duas transferências (cobertura dobrada).
    const [transferKey, setTransferKey] = useState('');

    const closeTransferDialog = () => {
        setTransferOpen(false);
        setTransferIds([]);
        setTransferSpecialty('');
        setTransferDoctorId('');
        setTransferValue('');
        setTransferReason('');
        setTransferPreview(null);
        setTransferKey('');
        setTransferSchedule({});
    };

    const openTransferDialog = () => {
        setTransferKey(`transfer_${pack.packageId || pack._id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
        setTransferValue(String(pack.sessionValue ?? ''));
        setTransferOpen(true);
    };

    // Agenda das sessões DESTINO: uma linha por sessão convertida.
    // A data/hora da origem entra como sugestão, mas é editável — o novo
    // profissional pode não estar livre no horário antigo.
    const [transferSchedule, setTransferSchedule] = useState<Record<string, { date: string; time: string }>>({});

    /**
     * <input type="date"> só aceita yyyy-MM-dd. A data da sessão pode vir como
     * ISO, como Date serializado ou já no formato curto — `slice(0,10)` cru
     * falhava silenciosamente e o campo aparecia vazio.
     */
    const toDateInputValue = (value: any): string => {
        if (!value) return '';
        const raw = String(value);
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
        const d = new Date(raw);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const todayInputValue = toDateInputValue(new Date());

    const toggleTransferSession = (appointmentId: string, session?: any) => {
        setTransferPreview(null);
        setTransferIds(prev => {
            if (prev.includes(appointmentId)) {
                setTransferSchedule(s => {
                    const next = { ...s };
                    delete next[appointmentId];
                    return next;
                });
                return prev.filter(id => id !== appointmentId);
            }
            // Sugestão: mesma data/hora da origem — mas só se ainda for futura.
            // Sugerir data passada seria sugerir algo que o backend recusa.
            const originDate = toDateInputValue(session?.date);
            const suggestedDate = originDate && originDate >= todayInputValue ? originDate : '';
            setTransferSchedule(s => ({
                ...s,
                [appointmentId]: { date: suggestedDate, time: session?.time || '' },
            }));
            return [...prev, appointmentId];
        });
    };

    const updateTransferSlot = (appointmentId: string, field: 'date' | 'time', value: string) => {
        setTransferPreview(null);
        setTransferSchedule(prev => ({
            ...prev,
            [appointmentId]: { ...(prev[appointmentId] || { date: '', time: '' }), [field]: value },
        }));
    };

    const buildSchedulePayload = () => transferIds.map(id => ({
        sourceAppointmentId: id,
        date: transferSchedule[id]?.date || '',
        time: transferSchedule[id]?.time || '',
    }));

    const scheduleComplete = transferIds.length > 0
        && transferIds.every(id => transferSchedule[id]?.date && transferSchedule[id]?.time);

    const handleTransferPreview = async () => {
        setTransferLoading(true);
        try {
            const data = await packageService.previewTransfer(pack.packageId || pack._id, {
                appointmentIds: transferIds,
                target: {
                    specialty: transferSpecialty,
                    doctorId: transferDoctorId,
                    sessionValue: Number(transferValue) || undefined,
                    schedule: buildSchedulePayload(),
                },
            });
            setTransferPreview(data);
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao simular transferência');
        } finally {
            setTransferLoading(false);
        }
    };

    const handleTransferConfirm = async () => {
        setTransferLoading(true);
        try {
            const result = await packageService.transferSessions(pack.packageId || pack._id, {
                appointmentIds: transferIds,
                target: {
                    specialty: transferSpecialty,
                    doctorId: transferDoctorId,
                    sessionValue: Number(transferValue) || undefined,
                    schedule: buildSchedulePayload(),
                },
                reason: transferReason.trim(),
                idempotencyKey: transferKey,
            });
            toast.success(result?.message || 'Sessões transferidas com sucesso');
            closeTransferDialog();
            onRefresh?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao transferir sessões');
        } finally {
            setTransferLoading(false);
        }
    };

    const closeBulkDialog = () => {
        setBulkOpen(false);
        setBulkPreviewOpen(false);
        setBulkDoctorId('');
        setBulkTime('');
        setBulkDayOfWeek('');
    };

    // Session view
    const [sessionView, setSessionView] = useState<'list' | 'calendar'>('list');
    const [modalAction, setModalAction] = useState<'edit' | 'use' | null>(null);
    const [selectedSession, setSelectedSession] = useState<ISession>(initialSessionState);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(false);

    const sessions = useMemo(() => pack.sessions || [], [pack.sessions]);

    const bulkAffectedSessions = useMemo(() => {
        return sessions
            .filter((s: any) => {
                const ns = normalizeStatus(s.status);
                return ['pre_agendado', 'scheduled', 'pending', 'unpaid'].includes(ns);
            })
            .sort((a: any, b: any) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
    }, [sessions]);

    /**
     * Sessões que podem ser transferidas: contratadas e NÃO realizadas.
     * Inclui as já canceladas de propósito — é o caso comum, a secretária
     * cancela antes de saber que haveria conversão. Realizadas nunca entram:
     * o atendimento aconteceu e a cobertura foi consumida.
     */
    const transferableSessions = useMemo(() => {
        return sessions
            .filter((s: any) => {
                const ns = normalizeStatus(s.status);
                const notDelivered = !['completed', 'paid'].includes(ns);
                const hasAppointment = Boolean(s.appointmentId);
                const notTransferred = !s.transferId;
                return notDelivered && hasAppointment && notTransferred;
            })
            .sort((a: any, b: any) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
    }, [sessions]);

    const bulkSelectedDoctor = doctors.find(d => d._id === bulkDoctorId);
    const bulkDayOfWeekLabel: Record<number, string> = {
        0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
        4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado',
    };

    const counts = useMemo(() => {
        const done = Number(pack.sessionsDone ?? 0);
        const canceled = Number(pack.sessionsCanceled ?? 0);
        const scheduled = sessions.filter((s: any) => {
            const ns = normalizeStatus(s.status);
            return ['scheduled', 'confirmed', 'pre_agendado', 'pending', 'unpaid'].includes(ns);
        }).length;
        return {
            total: Number(pack.totalSessions ?? 0),
            done,
            scheduled,
            canceled,
            remaining: Math.max((pack.totalSessions ?? 0) - done - scheduled - canceled, 0),
        };
    }, [pack.totalSessions, pack.sessionsDone, pack.sessionsCanceled, sessions]);

    const totalValue = Number(pack.totalValue ?? 0);
    const totalPaid = Number(pack.totalPaid ?? 0);
    const balance = Number(pack.balance ?? 0);
    const pendingValue = Math.max(totalValue - totalPaid, 0);
    const hasCredit = balance < 0;

    const financialState = useMemo(() => {
        if (pack.financialStatus === 'paid_with_credit' || (totalPaid >= totalValue && totalValue > 0)) {
            return { key: 'paid', label: 'Quitado', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle };
        }
        if (totalPaid === 0 && totalValue > 0) {
            return { key: 'reserved', label: 'Aguardando pagamento', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Clock };
        }
        if (totalPaid > 0 && totalPaid < totalValue) {
            return { key: 'partial', label: 'Pago parcial', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: DollarSign };
        }
        return { key: 'unknown', label: '—', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: TrendingUp };
    }, [pack.financialStatus, totalPaid, totalValue]);

    const FinancialIcon = financialState.icon;

    const progressPct = counts.total > 0 ? Math.round(((counts.done + counts.canceled) / counts.total) * 100) : 0;
    const donePct = counts.total > 0 ? (counts.done / counts.total) * 100 : 0;
    const scheduledPct = counts.total > 0 ? (counts.scheduled / counts.total) * 100 : 0;
    const canceledPct = counts.total > 0 ? (counts.canceled / counts.total) * 100 : 0;

    const packageId = pack.packageId || pack._id;

    const openSessionModal = (action: 'edit' | 'use', session?: ISession) => {
        setModalAction(action);

        const context = {
            doctorId: pack.doctorId || pack.doctor?._id?.toString?.() || pack.doctor?.toString?.() || '',
            patientId: pack.patientId || pack.patient?._id?.toString?.() || pack.patient?.toString?.() || '',
            packageId,
            sessionValue: typeof pack.sessionValue === 'number' ? pack.sessionValue : 0,
            sessionType: pack.sessionType || pack.specialty || '',
        };

        if (!session) {
            // Sessão nova (botão "Nova Sessão"): pré-preenche paciente/profissional/pacote/
            // especialidade do próprio pack — sem isso o payload ia sem patientId/doctorId
            // e a criação falhava silenciosamente lá na frente.
            setSelectedSession({
                ...initialSessionState,
                doctorId: context.doctorId,
                patientId: context.patientId,
                package: packageId,
                sessionType: context.sessionType,
            });
            setIsSessionModalOpen(true);
            return;
        }

        const dto = mapSessionResponseDTO(session, context);
        const normalized = sessionDTOToISession(dto);
        if (session.appointmentId) {
            normalized.appointmentId = session.appointmentId;
        }
        setSelectedSession(normalized);
        setIsSessionModalOpen(true);
    };

    const handleSessionSubmit = async () => {
        const payload = {
            ...selectedSession,
            package: packageId,
            sessionType: pack.sessionType,
            serviceType: 'package_session',
        };

        setSessionLoading(true);
        try {
            if (onUseSession) {
                await onUseSession(packageId, payload, modalAction || 'edit');
            }
            toast.success(modalAction === 'edit' ? 'Sessão atualizada!' : 'Sessão registrada!');
            setIsSessionModalOpen(false);
            setSelectedSession(initialSessionState);
            onRefresh?.();
        } catch (err: any) {
            console.error('Erro:', err);
            const apiMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
            toast.error(apiMessage || 'Erro ao salvar sessão');
        } finally {
            setSessionLoading(false);
        }
    };

    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a: any, b: any) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
            if (Number.isNaN(dateA)) return 1;
            if (Number.isNaN(dateB)) return -1;
            if (dateA !== dateB) return dateA - dateB;
            return (a.time || '').localeCompare(b.time || '');
        });
    }, [sessions]);

    const calendarEvents = useMemo(() => {
        return sortedSessions
            .map((s: any) => {
                const ns = normalizeStatus(s.status);
                const parsedDate = new Date(s.date);
                if (isNaN(parsedDate.getTime())) return null;
                const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
                return {
                    _id: s._id,
                    start: `${isoDate}T${s.time || '08:00'}`,
                    operationalStatus: ns === 'pending' ? 'scheduled' : ns,
                    doctor: s.doctor || { fullName: s.professionalName || '—' },
                    patient: patient,
                    __session: s,
                };
            })
            .filter(Boolean);
    }, [sortedSessions, patient]);

    const openBulk = async () => {
        try {
            let loadedSessions: any[] = sessions;
            if (loadedSessions.length === 0) {
                loadedSessions = await packageService.getPackageSessions(packageId);
            }
            const first = loadedSessions.find((s: any) => {
                const ns = normalizeStatus(s.status);
                return ['pre_agendado', 'scheduled', 'pending', 'unpaid'].includes(ns);
            });
            if (first) {
                setBulkDoctorId(first.doctor?._id || first.doctorId || '');
                setBulkTime(first.time || '');
            }
        } catch {
            // silencioso — abre sem pré-preenchimento
        }
        setBulkOpen(true);
    };

    const saveBulk = async () => {
        if (!bulkDoctorId && !bulkTime && !bulkDayOfWeek) return;
        setBulkSaving(true);
        try {
            const patch: { doctorId?: string; time?: string; dayOfWeek?: number } = {};
            if (bulkDoctorId) patch.doctorId = bulkDoctorId;
            if (bulkTime) patch.time = bulkTime;
            if (bulkDayOfWeek !== '') patch.dayOfWeek = parseInt(bulkDayOfWeek);
            const result = await packageService.bulkUpdateAppointments(packageId, patch);
            const parts: string[] = [];
            if (bulkDoctorId) parts.push('terapeuta');
            if (bulkTime) parts.push('horário');
            if (bulkDayOfWeek !== '') parts.push('dia da semana');
            toast.success(`${parts.join(', ')} atualizado(s) em ${result.updated} sessão(ões) pendente(s)`);
            closeBulkDialog();
            onRefresh?.();
        } catch {
            toast.error('Erro ao atualizar sessões pendentes');
        } finally {
            setBulkSaving(false);
        }
    };

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 sm:p-4 backdrop-blur-sm">
            <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto max-w-full sm:max-w-[min(1000px,94vw)] max-h-[100dvh] sm:max-h-[min(90vh,920px)] overflow-hidden flex flex-col border border-gray-200">
                {/* Header — identidade do contexto como accent, não como faixa pesada */}
                <div className="px-4 sm:px-6 py-3.5 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                            <Leaf className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">Detalhes do Pacote</h2>
                            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">
                                {(pack.sessionType || 'Terapia').replace(/_/g, ' ')} • {counts.total} sessões
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${financialState.bg} ${financialState.border} border ${financialState.color}`}>
                                    <FinancialIcon className="w-3 h-3" />
                                    {financialState.label}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(v => !v)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            {menuOpen && (
                                <div
                                    className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl py-1 min-w-[140px] z-10 border border-gray-100"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <button
                                        onClick={onEdit}
                                        className="flex items-center gap-2 w-full text-left text-xs font-medium px-4 py-2 hover:bg-slate-50 text-gray-700"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar pacote
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content — único scroll principal do modal */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5
                    [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                    {/* Resumo em cards estilo Convênio */}
                    <div className="grid grid-cols-3 gap-2.5">
                        {[
                            { label: 'Total', value: counts.total, color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-100' },
                            { label: 'Realizadas', value: counts.done, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                            { label: 'Agendadas', value: counts.scheduled, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                            ...(counts.canceled > 0 ? [{ label: 'Canceladas', value: counts.canceled, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' }] : []),
                        ].map(item => (
                            <div
                                key={item.label}
                                className={`${item.bg} ${item.border} border px-3 py-2.5 rounded-xl text-center transition-colors hover:opacity-90`}
                            >
                                <div className={`text-xl font-bold ${item.color} leading-tight`}>{item.value}</div>
                                <div className="text-xs font-medium text-gray-500">{item.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Progresso empilhado estilo Liminar */}
                    <div className="space-y-2 rounded-xl border border-gray-100 px-3.5 py-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700">Progresso</span>
                            <span className="text-sm font-bold text-gray-700">{counts.done}/{counts.total} ({progressPct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${donePct}%` }} />
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${scheduledPct}%` }} />
                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${canceledPct}%` }} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-gray-600"><b>{counts.done}</b> realizadas</span>
                            </span>
                            {counts.scheduled > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-gray-600"><b>{counts.scheduled}</b> agendadas</span>
                                </span>
                            )}
                            {counts.canceled > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-gray-600"><b>{counts.canceled}</b> canceladas</span>
                                </span>
                            )}
                            {counts.remaining > 0 && (
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                                    <span className="text-gray-600"><b>{counts.remaining}</b> restantes</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Summary financeiro em cards estilo Liminar */}
                    {totalValue > 0 && (
                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/40">
                            <div className="flex items-center gap-2 mb-2.5">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-bold text-gray-800">Resumo Financeiro</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="bg-white rounded-lg px-3 py-2.5 text-left border border-gray-100">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Contratado</span>
                                    <span className="text-sm font-bold text-gray-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                                    </span>
                                </div>
                                <div className="bg-white rounded-lg px-3 py-2.5 text-left border border-gray-100">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Pago</span>
                                    <span className="text-sm font-bold text-emerald-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}
                                    </span>
                                </div>
                                <div className="bg-white rounded-lg px-3 py-2.5 text-left border border-gray-100">
                                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{hasCredit ? 'Crédito' : 'Pendente'}</span>
                                    <span className={`text-sm font-bold ${hasCredit ? 'text-blue-600' : pendingValue > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(hasCredit ? balance : pendingValue))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de pagamentos */}
                    {pack.payments && pack.payments.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-600" />
                                Pagamentos registrados
                            </h4>
                            <div className="space-y-2">
                                {pack.payments.map((payment: any, index: number) => (
                                    <div
                                        key={payment._id || index}
                                        className="flex justify-between items-center px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 text-sm"
                                    >
                                        <span className="text-gray-500">
                                            {new Date(payment.paymentDate || payment.date).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista / Calendário de sessões */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-600" />
                                Sessões
                            </h4>
                            <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-0.5">
                                {[
                                    { key: 'list', label: 'Lista' },
                                    { key: 'calendar', label: 'Calendário' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        onClick={() => setSessionView(key as any)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                            sessionView === key
                                                ? 'bg-white text-emerald-700 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {sessions.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Nenhuma sessão registrada neste pacote.</p>
                            </div>
                        ) : sessionView === 'list' ? (
                            <div className="space-y-2">
                                {sortedSessions.map((session: any, idx: number) => {
                                    const ns = normalizeStatus(session.status);
                                    const cfg = STATUS_STYLES[ns] || STATUS_STYLES.pending;
                                    const doctorName = session.doctor?.fullName || session.professionalName || doctors.find(d => d._id === session.doctorId)?.fullName || '—';
                                    return (
                                        <button
                                            key={session._id || session.sessionId || idx}
                                            onClick={() => openSessionModal('edit', session)}
                                            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {formatDate(session.date)}{session.time ? ` às ${session.time}` : ''}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{doctorName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                                                    {cfg.label}
                                                </span>
                                                <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                    <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="min-h-[480px]">
                                <PatientMiniCalendar
                                    appointments={calendarEvents as any}
                                    onEventClick={(appt: any) => openSessionModal('edit', appt.__session)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer — sticky, fora da área de scroll */}
                <div className="bg-white px-4 sm:px-6 py-3.5 border-t border-gray-200 shrink-0 sticky bottom-0 z-10">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={openBulk}
                                className="px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <Users className="w-4 h-4 shrink-0" />
                                Alterar sessões pendentes
                            </button>
                            {transferableSessions.length > 0 && (
                                <button
                                    onClick={openTransferDialog}
                                    title="Usar sessões não realizadas deste pacote em outra especialidade, sem cobrar de novo"
                                    className="px-4 py-2.5 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                >
                                    <ArrowRight className="w-4 h-4 shrink-0" />
                                    Transferir sessões
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-col sm:flex-row">
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => openSessionModal('use')}
                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors font-medium text-sm flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                                <Plus className="w-4 h-4" />
                                Nova Sessão
                            </button>
                            <button
                                onClick={onEdit}
                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-semibold text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Dialog: Alterar sessões pendentes */}
        {bulkOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 text-white flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm shrink-0">
                                <Edit3 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-base truncate">
                                    {bulkPreviewOpen ? 'Revisar alterações' : 'Alterar sessões pendentes'}
                                </h3>
                                <p className="text-xs text-emerald-100 opacity-90 mt-0.5 truncate">
                                    {bulkPreviewOpen
                                        ? 'Confira o impacto antes de confirmar'
                                        : 'Apenas sessões futuras serão alteradas'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={closeBulkDialog}
                            disabled={bulkSaving}
                            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-center gap-2 text-xs">
                        <span className={`flex items-center gap-1.5 font-medium ${!bulkPreviewOpen ? 'text-emerald-700' : 'text-emerald-600'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${!bulkPreviewOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-200 text-emerald-700'}`}>1</span>
                            Escolher alterações
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-300" />
                        <span className={`flex items-center gap-1.5 font-medium ${bulkPreviewOpen ? 'text-emerald-700' : 'text-gray-400'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${bulkPreviewOpen ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</span>
                            Revisar impacto
                        </span>
                    </div>

                    {/* Summary cards */}
                    <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-white">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                            <p className="text-xl font-bold text-emerald-700">{bulkAffectedSessions.length}</p>
                            <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold mt-0.5">Sessões afetadas</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                            <p className="text-sm font-semibold text-gray-700 truncate">
                                {bulkAffectedSessions.length > 0
                                    ? `${formatDate(bulkAffectedSessions[0].date)} – ${formatDate(bulkAffectedSessions[bulkAffectedSessions.length - 1].date)}`
                                    : '—'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-0.5">Período</p>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                            <p className="text-sm font-semibold text-gray-700 truncate">
                                {bulkAffectedSessions.length > 0
                                    ? (bulkAffectedSessions[0].doctor?.fullName
                                        || bulkAffectedSessions[0].professionalName
                                        || doctors.find(d => d._id === bulkAffectedSessions[0].doctorId)?.fullName
                                        || '—')
                                    : '—'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mt-0.5">Profissional atual</p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-2 overflow-y-auto">
                        {!bulkPreviewOpen ? (
                            <div className="space-y-4">
                                {/* Profissional */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Profissional <span className="text-gray-400 font-normal">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={bulkDoctorId}
                                            onChange={e => setBulkDoctorId(e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none"
                                        >
                                            <option value="">Manter atual</option>
                                            {doctors
                                                .filter(d => {
                                                    const target = (pack.sessionType || '').toLowerCase();
                                                    const allowed = [d.specialty, ...((d as any).specialties || [])].map((s: any) => (s || '').toLowerCase());
                                                    return !target || allowed.includes(target);
                                                })
                                                .map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>

                                {/* Dia da semana */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Dia da semana <span className="text-gray-400 font-normal">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <select
                                            value={bulkDayOfWeek}
                                            onChange={e => setBulkDayOfWeek(e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white appearance-none"
                                        >
                                            <option value="">Manter dia atual</option>
                                            <option value="1">Segunda-feira</option>
                                            <option value="2">Terça-feira</option>
                                            <option value="3">Quarta-feira</option>
                                            <option value="4">Quinta-feira</option>
                                            <option value="5">Sexta-feira</option>
                                            <option value="6">Sábado</option>
                                            <option value="0">Domingo</option>
                                        </select>
                                    </div>
                                    {bulkDayOfWeek !== '' && (
                                        <p className="text-xs text-gray-500 mt-1.5 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                            Cada sessão será movida para a próxima ocorrência desse dia após sua data atual.
                                        </p>
                                    )}
                                </div>

                                {/* Horário */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                        Horário <span className="text-gray-400 font-normal">(opcional)</span>
                                    </label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="time"
                                            value={bulkTime}
                                            onChange={e => setBulkTime(e.target.value)}
                                            className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Sessões <strong>realizadas</strong> ou <strong>confirmadas</strong> não serão alteradas. Preencha pelo menos um campo para prosseguir.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Applied changes summary */}
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 space-y-2">
                                    <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                                        <Edit3 className="w-4 h-4" />
                                        Alterações escolhidas
                                    </p>
                                    {bulkDoctorId && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Profissional</span>
                                            <span className="font-medium text-gray-800">{bulkSelectedDoctor?.fullName || '—'}</span>
                                        </div>
                                    )}
                                    {bulkTime && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Horário</span>
                                            <span className="font-medium text-gray-800">{bulkTime}</span>
                                        </div>
                                    )}
                                    {bulkDayOfWeek !== '' && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Dia da semana</span>
                                            <span className="font-medium text-gray-800">{bulkDayOfWeekLabel[parseInt(bulkDayOfWeek)]}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Affected list */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                        Impacto linha a linha
                                    </p>
                                    <div className="max-h-[260px] overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                                        {bulkAffectedSessions.map((session: any, idx: number) => {
                                            const currentDate = (session.date || '').substring(0, 10);
                                            const newDate = bulkDayOfWeek !== ''
                                                ? shiftToWeekday(currentDate, parseInt(bulkDayOfWeek))
                                                : null;
                                            const currentDoctor = session.doctor?.fullName || session.professionalName || doctors.find(d => d._id === session.doctorId)?.fullName || '—';
                                            const newDoctor = bulkDoctorId ? bulkSelectedDoctor?.fullName : currentDoctor;
                                            return (
                                                <div
                                                    key={session._id || session.sessionId || idx}
                                                    className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-gray-500">
                                                            {formatDate(currentDate)} às {session.time || '—'}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 text-sm text-gray-800 mt-0.5">
                                                            <span className="truncate">{currentDoctor}</span>
                                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                            <span className="font-medium truncate">
                                                                {newDate ? formatDate(newDate.toISOString()) : (bulkTime || currentDate)}
                                                                {bulkTime && !newDate ? ` às ${bulkTime}` : ''}
                                                                {newDate && bulkTime ? ` às ${bulkTime}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                        {!bulkPreviewOpen ? (
                            <>
                                <button
                                    onClick={closeBulkDialog}
                                    disabled={bulkSaving}
                                    className="px-5 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => setBulkPreviewOpen(true)}
                                    disabled={(!bulkDoctorId && !bulkTime && !bulkDayOfWeek) || bulkAffectedSessions.length === 0}
                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 transition-all font-medium text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Revisar alterações
                                    <span className="bg-white bg-opacity-20 px-1.5 py-0.5 rounded-full text-xs">
                                        {bulkAffectedSessions.length}
                                    </span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setBulkPreviewOpen(false)}
                                    disabled={bulkSaving}
                                    className="px-5 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition-colors font-medium text-sm"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={saveBulk}
                                    disabled={bulkSaving}
                                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 transition-all font-medium text-sm shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {bulkSaving ? 'Salvando...' : 'Confirmar alteração'}
                                    {!bulkSaving && <CheckCircle className="w-4 h-4" />}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Dialog: Transferir sessões para outro pacote */}
        {transferOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
                    <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-7 py-5 text-white flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm shrink-0">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-lg truncate">Transferir sessões</h3>
                                <p className="text-xs text-violet-100 opacity-90 mt-0.5">
                                    Sessões já pagas e não realizadas mudam de especialidade
                                </p>
                            </div>
                        </div>
                        <button onClick={closeTransferDialog} className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-7 py-6 overflow-y-auto">
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs text-violet-900 mb-6">
                            O pacote atual continua com <strong>{pack.totalSessions} sessões</strong> e{' '}
                            <strong>R$ {Number(pack.totalPaid ?? 0).toFixed(2)}</strong> recebidos, na data original.
                            Nada é cobrado de novo e <strong>nenhum valor entra no caixa</strong>.
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* ─── Coluna esquerda: origem e destino ─── */}
                        <div className="space-y-5">
                        {/* 1. Sessões */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                1. Quais sessões mudam de destino?
                            </label>
                            <div className="border border-gray-200 rounded-xl divide-y max-h-52 overflow-y-auto">
                                {transferableSessions.map((s: any) => {
                                    const apptId = String(s.appointmentId);
                                    const checked = transferIds.includes(apptId);
                                    const ns = normalizeStatus(s.status);
                                    const style = STATUS_STYLES[ns] || STATUS_STYLES.pending;
                                    return (
                                        <label key={apptId} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleTransferSession(apptId, s)}
                                                className="w-4 h-4 accent-violet-600"
                                            />
                                            <span className="text-sm text-gray-800 flex-1">
                                                {formatDate(s.date)} {s.time ? `às ${s.time}` : ''}
                                            </span>
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                                                {style.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Sessões já realizadas não aparecem — o atendimento aconteceu e a cobertura foi usada.
                            </p>
                        </div>

                        {/* 2. Destino */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">2. Nova especialidade</label>
                                <select
                                    value={transferSpecialty}
                                    onChange={(e) => { setTransferSpecialty(e.target.value); setTransferDoctorId(''); setTransferPreview(null); }}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="">Selecione</option>
                                    {['fonoaudiologia', 'psicologia', 'terapia_ocupacional', 'fisioterapia', 'psicomotricidade', 'musicoterapia', 'psicopedagogia', 'neuropsicologia']
                                        .filter(s => s !== pack.sessionType)
                                        .map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Profissional</label>
                                <select
                                    value={transferDoctorId}
                                    onChange={(e) => { setTransferDoctorId(e.target.value); setTransferPreview(null); }}
                                    disabled={!transferSpecialty}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
                                >
                                    <option value="">Selecione</option>
                                    {doctors
                                        .filter(d => {
                                            if (!transferSpecialty) return false;
                                            const allowed = [d.specialty, ...((d as any).specialties || [])].map((x: any) => (x || '').toLowerCase());
                                            return allowed.includes(transferSpecialty.toLowerCase());
                                        })
                                        .map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor por sessão no novo pacote</label>
                            <input
                                type="number" min="0" step="0.01"
                                value={transferValue}
                                onChange={(e) => { setTransferValue(e.target.value); setTransferPreview(null); }}
                                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Origem: R$ {Number(pack.sessionValue ?? 0).toFixed(2)}/sessão. Valor diferente gera saldo a pagar ou sobra.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                4. Motivo <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={2} maxLength={500}
                                value={transferReason}
                                onChange={(e) => setTransferReason(e.target.value)}
                                placeholder="Ex.: mudança terapêutica definida pela equipe"
                                className={`w-full p-2.5 border rounded-lg text-sm ${transferPreview && !transferReason.trim()
                                    ? 'border-amber-400 bg-amber-50'
                                    : 'border-gray-300'}`}
                            />
                            {transferPreview && !transferReason.trim() && (
                                <p className="text-xs text-amber-700 mt-1 font-medium">
                                    Obrigatório para confirmar — fica registrado na transferência.
                                </p>
                            )}
                        </div>
                        </div>

                        {/* ─── Coluna direita: agenda das novas sessões ─── */}
                        <div className="space-y-5">
                        {transferIds.length === 0 || !transferSpecialty || !transferDoctorId ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-200 px-5 py-10 text-center">
                                <CalendarDays className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 font-medium">Agenda do novo pacote</p>
                                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                                    Selecione as sessões, a especialidade e o profissional para definir as novas datas.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-baseline justify-between mb-1">
                                    <label className="text-sm font-semibold text-gray-700">
                                        3. Agendar sessões no novo pacote
                                    </label>
                                    <span className={`text-xs font-medium ${scheduleComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {transferIds.filter(id => transferSchedule[id]?.date && transferSchedule[id]?.time).length}/{transferIds.length} preenchidas
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-3">
                                    Ajuste conforme a disponibilidade de {doctors.find(d => d._id === transferDoctorId)?.fullName || 'o profissional'}.
                                </p>

                                <div className="space-y-2">
                                    {transferIds.map((apptId) => {
                                        const origin = transferableSessions.find((s: any) => String(s.appointmentId) === apptId);
                                        const slot = transferSchedule[apptId] || { date: '', time: '' };
                                        const incomplete = !slot.date || !slot.time;
                                        const originPassed = origin?.date && toDateInputValue(origin.date) < todayInputValue;
                                        return (
                                            <div
                                                key={apptId}
                                                className={`rounded-xl border px-3.5 py-3 transition-colors ${incomplete ? 'border-amber-300 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/40'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[11px] text-gray-500 truncate">
                                                        Origem: <strong className="text-gray-700">{formatDate(origin?.date)}</strong>
                                                        {origin?.time ? ` às ${origin.time}` : ''}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 shrink-0">
                                                        cancelada
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-[1fr,7.5rem] gap-2">
                                                    <div>
                                                        <span className="block text-[11px] text-gray-500 mb-0.5">Nova data</span>
                                                        <input
                                                            type="date"
                                                            min={todayInputValue}
                                                            value={slot.date}
                                                            onChange={(e) => updateTransferSlot(apptId, 'date', e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="block text-[11px] text-gray-500 mb-0.5">Horário</span>
                                                        <input
                                                            type="time"
                                                            value={slot.time}
                                                            onChange={(e) => updateTransferSlot(apptId, 'time', e.target.value)}
                                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                {originPassed && !slot.date && (
                                                    <p className="text-[11px] text-amber-700 mt-1.5">
                                                        A data original já passou — escolha uma nova.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        {transferPreview && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1.5 text-sm">
                                <p className="font-semibold text-emerald-900">Confira antes de confirmar</p>
                                <p className="text-emerald-800">
                                    {transferPreview.sessionCount} sessão(ões) de {String(pack.sessionType || '').replace(/_/g, ' ')} serão convertidas
                                </p>
                                <p className="text-emerald-800">
                                    {transferPreview.targetPackagesToCreate ?? 1} pacote de {transferSpecialty.replace(/_/g, ' ')} será criado
                                </p>
                                <p className="text-emerald-800">
                                    {transferPreview.newAppointmentsCount ?? 0} novo(s) agendamento(s) serão criados
                                </p>
                                <p className="text-emerald-800">
                                    R$ {Number(transferPreview.amount).toFixed(2)} de cobertura já paga
                                </p>
                                <p className="text-emerald-800 font-semibold">R$ 0,00 de entrada nova no caixa</p>
                                <p className="text-emerald-800">
                                    {transferPreview.completedUntouched} sessão(ões) realizada(s) não serão alteradas
                                </p>

                                {Array.isArray(transferPreview.newAppointments) && transferPreview.newAppointments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-emerald-200 space-y-1">
                                        <p className="font-semibold text-emerald-900 text-xs">Novos agendamentos</p>
                                        {transferPreview.newAppointments.map((a: any, idx: number) => (
                                            <p key={idx} className="text-emerald-800 text-xs">
                                                {formatDate(a.date)} às {a.time} — {String(a.specialty || '').replace(/_/g, ' ')} — {doctors.find(d => d._id === a.doctorId)?.fullName || '—'}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {transferPreview.willRestamp > 0 && (
                                    <p className="text-emerald-800">
                                        {transferPreview.willRestamp} já cancelada(s) serão reaproveitadas e deixarão de constar como falta
                                    </p>
                                )}
                                {transferPreview.shortfall > 0 && (
                                    <p className="text-amber-800 bg-amber-100 rounded px-2 py-1 mt-1">
                                        Faltam R$ {Number(transferPreview.shortfall).toFixed(2)} — o novo pacote nasce com saldo a receber.
                                    </p>
                                )}
                                {transferPreview.surplus > 0 && (
                                    <p className="text-amber-800 bg-amber-100 rounded px-2 py-1 mt-1">
                                        Sobram R$ {Number(transferPreview.surplus).toFixed(2)} de cobertura não utilizada.
                                    </p>
                                )}
                            </div>
                        )}
                        </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-7 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
                        {/* Diz o que falta, em vez de só desabilitar o botão em silêncio */}
                        <p className="text-xs text-amber-700 font-medium min-h-[1rem]">
                            {!transferPreview
                                ? (transferIds.length === 0 ? 'Selecione ao menos uma sessão'
                                    : !transferSpecialty ? 'Escolha a especialidade de destino'
                                        : !transferDoctorId ? 'Escolha o profissional'
                                            : !scheduleComplete ? 'Preencha data e horário de todas as sessões'
                                                : null)
                                : (!transferReason.trim() ? 'Informe o motivo para poder confirmar' : null)}
                        </p>
                        <div className="flex items-center gap-2">
                        <button onClick={closeTransferDialog} className="px-5 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-100 text-sm font-medium">
                            Cancelar
                        </button>
                        {!transferPreview ? (
                            <button
                                onClick={handleTransferPreview}
                                title={!scheduleComplete ? 'Preencha data e horário de todas as sessões' : ''}
                                disabled={transferLoading || transferIds.length === 0 || !transferSpecialty || !transferDoctorId || !scheduleComplete}
                                className="px-5 py-2.5 bg-violet-600 text-white rounded-full hover:bg-violet-700 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {transferLoading ? 'Simulando...' : 'Revisar transferência'}
                                {!transferLoading && <ArrowRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <button
                                onClick={handleTransferConfirm}
                                disabled={transferLoading || !transferReason.trim()}
                                title={!transferReason.trim() ? 'Informe o motivo' : ''}
                                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full hover:from-violet-700 hover:to-purple-700 text-sm font-medium disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {transferLoading ? 'Transferindo...' : 'Confirmar transferência'}
                                {!transferLoading && <CheckCircle className="w-4 h-4" />}
                            </button>
                        )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal de edição de sessão */}
        {isSessionModalOpen && modalAction && (
            <SessionModal
                key={selectedSession._id || 'new'}
                action={modalAction}
                onClose={() => {
                    setIsSessionModalOpen(false);
                    setSelectedSession(initialSessionState);
                }}
                doctors={doctors}
                onSessionDataChange={(data) => setSelectedSession(data)}
                onSubmit={handleSessionSubmit}
                loading={sessionLoading}
                sessionData={selectedSession}
            />
        )}
      </>
    );
}
