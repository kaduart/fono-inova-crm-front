import { ptBR } from 'date-fns/locale';
import { Calendar, CheckCircle, ClipboardCheck, Clock, DollarSign, PencilIcon, Stethoscope, User, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { IDoctor, SelectedEvent } from '../../utils/types/types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';

interface AppointmentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctors: IDoctor[];
    event?: SelectedEvent;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    patients?: any[];
    onCancelAdvancedSession?: (sessionId: string) => void;
}

// 🔧 SISTEMA DE TRADUÇÃO DE STATUS
const STATUS_TRANSLATIONS = {
    operational: {
        'scheduled': 'agendado',
        'confirmed': 'confirmado',
        'in_progress': 'em_andamento',
        'completed': 'concluído',
        'canceled': 'cancelado',
        'absent': 'faltou',
        'no_show': 'faltou'
    },
    clinical: {
        'pending': 'pendente',
        'in_progress': 'em_andamento',
        'completed': 'concluído',
        'cancelled': 'cancelado',
        'no_show': 'faltou'
    },
    payment: {
        'paid': 'pago',
        'package_paid': 'pacote_pago',
        'partial': 'parcial',
        'advanced': 'adiantado',
        'pending': 'pendente',
        'canceled': 'cancelado'
    }
};

// 🔧 CONFIGURAÇÃO VISUAL EM PORTUGUÊS
const STATUS_VISUAL_CONFIG = {
    operational: {
        'agendado': { label: 'Agendado', color: '#3b82f6', icon: Clock },
        'confirmado': { label: 'Confirmado', color: '#10b981', icon: CheckCircle },
        'em_andamento': { label: 'Em Andamento', color: '#f59e0b', icon: Clock },
        'concluído': { label: 'Concluído', color: '#22c55e', icon: CheckCircle },
        'cancelado': { label: 'Cancelado', color: '#6b7280', icon: XCircle },
        'faltou': { label: 'Faltou', color: '#ef4444', icon: XCircle }
    },
    clinical: {
        'pendente': { label: 'Pendente', color: '#6b7280', icon: Clock },
        'em_andamento': { label: 'Em Andamento', color: '#f59e0b', icon: Clock },
        'concluído': { label: 'Concluído', color: '#22c55e', icon: CheckCircle },
        'cancelado': { label: 'Cancelado', color: '#ef4444', icon: XCircle },
        'faltou': { label: 'Faltou', color: '#ef4444', icon: XCircle }
    }
};

// 🔧 FUNÇÕES DE TRADUÇÃO
const translateStatus = (status: string, type: 'operational' | 'clinical' | 'payment' = 'operational'): string => {
    return STATUS_TRANSLATIONS[type]?.[status] || status;
};

