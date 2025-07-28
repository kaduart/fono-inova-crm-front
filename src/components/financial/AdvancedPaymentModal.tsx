import { Check, ChevronDown, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IDoctor, IPatient } from '../../utils/types/types';
import InputCurrency from '../ui/InputCurrency';

interface AdvancedPaymentModalProps {
    open: boolean;
    onClose: () => void;
    patients: IPatient[];
    doctors: IDoctor[];
    onPaymentAdvancedSuccess: (data: any) => void;
}

export const AdvancedPaymentModal = ({
    open,
    onClose,
    patients,
    doctors,
    onPaymentAdvancedSuccess
}: AdvancedPaymentModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState({
        doctorId: '',
        amount: 0,
        paymentMethod: 'cartão',
        notes: '',
        patientId: '',
        specialty: 'psicologia'
    });

    const [advanceSessions, setAdvanceSessions] = useState<Array<{
        date: string;
        time: string;
        sessionType: string;
    }>>([{ date: '', time: '', sessionType: 'psicologia' }]);

    useEffect(() => {
        if (open) {
            setPaymentData({
                doctorId: doctors[0]?._id || '',
                amount: 0,
                paymentMethod: 'cartão',
                notes: '',
                patientId: patients[0]?._id || '',
                specialty: 'psicologia'
            });
            setAdvanceSessions([{ date: '', time: '', sessionType: 'psicologia' }]);
        }
    }, [open, patients, doctors]);

    // Calcular valor total quando sessões mudam
    useEffect(() => {
        // Aqui você pode implementar lógica de cálculo baseada no tipo de sessão
        // Por exemplo: R$ 200 por sessão de psicologia, R$ 250 por neuropsicologia, etc.
        // Por enquanto, vamos manter o valor manual
    }, [advanceSessions]);

    const handleSubmit = async () => {
        // Validações
        if (!paymentData.patientId) {
            toast.error('Selecione um paciente');
            return;
        }

        if (!paymentData.doctorId) {
            toast.error('Selecione um profissional');
            return;
        }

        if (advanceSessions.length === 0) {
            toast.error('Adicione pelo menos uma sessão futura');
            return;
        }

        // Validar cada sessão
        for (const session of advanceSessions) {
            if (!session.date) {
                toast.error('Data da sessão é obrigatória');
                return;
            }

            if (!session.time) {
                toast.error('Horário da sessão é obrigatório');
                return;
            }

            if (!session.sessionType) {
                toast.error('Tipo da sessão é obrigatório');
                return;
            }
        }

        const amount = parseFloat(paymentData.amount.toString());
        if (isNaN(amount) || amount <= 0) {
            toast.error('Valor inválido');
            return;
        }

        try {
            setIsLoading(true);

            // Preparar payload
            const payload = {
                ...paymentData,
                amount,
                serviceType: 'advanced_session',
                advanceSessions,
                status: 'paid'
            };

            onPaymentAdvancedSuccess(payload);
            onClose();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error(error.message || 'Erro ao registrar pagamento');
        } finally {
            setIsLoading(false);
        }
    };

    const addSession = () => {
        setAdvanceSessions([
            ...advanceSessions,
            { date: '', time: '', sessionType: 'psicologia' }
        ]);
    };

    const removeSession = (index: number) => {
        if (advanceSessions.length === 1) {
            toast.error('É necessário pelo menos uma sessão');
            return;
        }

        const newSessions = [...advanceSessions];
        newSessions.splice(index, 1);
        setAdvanceSessions(newSessions);
    };

    const updateSession = (index: number, field: 'date' | 'time' | 'sessionType', value: string) => {
        const newSessions = [...advanceSessions];
        newSessions[index][field] = value;
        setAdvanceSessions(newSessions);
    };

    if (!open) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? 'block' : 'hidden'}`}>
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={isLoading ? undefined : onClose}
                aria-hidden="true"
            />

            <div className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-auto overflow-hidden transform transition-all">
                {/* Cabeçalho */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        Pagamento de Sessões Futuras
                    </h3>
                    <button
                        type="button"
                        className="text-white hover:text-blue-200 focus:outline-none disabled:opacity-50"
                        onClick={isLoading ? undefined : onClose}
                        disabled={isLoading}
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Corpo */}
                <div className="p-6">
                    <div className="space-y-6">
                        {/* Seleção de Paciente e Profissional */}
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[250px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Paciente *
                                </label>
                                <div className="relative">
                                    <select
                                        value={paymentData.patientId}
                                        onChange={(e) => setPaymentData({
                                            ...paymentData,
                                            patientId: e.target.value
                                        })}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 appearance-none"
                                    >
                                        <option value="">Selecione um paciente</option>
                                        {patients.map(patient => (
                                            <option key={patient._id} value={patient._id}>
                                                {patient.fullName}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-w-[250px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Profissional *
                                </label>
                                <div className="relative">
                                    <select
                                        value={paymentData.doctorId}
                                        onChange={(e) => setPaymentData({
                                            ...paymentData,
                                            doctorId: e.target.value
                                        })}
                                        disabled={isLoading || doctors.length === 0}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 appearance-none"
                                    >
                                        {doctors.map(doctor => (
                                            <option key={doctor._id} value={doctor._id}>
                                                {doctor.fullName}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sessões Futuras */}
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium">Sessões Futuras</h3>
                                <button
                                    type="button"
                                    onClick={addSession}
                                    className="text-blue-600 flex items-center text-sm"
                                >
                                    <Plus size={16} className="mr-1" /> Adicionar Sessão
                                </button>
                            </div>

                            <div className="space-y-4">
                                {advanceSessions.map((session, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Data
                                            </label>
                                            <input
                                                type="date"
                                                value={session.date}
                                                onChange={(e) => updateSession(index, 'date', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Horário
                                            </label>
                                            <input
                                                type="time"
                                                value={session.time}
                                                onChange={(e) => updateSession(index, 'time', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Tipo de Sessão
                                            </label>
                                            <select
                                                value={session.sessionType}
                                                onChange={(e) => updateSession(index, 'sessionType', e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="psicologia">Psicologia</option>
                                                <option value="neuropsicologia">Neuropsicologia</option>
                                                <option value="orientacao">Orientação</option>
                                            </select>
                                        </div>

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeSession(index)}
                                                className="text-red-500 hover:text-red-700"
                                                disabled={advanceSessions.length <= 1}
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Valor e Forma de Pagamento */}
                        <div className="flex flex-wrap gap-4 border-t pt-4">
                            <div className="flex-1 min-w-[250px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor Total (R$) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                                    <InputCurrency
                                        name='amount'
                                        value={paymentData.amount}
                                        onChange={(e) => setPaymentData({
                                            ...paymentData,
                                            amount: e.target.value
                                        })}
                                        disabled={isLoading}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Valor total para {advanceSessions.length} sessão{advanceSessions.length > 1 ? 'es' : ''}
                                </p>
                            </div>

                            <div className="flex-1 min-w-[250px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Forma de Pagamento *
                                </label>
                                <div className="relative">
                                    <select
                                        value={paymentData.paymentMethod}
                                        onChange={(e) => setPaymentData({
                                            ...paymentData,
                                            paymentMethod: e.target.value
                                        })}
                                        disabled={isLoading}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 appearance-none"
                                    >
                                        <option value="cartão">Cartão</option>
                                        <option value="pix">PIX</option>
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="transferência">Transferência</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Observações */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observações
                            </label>
                            <textarea
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData({
                                    ...paymentData,
                                    notes: e.target.value
                                })}
                                disabled={isLoading}
                                placeholder="Opcional"
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                            />
                        </div>
                    </div>
                </div>

                {/* Rodapé */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="px-5 py-2.5 text-white bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-opacity flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                                Registrando...
                            </>
                        ) : (
                            <>
                                <Check className="h-5 w-5 mr-2" />
                                Registrar Pagamento
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};