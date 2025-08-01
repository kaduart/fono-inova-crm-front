import { PlusCircle, Save, UserX } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import toast from 'react-hot-toast';
import ReactInputMask from 'react-input-mask';
import { buildLocalDateOnly, buildLocalTime, combineLocalDateTime } from '../../utils/dateFormat';
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
    const title = action === 'edit' ? 'Editar Sessão' : 'Registrar Uso';
    const submitText = action === 'edit' ? 'Salvar Alterações' : 'Registrar Uso';
    // Estados separados para data e hora
    const [localDate, setLocalDate] = useState<Date | null>(null);
    const [localTime, setLocalTime] = useState<Date | null>(null);
    const [isFormValid, setIsFormValid] = useState(false);

    // Inicializa os estados com os valores da sessão
    useEffect(() => {
        if (sessionData.date) {
            const dateOnly = sessionData.date.split('T')[0];
            setLocalDate(buildLocalDateOnly(dateOnly));

            if (sessionData.time) {
                setLocalTime(buildLocalTime(sessionData.time));
            }
        }
    }, [sessionData.date, sessionData.time]);

    // Atualiza o sessionData quando data ou hora mudam
    // Atualização dos dados
    useEffect(() => {
        if (localDate && localTime) {
            const dateTimeISO = combineLocalDateTime(localDate, localTime);
            const formattedTime = `${localTime.getHours().toString().padStart(2, '0')}:${localTime.getMinutes().toString().padStart(2, '0')}`;
            console.log('payload pasession package', formattedTime)

            onSessionDataChange({
                ...sessionData,
                date: dateTimeISO,
                time: formattedTime,
                formattedDate: {
                    date: localDate.toLocaleDateString('pt-BR'),
                    time: formattedTime,
                    full: `${localDate.toLocaleDateString('pt-BR')}, ${formattedTime}`
                }
            });
        }
    }, [localDate, localTime]);

    useEffect(() => {
        const isValid = Boolean(
            sessionData.doctorId &&
            localDate &&
            localTime &&
            sessionData.time // Garante que o time foi formatado corretamente
        );
        setIsFormValid(isValid);
    }, [sessionData.doctorId, localDate, localTime, sessionData.time]);


    const validateForm = () => {
        if (!localDate) {
            toast.error("Data é obrigatória!");
            return false;
        }
        if (!sessionData.doctorId) {
            toast.error("Profissional é obrigatório!");
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        onSubmit();
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl w-full max-w-md shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 animate-fade-in">
                {/* Cabeçalho com gradiente */}
                <div className={`p-4 flex items-center ${action === 'edit' ? 'bg-indigo-50 font-medium text-indigo-700' : 'bg-green-50 text-green-700'}`}>
                    <div className="bg-white/20 p-2 rounded-lg">
                        {action === 'edit' ? (
                            <Save className="w-5 h-5 blue-white" />
                        ) : (
                            <PlusCircle className="w-5 h-5 green-white" />
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-blue ml-2 tracking-tight">
                        {title}
                    </h2>
                </div>

                {/* Corpo do formulário */}
                <div className="p-5 max-h-[80vh] overflow-y-auto">
                    <div className="space-y-5">

                        <div className="grid grid-cols-1 gap-5">
                            <div className="mb-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    <span className="text-red-500 mr-1">*</span>
                                    Profissional
                                </label>
                                <div className="relative">
                                    <Select
                                        value={sessionData.doctorId || ''}
                                        onChange={(e) => onSessionDataChange({ ...sessionData, doctorId: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Selecione um profissional</option>
                                        {doctors.map((doctor) => (
                                            <option key={doctor._id} value={doctor._id}>
                                                {doctor.fullName}
                                            </option>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Campo Data */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Data *
                                    </label>
                                    <DatePicker
                                        selected={localDate}
                                        onChange={(date: Date | null) => setLocalDate(date)}
                                        customInput={
                                            <ReactInputMask
                                                mask="99/99/9999"
                                                className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        }
                                        placeholderText='dd/MM/yyyy'
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Campo Hora */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hora *
                                    </label>
                                    <DatePicker
                                        selected={localTime}
                                        onChange={(time: Date | null) => setLocalTime(time)}
                                        showTimeSelect
                                        showTimeSelectOnly
                                        timeIntervals={15}
                                        timeFormat="HH:mm"
                                        dateFormat="HH:mm"
                                        placeholderText='HH:MM'
                                        customInput={
                                            <ReactInputMask
                                                mask="99:99"
                                                className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        }
                                        className="w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="mb-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">Tipo de Sessão</label>
                                <Select
                                    disabled={true}
                                    value={sessionData.sessionType || ''}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, sessionType: e.target.value as TherapyType })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecione</option>
                                    {THERAPY_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="mb-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">Status</label>
                                <Select
                                    value={sessionData.status || 'pending'}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, status: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {STATUS_OPTIONS.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="mb-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">Valor Pago (R$)</label>
                                <InputCurrency
                                    name='paymentAmount'
                                    value={sessionData.paymentAmount || 0}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, paymentAmount: Number(e.target.value) })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="mb-2">
                                <label className="block mb-2 text-sm font-medium text-gray-700">
                                    Método de Pagamento
                                </label>
                                <Select
                                    value={sessionData.paymentMethod || ''}
                                    onChange={(e) => onSessionDataChange({ ...sessionData, paymentMethod: e.target.value as typeof sessionData.paymentMethod })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Não registrado</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="pix">PIX</option>
                                    <option value="cartão">Cartão</option>
                                </Select>
                            </div>
                        </div>

                        {sessionData.status === 'canceled' && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
                                <label className="block mb-3 font-medium text-gray-700 flex items-center">
                                    <UserX className="w-4 h-4 text-red-600 mr-2" />
                                    Falta Confirmada
                                </label>
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
                                            className="h-4 w-4 text-green-600 focus:ring-green-500"
                                        />
                                        <span className="ml-2 text-gray-700">Sim</span>
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
                                        <span className="ml-2 text-gray-700">Não</span>
                                    </label>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Marque como "Sim" quando o paciente confirmou que não comparecerá
                                </p>
                            </div>
                        )}

                        <div className="mt-3 mb-2">
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Observações
                            </label>
                            <Textarea
                                value={sessionData.notes || ''}
                                onChange={(e) => onSessionDataChange({ ...sessionData, notes: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                placeholder="Detalhes relevantes sobre a sessão..."
                            />
                        </div>
                    </div>
                </div>

                {/* Rodapé com botões */}
                <div className="bg-gray-50 px-5 py-4 flex justify-between border-t border-gray-200">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid || loading}
                        className={`text-white ${!isFormValid
                            ? 'opacity-50 cursor-not-allowed'
                            : action === 'edit'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processando...
                            </div>
                        ) : (
                            <div className="flex items-center">
                                {action === 'edit' ? <Save className="w-4 h-4 mr-1.5" /> : <PlusCircle className="w-4 h-4 mr-1.5" />}
                                {submitText}
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};