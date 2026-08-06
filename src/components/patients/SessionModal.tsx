import { PlusCircle, Save, UserX, Calendar, Clock, User, DollarSign, FileText, X, Wallet, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
// import ReactInputMask from 'react-input-mask';
import { toast } from 'react-toastify';
import { buildLocalDateOnly } from '../../utils/dateFormat';
import { IDoctor, ISession, THERAPY_TYPES, TherapyType } from '../../utils/types/types';
import { Button } from '../ui/Button';
import InputCurrency from '../ui/InputCurrency';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/TextArea';


interface SessionModalProps {
    action: 'edit' | 'use';
    sessionData: ISession;
    doctors: IDoctor[];
    loading: boolean;
    onSubmit: () => void;
    onClose: () => void;
    onSessionDataChange: (data: ISession) => void;
}

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendente' },
    { value: 'completed', label: 'Concluída' },
    { value: 'canceled', label: 'Cancelada' },
    { value: 'scheduled', label: 'Agendada' }
];

export const SessionModal = ({
    action,
    sessionData,
    doctors,
    loading,
    onSubmit,
    onClose,
    onSessionDataChange
}: SessionModalProps) => {
    console.log('[DEBUG] SessionModal received sessionData:', sessionData);
    console.log('[DEBUG] SessionModal doctors array length:', doctors?.length);
    console.log('[DEBUG] SessionModal doctorId:', sessionData?.doctorId);
    console.log('[DEBUG] SessionModal date:', sessionData?.date);
    console.log('[DEBUG] SessionModal paymentAmount:', sessionData?.paymentAmount);
    console.log('[DEBUG] SessionModal notes:', sessionData?.notes);
    const doctorMatch = doctors?.find(d => d._id === sessionData?.doctorId);
    console.log('[DEBUG] SessionModal doctorMatch:', doctorMatch);
    const title = action === 'edit' ? 'Editar Sessão' : 'Registrar Uso da Sessão';
    const submitText = action === 'edit' ? 'Salvar Alterações' : 'Registrar Sessão';
    
    const [isFormValid, setIsFormValid] = useState(false);

    useEffect(() => {
        const isValid = Boolean(
            sessionData.doctorId &&
            sessionData.date &&
            sessionData.time
        );
        setIsFormValid(isValid);
    }, [sessionData.doctorId, sessionData.date, sessionData.time]);



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        onSessionDataChange(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const validateForm = () => {
        if (!sessionData.date) {
            toast.error("Data é obrigatória!");
            return false;
        }
        if (!sessionData.time) {
            toast.error("Hora é obrigatória!");
            return false;
        }
        if (!sessionData.doctorId) {
            toast.error("Profissional é obrigatório!");
            return false;
        }
        if (sessionData.professionalPaymentStatus === 'non_payable' && !sessionData.professionalPaymentOverride?.reason?.trim()) {
            toast.error("Motivo é obrigatório ao desabilitar remuneração do profissional.");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        onSubmit();
    };

    // Calcula datas para os DatePickers
    const selectedDate = (() => {
        if (!sessionData.date) return null;
        const d = buildLocalDateOnly(sessionData.date);
        return isNaN(d.getTime()) ? null : d;
    })();

    const selectedTime = (() => {
        if (!sessionData.time || !sessionData.time.includes(':')) return null;
        const [hours, minutes] = sessionData.time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return null;
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return isNaN(date.getTime()) ? null : date;
    })();

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 animate-fade-in">
                {/* Cabeçalho com gradiente verde */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors p-1"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                            {action === 'edit' ? (
                                <Save className="w-6 h-6" />
                            ) : (
                                <PlusCircle className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{title}</h2>
                            <p className="text-emerald-100 mt-1">
                                {action === 'edit' ? 'Atualize os dados da sessão' : 'Registre uma nova sessão do pacote'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Corpo do formulário */}
                <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        {/* Coluna Esquerda - Informações Principais */}
                        <div className="space-y-6">
                            {/* Profissional */}
                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
                                <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-600" />
                                    <span>Profissional *</span>
                                </label>
                                <Select
                                    value={sessionData.doctorId || ''}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, doctorId: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                >
                                    <option value="">Selecione um profissional</option>
                                    {doctors.map((doctor) => (
                                        <option key={doctor._id} value={doctor._id}>
                                            {doctor.fullName}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            {/* Data e Hora */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
                                    <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>Data *</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={sessionData.date || ''}
                                        onChange={(e) => onSessionDataChange({ ...sessionData, date: e.target.value })}
                                        className="w-full py-3 px-4 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                                    <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        <span>Hora *</span>
                                    </label>
                                    <DatePicker
                                        selected={selectedTime}
                                        onChange={(date: Date | null) => {
                                            if (!date) return;
                                            const formattedTime = date
                                                .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                            onSessionDataChange({ ...sessionData, time: formattedTime });
                                        }}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={15}
                                        timeFormat="HH:mm"
                                        dateFormat="HH:mm"
                                        placeholderText="HH:MM"
                                        className="w-full py-3 px-4 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Status e Tipo */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Tipo de Sessão</label>
                                    <Select
                                        disabled={true}
                                        value={sessionData.sessionType || ''}
                                        onChange={(e) => onSessionDataChange({ ...sessionData, sessionType: e.target.value as TherapyType })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    >
                                        <option value="">Selecione</option>
                                        {THERAPY_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="block mb-2 text-sm font-medium text-gray-700">Status</label>
                                    <Select
                                        value={sessionData.status || 'pending'}
                                        onChange={(e) => onSessionDataChange({ ...sessionData, status: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                    >
                                        {STATUS_OPTIONS.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Coluna Direita - Informações Financeiras e Observações */}
                        <div className="space-y-6">
                            {/* Informações Financeiras */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-amber-600" />
                                    Informações Financeiras
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">Valor Pago</label>
                                        <InputCurrency
                                            name='paymentAmount'
                                            value={sessionData.paymentAmount || 0}
                                            onChange={(e) => onSessionDataChange({ ...sessionData, paymentAmount: Number(e.target.value) })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2 text-sm font-medium text-gray-700">
                                            Método de Pagamento
                                        </label>
                                        <Select
                                            value={sessionData.paymentMethod || ''}
                                            onChange={(e) => onSessionDataChange({ ...sessionData, paymentMethod: e.target.value as typeof sessionData.paymentMethod })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                                        >
                                            <option value="">Não registrado</option>
                                            <option value="dinheiro">Dinheiro</option>
                                            <option value="pix">PIX</option>
                                            <option value="cartão">Cartão</option>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Remuneração do Profissional */}
                            {sessionData.status === 'completed' && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <Wallet className="w-5 h-5 text-indigo-600" />
                                        Remuneração do Profissional
                                    </h3>
                                    <div className="space-y-3">
                                        <label className="flex items-start cursor-pointer gap-3">
                                            <input
                                                type="checkbox"
                                                checked={sessionData.professionalPaymentStatus === 'non_payable'}
                                                onChange={(e) => {
                                                    const isNonPayable = e.target.checked;
                                                    onSessionDataChange({
                                                        ...sessionData,
                                                        professionalPaymentStatus: isNonPayable ? 'non_payable' : 'payable',
                                                        professionalPaymentOverride: isNonPayable
                                                            ? { excluded: true, reason: sessionData.professionalPaymentOverride?.reason || '' }
                                                            : { excluded: false, reason: '' }
                                                    });
                                                }}
                                                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
                                            />
                                            <div>
                                                <span className="text-gray-700 font-medium">
                                                    Não remunerar o profissional por esta sessão
                                                </span>
                                                <p className="text-sm text-gray-600">
                                                    A sessão continua faturada e recebida pela clínica, mas não gera comissão ao profissional.
                                                </p>
                                            </div>
                                        </label>

                                        {sessionData.professionalPaymentStatus === 'non_payable' && (
                                            <div>
                                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                                    Motivo *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={sessionData.professionalPaymentOverride?.reason || ''}
                                                    onChange={(e) => onSessionDataChange({
                                                        ...sessionData,
                                                        professionalPaymentOverride: {
                                                            ...(sessionData.professionalPaymentOverride || { excluded: true }),
                                                            reason: e.target.value
                                                        }
                                                    })}
                                                    placeholder="Ex: Paciente avisou com antecedência"
                                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                                />
                                            </div>
                                        )}

                                        {sessionData.professionalPaymentOverride?.excludedAt && (
                                            <p className="text-xs text-gray-500">
                                                Última alteração: {new Date(sessionData.professionalPaymentOverride.excludedAt).toLocaleString('pt-BR')}
                                                {sessionData.professionalPaymentOverride.reason ? ` — ${sessionData.professionalPaymentOverride.reason}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Falta Confirmada */}
                            {sessionData.status === 'canceled' && (
                                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-100">
                                    <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        <UserX className="w-5 h-5 text-red-600" />
                                        Falta Confirmada
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-4">
                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="confirmedAbsence"
                                                    checked={sessionData.confirmedAbsence === true}
                                                    onChange={() => onSessionDataChange({
                                                        ...sessionData,
                                                        confirmedAbsence: true
                                                    })}
                                                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                <span className="ml-2 text-gray-700 font-medium">Sim</span>
                                            </label>

                                            <label className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="confirmedAbsence"
                                                    checked={sessionData.confirmedAbsence === false}
                                                    onChange={() => onSessionDataChange({
                                                        ...sessionData,
                                                        confirmedAbsence: false
                                                    })}
                                                    className="h-4 w-4 text-red-600 focus:ring-red-500"
                                                />
                                                <span className="ml-2 text-gray-700 font-medium">Não</span>
                                            </label>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Marque como "Sim" quando o paciente confirmou que não comparecerá à sessão.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Observações */}
                            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                                <label className="block mb-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    Observações
                                </label>
                                <Textarea
                                    value={sessionData.notes || ''}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, notes: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] bg-white"
                                    placeholder="Detalhes relevantes sobre a sessão, observações do profissional, ou qualquer informação adicional..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rodapé com botões */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        {!isFormValid && "Preencha todos os campos obrigatórios (*)"}
                    </div>
                    
                    <div className="flex gap-3">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isFormValid || loading}
                            className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                                !isFormValid || loading
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processando...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {action === 'edit' ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                                    {submitText}
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};