const getStatusConfig = (status: string, type: 'operational' | 'clinical' = 'operational') => {
    const translatedStatus = translateStatus(status, type);
    return STATUS_VISUAL_CONFIG[type]?.[translatedStatus] || {
        label: translatedStatus.charAt(0).toUpperCase() + translatedStatus.slice(1),
        color: '#9ca3af',
        icon: Clock
    };
};

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
    isOpen,
    onClose,
    doctors,
    event,
    onCancelAppointment,
    onCompleteAppointment,
    onEditAppointment,
    patients = [],
    onCancelAdvancedSession
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'confirm' | 'cancel' | 'edit'>('details');
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedAppointment, setEditedAppointment] = useState({
        doctorId: '',
        patientId: '',
        date: '',
        time: '',
        reason: '',
        operationalStatus: '',
        clinicalStatus: ''
    });

    registerLocale("pt-BR", ptBR);

    useEffect(() => {
        if (event) {
            const eventDate = event.date ? new Date(event.date).toLocaleDateString('sv-SE') : '';
            const eventTime = event.startTime || '';

            // 🔧 TRADUZ OS STATUS AO RECEBER O EVENTO
            const translatedOperationalStatus = translateStatus(event.operationalStatus || 'scheduled', 'operational');
            const translatedClinicalStatus = translateStatus(event.clinicalStatus || 'pending', 'clinical');

            setEditedAppointment({
                doctorId: event.doctor?.id || '',
                patientId: event.patient?.id || '',
                date: eventDate,
                time: eventTime,
                reason: event.reason || '',
                operationalStatus: translatedOperationalStatus,
                clinicalStatus: translatedClinicalStatus
            });
        }
    }, [event]);

    if (!isOpen || !event) return null;

    // 🔧 FUNÇÃO PARA OBTER CONFIGURAÇÃO VISUAL TRADUZIDA
    const getStatusVisualConfig = (status: string, type: 'operational' | 'clinical' = 'operational') => {
        const config = getStatusConfig(status, type);
        return {
            ...config,
            className: `inline-block px-3 py-2 rounded-lg text-sm font-semibold border`,
            style: {
                backgroundColor: `${config.color}20`,
                color: config.color,
                borderColor: `${config.color}40`
            }
        };
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            alert('Por favor, informe o motivo do cancelamento');
            return;
        }

        setIsCancelling(true);
        try {
            await onCancelAppointment(event.id, cancelReason);
        } finally {
            setIsCancelling(false);
        }
    };

    const handleComplete = async () => {
        setIsCompleting(true);
        try {
            await onCompleteAppointment(event.id);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleEdit = async () => {
        if (!editedAppointment.date || !editedAppointment.time) {
            alert('Data e hora são obrigatórias');
            return;
        }

        setIsEditing(true);
        try {
            // 🔧 TRADUZ OS STATUS DE VOLTA PARA INGLÊS ANTES DE ENVIAR PARA API
            const operationalStatusEN = Object.keys(STATUS_TRANSLATIONS.operational).find(
                key => STATUS_TRANSLATIONS.operational[key] === editedAppointment.operationalStatus
            ) || editedAppointment.operationalStatus;

            const clinicalStatusEN = Object.keys(STATUS_TRANSLATIONS.clinical).find(
                key => STATUS_TRANSLATIONS.clinical[key] === editedAppointment.clinicalStatus
            ) || editedAppointment.clinicalStatus;

            const appointmentData = {
                doctorId: editedAppointment.doctorId,
                patientId: editedAppointment.patientId,
                date: editedAppointment.date,
                time: editedAppointment.time,
                reason: editedAppointment.reason,
                operationalStatus: operationalStatusEN,
                clinicalStatus: clinicalStatusEN
            };

            await onEditAppointment(event.id, appointmentData);
        } finally {
            setIsEditing(false);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setEditedAppointment(prev => ({ ...prev, [field]: value }));
    };

    const handleCancelAdvancedSession = (sessionId: string) => {
        if (onCancelAdvancedSession) {
            onCancelAdvancedSession(sessionId);
        }
    };

    // 🔧 TRADUZ OS STATUS DO EVENTO PARA EXIBIÇÃO
    const translatedEvent = event ? {
        ...event,
        operationalStatus: translateStatus(event.operationalStatus, 'operational'),
        clinicalStatus: translateStatus(event.clinicalStatus, 'clinical')
    } : null;

    const renderTabContent = () => {
        if (!translatedEvent) return null;

        switch (activeTab) {
            case 'details':
                return (
                    <div className="space-y-6">
                        {event?.extendedProps?.paymentStatus && (
                            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-sm text-gray-700">Status Financeiro:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.extendedProps.paymentStatus === 'paid'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : event.extendedProps.paymentStatus === 'partial'
                                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                    {translateStatus(event.extendedProps.paymentStatus, 'payment')}
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Paciente</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.patient?.fullName || 'Não informado'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Stethoscope className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Profissional</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.doctor?.fullName || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Data e Hora</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.formattedDate}</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Clock className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Status Operacional</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.operationalStatus, 'operational')}>
                                    {getStatusConfig(translatedEvent.operationalStatus, 'operational').label}
                                </span>
                            </div>

                            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <ClipboardCheck className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Status Clínico</h3>
                                </div>
                                <span {...getStatusVisualConfig(translatedEvent.clinicalStatus, 'clinical')}>
                                    {getStatusConfig(translatedEvent.clinicalStatus, 'clinical').label}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-gray-600" />
                                Motivo da Consulta
                            </h3>
                            <p className="text-gray-800">{translatedEvent.reason || 'Não informado'}</p>
                        </div>

                        {event.advancedSessions?.length > 0 && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-green-600" />
                                    Sessões Futuras Pagas
                                </h3>

                                <div className="space-y-3">
                                    {event.advancedSessions.map((session, index) => (
                                        <div
                                            key={session._id || index}
                                            className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-800">
                                                    {session.formattedDate} às {session.formattedTime}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {session.specialty} • {session.doctor?.fullName}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${session.operationalStatus === 'scheduled'
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                    }`}>
                                                    {session.operationalStatus === 'scheduled' ? 'Pago' : 'Utilizado'}
                                                </span>

                                                {session.operationalStatus === 'scheduled' && onCancelAdvancedSession && (
                                                    <button
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        onClick={() => handleCancelAdvancedSession(session._id)}
                                                        title="Cancelar sessão"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {event.payment && (
                                    <div className="mt-4 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-200">
                                        Pagamento realizado em: {new Date(event.payment.createdAt).toLocaleDateString('pt-BR')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'confirm':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 p-4 rounded-xl">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-green-800 font-medium">
                                        Confirme os detalhes deste agendamento antes de confirmar.
                                    </p>
                                    <p className="text-xs text-green-600 mt-1">
                                        Esta ação marcará a consulta como concluída.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <User className="w-4 h-4 text-green-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Paciente</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.patient?.fullName || 'Não informado'}</p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-700">Data e Hora</h3>
                                </div>
                                <p className="text-lg font-semibold text-gray-900">{translatedEvent.formattedDate}</p>
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4 text-gray-600" />
                                    Motivo da Consulta
                                </h3>
                                <p className="text-gray-800">{translatedEvent.reason || 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'cancel':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-400 p-4 rounded-xl">
                            <div className="flex items-start gap-3">
                                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-red-800 font-medium">
                                        Ao cancelar este agendamento, o paciente será notificado automaticamente.
                                    </p>
                                    <p className="text-xs text-red-600 mt-1">
                                        Esta ação não poderá ser desfeita.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-600" />
                                Motivo do cancelamento *
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={4}
                                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                placeholder="Descreva o motivo do cancelamento..."
                            />
                            <p className="mt-2 text-sm text-gray-500">Este motivo será enviado ao paciente</p>
                        </div>

                        <div className="flex items-center p-4 bg-green-50 rounded-xl border border-green-200">
                            <input
                                id="notify-patient"
                                name="notify-patient"
                                type="checkbox"
                                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                checked={false}
                            />
                            <label htmlFor="notify-patient" className="ml-3 block text-sm text-gray-700">
                                Notificar paciente por WhatsApp
                            </label>
                        </div>
                    </div>
                );

            case 'edit':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 p-4 rounded-xl">
                            <div className="flex items-start gap-3">
                                <PencilIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-800 font-medium">
                                        Edite os detalhes deste agendamento.
                                    </p>
                                    <p className="text-xs text-amber-600 mt-1">
                                        As alterações serão salvas imediatamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-green-600" />
                                    Paciente *
                                </label>
                                <select
                                    value={editedAppointment.patientId}
                                    onChange={(e) => handleFieldChange('patientId', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    <option value="">Selecione um paciente</option>
                                    {patients.map(patient => (
                                        <option key={patient._id} value={patient._id}>
                                            {patient.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-green-600" />
                                    Profissional *
                                </label>
                                <Select
                                    value={editedAppointment.doctorId}
                                    onChange={(e) => handleFieldChange('doctorId', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    <option value="">Selecione um profissional</option>
                                    {doctors.map(doctor => (
                                        <option key={doctor._id} value={doctor._id}>
                                            {doctor.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                    Data *
                                </label>
                                <DatePicker
                                    selected={editedAppointment.date ? buildLocalDateOnly(editedAppointment.date) : null}
                                    onChange={(date) => {
                                        if (!date) return;
                                        const formatted = date.toLocaleDateString('sv-SE');
                                        handleFieldChange('date', formatted);
                                    }}
                                    customInput={
                                        <ReactInputMask
                                            mask="99/99/9999"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                        />
                                    }
                                    placeholderText='dd/MM/yyyy'
                                    locale={ptBR}
                                    dateFormat="dd/MM/yyyy"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-green-600" />
                                    Hora *
                                </label>
                                <DatePicker
                                    selected={new Date(`1970-01-01T${editedAppointment.time}`)}
                                    onChange={(date) =>
                                        handleFieldChange('time', date.toTimeString().slice(0, 5))
                                    }
                                    customInput={
                                        <ReactInputMask
                                            mask="99:99"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                        />
                                    }
                                    placeholderText='HH:MM'
                                    showTimeSelect
                                    showTimeSelectOnly
                                    timeIntervals={15}
                                    timeFormat="HH:mm"
                                    dateFormat="HH:mm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                                <ClipboardCheck className="w-4 h-4 text-green-600" />
                                Motivo da Consulta
                            </label>
                            <textarea
                                value={editedAppointment.reason}
                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                placeholder="Descreva o motivo da consulta..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Operacional
                                </label>
                                <select
                                    value={editedAppointment.operationalStatus}
                                    onChange={(e) => handleFieldChange('operationalStatus', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    {Object.entries(STATUS_VISUAL_CONFIG.operational).map(([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Clínico
                                </label>
                                <select
                                    value={editedAppointment.clinicalStatus}
                                    onChange={(e) => handleFieldChange('clinicalStatus', e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                >
                                    {Object.entries(STATUS_VISUAL_CONFIG.clinical).map(([key, config]) => (
                                        <option key={key} value={key}>
                                            {config.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const renderActionButton = () => {
        switch (activeTab) {
            case 'confirm':
                return (
                    <button
                        onClick={handleComplete}
                        disabled={isCompleting}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                    >
                        {isCompleting ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" />
                                <span>Registrando...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                <span>Concluir Agendamento</span>
                            </>
                        )}
                    </button>
                );

            case 'cancel':
                return (
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling || !cancelReason.trim()}
                        className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                    >
                        {isCancelling ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" />
                                <span>Cancelando...</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={18} />
                                <span>Confirmar Cancelamento</span>
                            </>
                        )}
                    </button>
                );

            case 'edit':
                return (
                    <button
                        onClick={handleEdit}
                        disabled={isEditing}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 flex items-center gap-2 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl"
                    >
                        {isEditing ? (
                            <>
                                <LoadingSpinner size="small" color="border-white" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <PencilIcon size={18} />
                                <span>Salvar Alterações</span>
                            </>
                        )}
                    </button>
                );

            default:
                return null;
        }
    };

    const getTabConfig = (tab: string) => {
        const config = {
            details: { icon: ClipboardCheck, color: 'green', title: 'Detalhes do Agendamento', description: 'Informações completas da consulta' },
            confirm: { icon: CheckCircle, color: 'green', title: 'Confirmar Agendamento', description: 'Confirme os detalhes do agendamento' },
            edit: { icon: PencilIcon, color: 'amber', title: 'Editar Agendamento', description: 'Edite os detalhes do agendamento' },
            cancel: { icon: XCircle, color: 'red', title: 'Cancelar Agendamento', description: 'Preencha os dados para cancelamento' }
        };
        return config[tab as keyof typeof config] || config.details;
    };

    const tabConfig = getTabConfig(activeTab);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row min-h-[600px] max-h-[90vh]">
                {/* Header Mobile */}
                <div className="md:hidden bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white rounded-t-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <tabConfig.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{tabConfig.title}</h2>
                                <p className="text-green-100 text-sm">{tabConfig.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 text-white hover:text-green-100 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Abas laterais - Desktop */}
                <div className="hidden md:flex w-1/4 bg-gradient-to-b from-green-50 to-emerald-50 rounded-l-2xl p-4 flex-col border-r border-green-100">
                    <div className="space-y-2">
                        {(['details', 'confirm', 'edit', 'cancel'] as const).map((tab) => {
                            const config = getTabConfig(tab);
                            const Icon = config.icon;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-center gap-3 ${activeTab === tab
                                        ? `bg-white shadow-lg border border-${config.color}-200 text-${config.color}-700 font-semibold`
                                        : 'hover:bg-white/50 text-gray-600 hover:text-gray-800'
                                        }`}
                                >
                                    <Icon size={20} className={`${activeTab === tab ? `text-${config.color}-600` : 'text-gray-400'}`} />
                                    <span className="font-medium">{config.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Abas Mobile */}
                <div className="md:hidden bg-gray-50 p-2 border-b">
                    <div className="flex overflow-x-auto space-x-2">
                        {(['details', 'confirm', 'edit', 'cancel'] as const).map((tab) => {
                            const config = getTabConfig(tab);
                            const Icon = config.icon;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${activeTab === tab
                                        ? `bg-${config.color}-100 text-${config.color}-700 font-medium`
                                        : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <Icon size={16} />
                                    <span className="text-sm">{config.title.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Conteúdo principal */}
                <div className="flex-1 p-6 flex flex-col">
                    {/* Header Desktop */}
                    <div className="hidden md:flex items-center gap-4 mb-6">
                        <div className={`p-3 bg-${tabConfig.color}-100 rounded-xl`}>
                            <tabConfig.icon className={`w-6 h-6 text-${tabConfig.color}-600`} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{tabConfig.title}</h2>
                            <p className="text-gray-500">{tabConfig.description}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {renderTabContent()}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                        {renderActionButton()}
                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailModal;