import { ptBR } from 'date-fns/locale';
import { CheckCircle, ClipboardCheck, PencilIcon, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ReactInputMask from 'react-input-mask';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { IDoctor, SelectedEvent } from '../../utils/types/types';
import { Label } from '../ui/Label';
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
    onCancelAdvancedSession?: (sessionId: string) => void; // Nova prop opcional
}

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
            setEditedAppointment({
                doctorId: event.doctor?.id || '',
                patientId: event.patient?.id || '',
                date: eventDate,
                time: eventTime,
                reason: event.reason || '',
                operationalStatus: event.operationalStatus || 'agendado',
                clinicalStatus: event.clinicalStatus || 'pendente'
            });
        }
    }, [event]);

    if (!isOpen || !event) return null;

    function getStatusClass(status: string) {
        switch (status) {
            case 'agendado': return 'bg-green-100 text-green-800';
            case 'confirmado': return 'bg-blue-100 text-blue-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            case 'pago': return 'bg-purple-100 text-purple-800';
            case 'faltou': return 'bg-orange-100 text-orange-800';
            case 'concluído': return 'bg-teal-100 text-teal-800';
            default: return 'bg-gray-100 text-gray-600';
        }
    }

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

        // Para garantir que não converta para UTC:
        const isoLocal = `${editedAppointment.date}T${editedAppointment.time}:00`;

        setIsEditing(true);
        try {
            const appointmentData = {
                doctorId: editedAppointment.doctorId,
                patientId: editedAppointment.patientId,
                date: isoLocal,
                time: editedAppointment.time,
                reason: editedAppointment.reason,
                operationalStatus: editedAppointment.operationalStatus,
                clinicalStatus: editedAppointment.clinicalStatus
            };

            await onEditAppointment(event.id, appointmentData);
        } finally {
            setIsEditing(false);
        }
    };

    const handleFieldChange = (field: string, value: string) => {
        setEditedAppointment(prev => ({ ...prev, [field]: value }));
    };

    // Adicionado: Função para cancelar sessão avançada
    const handleCancelAdvancedSession = (sessionId: string) => {
        if (onCancelAdvancedSession) {
            onCancelAdvancedSession(sessionId);
        }
    };


    const renderTabContent = () => {
        switch (activeTab) {
            case 'details':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Paciente</h3>
                                <p className="text-lg font-medium">{event.patient?.fullName || 'Não informado'}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Doutor</h3>
                                <p className="text-lg font-medium">{event.doctor?.fullName || 'Não informado'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Data e Hora</h3>
                                <p className="text-lg font-medium">{event.formattedDate}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Status Operacional</h3>
                                <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold mt-1 ${getStatusClass(event.operationalStatus)}`}>
                                    {event.operationalStatus}
                                </span>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Status Clínico</h3>
                                <span className={`inline-block px-3 py-1 rounded-md text-sm font-semibold mt-1 ${getStatusClass(event.clinicalStatus)}`}>
                                    {event.clinicalStatus}
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Motivo da Consulta</h3>
                            <p className="text-gray-800">{event.reason || 'Não informado'}</p>
                        </div>

                        {/* Sessões Futuras Pagas - ADICIONADO AQUI */}
                        {event.advancedSessions?.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                    Sessões Futuras Pagas
                                </h3>

                                <div className="space-y-3">
                                    {event.advancedSessions.map((session, index) => (
                                        <div
                                            key={session._id || index}
                                            className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-700">
                                                    {session.formattedDate} às {session.formattedTime}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {session.specialty} • {session.doctor?.fullName}
                                                </p>
                                            </div>

                                            <div className="flex items-center">
                                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                                    {session.operationalStatus === 'agendado' ? 'Pago' : 'Utilizado'}
                                                </span>

                                                {session.operationalStatus === 'agendado' && onCancelAdvancedSession && (
                                                    <button
                                                        className="ml-2 text-red-500 hover:text-red-700"
                                                        onClick={() => handleCancelAdvancedSession(session._id)}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {event.payment && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        Pagamento realizado em: {new Date(event.payment.createdAt).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'confirm':
                return (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <CheckCircle className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        Confirme os detalhes deste agendamento antes de confirmar.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Paciente</h3>
                                <p className="text-lg font-medium">{event.patient?.fullName || 'Não informado'}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Data e Hora</h3>
                                <p className="text-lg font-medium">{event.formattedDate}</p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-medium text-gray-500 mb-1">Motivo</h3>
                                <p className="text-gray-800">{event.reason || 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                );

            case 'cancel':
                return (
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <XCircle className="h-5 w-5 text-yellow-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        Ao cancelar este agendamento, o paciente será notificado automaticamente.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Motivo do cancelamento *</label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={4}
                                className="w-full p-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Descreva o motivo do cancelamento..."
                            />
                            <p className="mt-1 text-sm text-gray-500">Este motivo será enviado ao paciente</p>
                        </div>

                        <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                            <input
                                id="notify-patient"
                                name="notify-patient"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                checked={false}
                            />
                            <label htmlFor="notify-patient" className="ml-2 block text-sm text-gray-700">
                                Notificar paciente por WhatsApp
                            </label>
                        </div>
                    </div>
                );

            case 'edit':
                return (
                    <div className="space-y-4">
                        {/* Alerta de edição */}
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <PencilIcon className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        Edite os detalhes deste agendamento.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Grid responsivo para campos principais */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Paciente */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Paciente *
                                </label>
                                <select
                                    value={editedAppointment.patientId}
                                    onChange={(e) => handleFieldChange('patientId', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecione um paciente</option>
                                    {patients.map(patient => (
                                        <option key={patient._id} value={patient._id}>
                                            {patient.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Doutor */}
                            <div className="space-y-1">
                                <Label className="block text-sm font-medium text-gray-700">
                                    Doutor *
                                </Label>
                                <Select
                                    value={editedAppointment.doctorId}
                                    onChange={(e) => handleFieldChange('doctorId', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecione um médico</option>
                                    {doctors.map(doctor => (
                                        <option key={doctor._id} value={doctor._id}>
                                            {doctor.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Data */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
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
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    }
                                    placeholderText='dd/MM/yyyy'
                                    locale={ptBR}
                                    dateFormat="dd/MM/yyyy"
                                />
                            </div>

                            {/* Hora */}
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
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
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                        {/* Motivo da Consulta */}
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Motivo da Consulta
                            </label>
                            <textarea
                                value={editedAppointment.reason}
                                onChange={(e) => handleFieldChange('reason', e.target.value)}
                                rows={2}
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Descreva o motivo da consulta..."
                            />
                        </div>

                        {/* Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Operacional
                                </label>
                                <select
                                    value={editedAppointment.operationalStatus}
                                    onChange={(e) => handleFieldChange('operationalStatus', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="agendado">Agendado</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="cancelado">Cancelado</option>
                                    <option value="pago">Pago</option>
                                    <option value="faltou">Faltou</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-gray-700">
                                    Status Clínico
                                </label>
                                <select
                                    value={editedAppointment.clinicalStatus}
                                    onChange={(e) => handleFieldChange('clinicalStatus', e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="em_andamento">Em Andamento</option>
                                    <option value="concluído">Concluído</option>
                                    <option value="faltou">Faltou</option>
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
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center disabled:bg-green-400"
                    >
                        {isCompleting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Registrando ...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} className="mr-2" />
                                Concluir Agendamento
                            </>
                        )}
                    </button>
                );

            case 'cancel':
                return (
                    <button
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition flex items-center disabled:bg-red-400"
                    >
                        {isCancelling ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Cancelando...
                            </>
                        ) : (
                            <>
                                <XCircle size={16} className="mr-2" />
                                Confirmar Cancelamento
                            </>
                        )}
                    </button>
                );

            case 'edit':
                return (
                    <button
                        onClick={handleEdit}
                        disabled={isEditing}
                        className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition flex items-center disabled:bg-amber-400"
                    >
                        {isEditing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Salvando...
                            </>
                        ) : (
                            <>
                                <PencilIcon size={16} className="mr-2" />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                );

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex min-h-[500px]">
                {/* Abas verticais */}
                <div className="w-1/5 bg-gray-50 rounded-l-2xl p-2 flex flex-col">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`w-full text-left p-3 rounded-lg mb-2 flex items-center ${activeTab === 'details' ? 'bg-blue-100 text-blue-600 font-medium' : 'hover:bg-gray-100'}`}
                    >
                        <ClipboardCheck size={16} className="mr-2" />
                        Detalhes
                    </button>

                    <button
                        onClick={() => setActiveTab('confirm')}
                        className={`w-full text-left p-3 rounded-lg mb-2 flex items-center ${activeTab === 'confirm' ? 'bg-green-100 text-green-600 font-medium' : 'hover:bg-gray-100'}`}
                    >
                        <CheckCircle size={16} className="mr-2" />
                        Confirmar
                    </button>

                    <button
                        onClick={() => setActiveTab('edit')}
                        className={`w-full text-left p-3 rounded-lg mb-2 flex items-center ${activeTab === 'edit' ? 'bg-amber-100 text-amber-600 font-medium' : 'hover:bg-gray-100'}`}
                    >
                        <PencilIcon size={16} className="mr-2" />
                        Editar
                    </button>
                    <button
                        onClick={() => setActiveTab('cancel')}
                        className={`w-full text-left p-3 rounded-lg flex items-center ${activeTab === 'cancel' ? 'bg-red-100 text-red-600 font-medium' : 'hover:bg-gray-100'}`}
                    >
                        <XCircle size={16} className="mr-2" />
                        Cancelar
                    </button>
                </div>

                {/* Conteúdo principal */}
                <div className="w-4/5 p-6 flex flex-col">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold text-blue-600">
                            {activeTab === 'details' && 'Detalhes do Agendamento'}
                            {activeTab === 'confirm' && 'Confirmar Agendamento'}
                            {activeTab === 'cancel' && 'Cancelar Agendamento'}
                            {activeTab === 'edit' && 'Editar Agendamento'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {activeTab === 'details' && 'Informações completas da consulta'}
                            {activeTab === 'confirm' && 'Confirme os detalhes do agendamento'}
                            {activeTab === 'cancel' && 'Preencha os dados para cancelamento'}
                            {activeTab === 'edit' && 'Edite os detalhes do agendamento'}
                        </p>
                    </div>

                    <div className="flex-grow overflow-auto">
                        {renderTabContent()}
                    </div>

                    <div className="w-full flex justify-end mt-4 space-x-2">
                        {renderActionButton()}
                        <button
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition flex items-center"
                        >
                            Fechar
                        </button>
                    </div>

                    <div className="mt-6 flex justify-between pt-4 border-t border-gray-200">
                        <div>
                            {activeTab !== 'details' && (
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Voltar para detalhes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailModal;