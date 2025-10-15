import { Calendar, Check, Clock, DollarSign, Plus, Stethoscope, User, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from 'react-modal';
import { FinancialRecord } from '../../services/paymentService';
import { EspecialidadesDisponiveis, IDoctor, IPatient, PaymentMethods } from '../../utils/types/types';
import { Button } from '../ui/Button';
import Input from '../ui/Input';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/TextArea';

interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    patient?: IPatient;
    patients?: IPatient[];
    doctors: IDoctor[];
    payment?: FinancialRecord;
    onPaymentSuccess: (data: any) => void;
}

interface AdvanceService {
    date: string;
    time: string;
    sessionType: string;
    serviceType: string;
    amount: number;
    isEvaluation?: boolean; // 🔥 NOVO: Identifica se é avaliação
}

export const PaymentModal = ({
    open,
    onClose,
    patient,
    patients,
    doctors,
    payment,
    onPaymentSuccess
}: PaymentModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [advanceServices, setAdvanceServices] = useState<AdvanceService[]>([]);
    const [showEvaluationFields, setShowEvaluationFields] = useState(false);

    const [paymentData, setPaymentData] = useState({
        patientId: '',
        doctorId: '',
        serviceType: 'individual_session',
        amount: 0,
        paymentMethod: 'cartão',
        notes: '',
        specialty: 'fonoaudiologia',
        status: 'paid' as const,
        isEvaluation: false // 🔥 NOVO: Pagamento é para avaliação?
    });

    const canSubmit = useMemo(() => {
        if (!paymentData.patientId || !paymentData.doctorId || !paymentData.specialty) {
            return false;
        }

        // 🔥 VALIDAÇÃO FLEXÍVEL: Permite valor zero se for apenas agendamento futuro
        const amount = parseFloat(paymentData.amount.toString());
        if (amount < 0) {
            return false;
        }

        // Se não há serviços futuros, o valor atual deve ser > 0
        if (advanceServices.length === 0 && amount <= 0) {
            return false;
        }

        // Validar serviços futuros
        if (advanceServices.length > 0) {
            for (const service of advanceServices) {
                const serviceAmount = parseFloat(service.amount.toString());
                if (isNaN(serviceAmount) || serviceAmount < 0 || !service.date || !service.time) {
                    return false;
                }
            }
        }

        return true;
    }, [paymentData, advanceServices]);

    useEffect(() => {
        if (open) {
            if (payment) {
                setPaymentData({
                    patientId: payment.patient._id || '',
                    doctorId: payment.doctor?._id || '',
                    serviceType: payment.serviceType || 'individual_session',
                    amount: payment.amount || 0,
                    status: 'paid',
                    paymentMethod: payment.paymentMethod || 'cartão',
                    notes: payment.notes || '',
                    specialty: payment.doctor?.specialty || 'fonoaudiologia',
                    isEvaluation: payment.serviceType === 'evaluation' // 🔥 DETECTA SE É AVALIAÇÃO
                });

                if (payment.advanceSessions &&
                    Array.isArray(payment.advanceSessions) &&
                    payment.advanceSessions.length > 0) {

                    setAdvanceServices(payment.advanceSessions.map((session: any) => ({
                        date: session.date || '',
                        time: session.time || '',
                        sessionType: session.sessionType || 'psicologia',
                        serviceType: session.serviceType || 'individual_session',
                        amount: session.amount || 0,
                        isEvaluation: session.serviceType === 'evaluation' // 🔥 MARCA AVALIAÇÕES
                    })));
                } else {
                    setAdvanceServices([]);
                }
            } else {
                setPaymentData({
                    patientId: patient?._id || '',
                    doctorId: doctors[0]?._id || '',
                    serviceType: 'individual_session',
                    amount: patient?.amount || 0,
                    status: 'paid',
                    paymentMethod: patient?.paymentMethod || 'cartão',
                    notes: patient?.notes || '',
                    specialty: patient?.specialty || 'fonoaudiologia',
                    isEvaluation: false
                });
                setAdvanceServices([]);
            }
        }
    }, [open, payment, patient, doctors]);

    // 🔥 CORREÇÃO: Funções de handleChange compatíveis com InputCurrency
    const handlePaymentAmountChange = (e: { target: { name: string; value: number; type: string } }) => {
        setPaymentData(prev => ({
            ...prev,
            amount: e.target.value
        }));
    };

    const handleAdvanceServiceAmountChange = (index: number) => (e: { target: { name: string; value: number; type: string } }) => {
        const newServices = [...advanceServices];
        newServices[index] = {
            ...newServices[index],
            amount: e.target.value
        };
        setAdvanceServices(newServices);
    };

    const handlePaymentDataChange = (field: string, value: any) => {
        setPaymentData(prev => ({
            ...prev,
            [field]: value
        }));

        // 🔥 ATUALIZA AUTOMATICAMENTE O TIPO DE SERVIÇO PARA AVALIAÇÃO
        if (field === 'serviceType' && value === 'evaluation') {
            setShowEvaluationFields(true);
        } else if (field === 'serviceType' && value !== 'evaluation') {
            setShowEvaluationFields(false);
        }
    };

    const handleAdvanceServiceChange = (
        index: number,
        field: keyof AdvanceService,
        value: any
    ) => {
        const newServices = [...advanceServices];
        newServices[index] = {
            ...newServices[index],
            [field]: value
        };

        // 🔥 ATUALIZA isEvaluation QUANDO MUDA O serviceType
        if (field === 'serviceType') {
            newServices[index].isEvaluation = value === 'evaluation';
        }

        setAdvanceServices(newServices);
    };

    const handleSubmit = async () => {
        if (!paymentData.patientId) {
            toast.error('Selecione um paciente');
            return;
        }

        if (!paymentData.doctorId) {
            toast.error('Selecione um profissional');
            return;
        }

        const amount = parseFloat(paymentData.amount.toString());
        if (isNaN(amount) || amount < 0) {
            toast.error('Valor inválido');
            return;
        }

        try {
            setIsLoading(true);

            const payload: any = {
                ...paymentData,
                amount: amount
            };

            if (payment?._id) {
                payload._id = payment._id;
            }

            if (advanceServices.length > 0) {
                payload.advanceServices = advanceServices.map(service => ({
                    ...service,
                    amount: parseFloat(service.amount.toString())
                }));
            }

            await onPaymentSuccess(payload);
            onClose();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            toast.error(error.message || 'Erro ao registrar pagamento');
        } finally {
            setIsLoading(false);
        }
    };

    const addAdvanceService = () => {
        setAdvanceServices([
            ...advanceServices,
            {
                date: '',
                time: '',
                sessionType: 'psicologia',
                serviceType: 'individual_session',
                amount: paymentData.amount || 0,
                isEvaluation: false
            }
        ]);
    };

    const removeAdvanceService = (index: number) => {
        const newServices = [...advanceServices];
        newServices.splice(index, 1);
        setAdvanceServices(newServices);
    };

    // 🔥 FUNÇÃO PARA CALCULAR TOTAL
    const calculateTotal = () => {
        const currentAmount = parseFloat(paymentData.amount.toString()) || 0;
        const advanceTotal = advanceServices.reduce((total, service) => {
            return total + (parseFloat(service.amount.toString()) || 0);
        }, 0);

        return currentAmount + advanceTotal;
    };

    if (!open) return null;

    return (
        <Modal
            isOpen={open}
            onRequestClose={onClose}
            className="w-full max-w-5xl mx-auto p-4 bg-white rounded-xl shadow-md"
            overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
            ariaHideApp={false}
        >
            {/* Cabeçalho */}
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign className="text-green-600" size={24} />
                    {payment
                        ? `Editar Pagamento - ${payment.patient?.fullName || ''}`
                        : patient
                            ? `Registrar Pagamento - ${patient.fullName}`
                            : 'Registrar Pagamento'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Fechar modal"
                    disabled={isLoading}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Corpo do Modal */}
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* Paciente e Tipo de Serviço */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {patients && patients.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <Label className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                                <Users size={18} /> Paciente *
                            </Label>
                            <Select
                                value={paymentData.patientId}
                                onChange={(e) => handlePaymentDataChange('patientId', e.target.value)}
                                disabled={isLoading}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg"
                            >
                                <option value="">Selecione um paciente</option>
                                {patients?.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.fullName}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <Stethoscope size={18} /> Tipo de Serviço *
                        </Label>
                        <Select
                            value={paymentData.serviceType}
                            onChange={(e) => handlePaymentDataChange('serviceType', e.target.value)}
                            disabled={isLoading}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg"
                        >
                            <option value="individual_session">Sessão Individual</option>
                            <option value="evaluation">Avaliação</option>
                            <option value="package">Pacote</option>
                            <option value="workshop">Workshop</option>
                            <option value="consultation">Consulta</option>
                        </Select>

                        {/* 🔥 INDICADOR VISUAL PARA AVALIAÇÃO */}
                        {paymentData.serviceType === 'evaluation' && (
                            <div className="mt-2 flex items-center gap-2 text-blue-600 text-sm">
                                <Clock size={14} />
                                <span>Registrando uma avaliação</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profissional e Especialidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label className="flex mb-2 font-medium text-gray-700 items-center gap-2">
                            <User size={18} />
                            Profissional *
                        </Label>
                        <Select
                            value={paymentData.doctorId}
                            onChange={(e) => handlePaymentDataChange('doctorId', e.target.value)}
                            disabled={isLoading || doctors.length === 0}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg"
                        >
                            {doctors && doctors.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    {doctor.fullName} - {doctor.specialty}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label className="block mb-2 font-medium text-gray-700">
                            Especialidade *
                        </Label>
                        <Select
                            value={paymentData.specialty}
                            onChange={(e) => handlePaymentDataChange('specialty', e.target.value)}
                            disabled={isLoading}
                            className="w-full p-3 bg-white border border-gray-300 rounded-lg"
                        >
                            {EspecialidadesDisponiveis.map(service => (
                                <option key={service.value} value={service.value}>
                                    {service.label}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* 🔥 PAGAMENTO ATUAL - PARA SESSÃO/AVALIAÇÃO ATUAL */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <DollarSign size={18} className="text-green-600" />
                        {paymentData.serviceType === 'evaluation' ? 'Pagamento da Avaliação' : 'Pagamento da Sessão'}
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="block mb-2 font-medium text-gray-700">
                                Valor (R$) {advanceServices.length === 0 ? '*' : '(Opcional)'}
                            </Label>
                            <InputCurrency
                                name="amount"
                                value={paymentData.amount}
                                onChange={(e) => handlePaymentDataChange(e.target.name, e.target.value)}
                            />

                            <p className="text-xs text-gray-500 mt-1">
                                {advanceServices.length === 0
                                    ? 'Valor obrigatório para pagamento atual'
                                    : 'Deixe em zero se for apenas agendamento futuro'}
                            </p>
                        </div>

                        <div>
                            <Label className="block mb-2 font-medium text-gray-700">
                                Forma de Pagamento *
                            </Label>
                            <Select
                                value={paymentData.paymentMethod}
                                onChange={(e) => handlePaymentDataChange('paymentMethod', e.target.value)}
                                disabled={isLoading}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg"
                            >
                                {PaymentMethods.map(method => (
                                    <option key={method.value} value={method.value}>
                                        {method.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                {/* 🔥 SERVIÇOS FUTUROS - SESSÕES E AVALIAÇÕES */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                Agendamentos Futuros (Pagamento Antecipado)
                            </h3>
                            <p className="text-sm text-gray-600">
                                Adicione sessões ou avaliações que serão realizadas futuramente
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={addAdvanceService}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                            disabled={isLoading}
                        >
                            <Plus size={16} /> Adicionar
                        </button>
                    </div>

                    {advanceServices.map((service, index) => (
                        <div key={index} className={`bg-white p-4 rounded-lg border mb-3 ${service.serviceType === 'evaluation' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-100'
                            }`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-700">
                                        {service.serviceType === 'evaluation' ? 'Avaliação' : 'Sessão'} {index + 1}
                                    </h4>
                                    {service.serviceType === 'evaluation' && (
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                                            Avaliação
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeAdvanceService(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    disabled={isLoading}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <Label className="text-sm text-gray-600 mb-1">Data *</Label>
                                    <Input
                                        type="date"
                                        value={service.date}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'date', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <Label className="text-sm text-gray-600 mb-1">Hora *</Label>
                                    <Input
                                        type="time"
                                        value={service.time}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'time', e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <Label className="text-sm text-gray-600 mb-1">Tipo de Serviço *</Label>
                                    <Select
                                        value={service.serviceType}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'serviceType', e.target.value)}
                                        disabled={isLoading}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="individual_session">Sessão Individual</option>
                                        <option value="evaluation">Avaliação</option>
                                        <option value="package">Pacote</option>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-sm text-gray-600 mb-1">Valor (R$) *</Label>
                                    <InputCurrency
                                        value={service.amount}
                                        onChange={(e) => {
                                            handleAdvanceServiceChange(index, 'amount', e.target.value);
                                        }}

                                        disabled={isLoading}
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <div className="mt-3">
                                <Label className="text-sm text-gray-600 mb-1">Terapia/Especialidade</Label>
                                <Select
                                    value={service.sessionType}
                                    onChange={(e) => handleAdvanceServiceChange(index, 'sessionType', e.target.value)}
                                    disabled={isLoading}
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                >
                                    {EspecialidadesDisponiveis.map(esp => (
                                        <option key={esp.value} value={esp.value}>{esp.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    ))}

                    {advanceServices.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4 bg-white rounded border border-dashed">
                            Nenhum agendamento futuro adicionado
                        </p>
                    )}
                </div>

                {/* 🔥 RESUMO DO TOTAL */}
                {advanceServices.length > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <DollarSign size={18} className="text-purple-600" />
                            Resumo do Pagamento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Pagamento atual:</span>
                                <div className="font-semibold">
                                    R$ {parseFloat(paymentData.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-600">
                                    {advanceServices.length} serviço(s) futuro(s):
                                </span>
                                <div className="font-semibold">
                                    R$ {advanceServices.reduce((total, service) => total + (parseFloat(service.amount.toString()) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="border-t pt-2">
                                <span className="text-gray-600">Total:</span>
                                <div className="font-semibold text-lg text-purple-600">
                                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Observações */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <Label className="block mb-2 font-medium text-gray-700">
                        Observações
                    </Label>
                    <Textarea
                        value={paymentData.notes}
                        onChange={(e) => handlePaymentDataChange('notes', e.target.value)}
                        disabled={isLoading}
                        placeholder="Detalhes do pagamento, observações importantes, etc."
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                </div>
            </div>

            {/* Rodapé */}
            <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-gray-200">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !canSubmit}
                    className={`px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:opacity-90 flex items-center ${isLoading || !canSubmit ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinner />
                            Registrando...
                        </>
                    ) : (
                        <>
                            <Check className="h-5 w-5 mr-2" />
                            {payment ? 'Atualizar Pagamento' : 'Confirmar Pagamento'}
                        </>
                    )}
                </Button>
            </div>
        </Modal>
    );
};