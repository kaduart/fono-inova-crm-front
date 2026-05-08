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
import { extractErrorMessage } from '../../utils/errorUtils';

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
    isEvaluation?: boolean;
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
        isEvaluation: false,
        paymentDate: new Date().toISOString().split('T')[0]
    });

    const canSubmit = useMemo(() => {
        if (!paymentData.patientId || !paymentData.doctorId || !paymentData.specialty) {
            return false;
        }
        const amount = parseFloat(paymentData.amount.toString());
        if (amount < 0) return false;
        // em modo edição, permite salvar com valor 0 (ex: apenas alterar data/método)
        if (!payment && advanceServices.length === 0 && amount <= 0) return false;
        if (advanceServices.length > 0) {
            for (const service of advanceServices) {
                const serviceAmount = parseFloat(service.amount.toString());
                if (isNaN(serviceAmount) || serviceAmount < 0 || !service.date || !service.time) return false;
            }
        }
        return true;
    }, [paymentData, advanceServices, payment]);

    useEffect(() => {
        if (open) {
            if (payment) {
                const patientId = payment.patient?._id || (payment.patient as any)?.id || (payment as any).patientId || '';
                const doctorId = payment.doctor?._id || (payment.doctor as any)?.id || (payment as any).doctorId || '';
                console.log('[PaymentModal] open payment:', {
                    id: (payment as any).id, _id: payment._id,
                    patientId, doctorId,
                    patientRaw: payment.patient,
                    doctorRaw: payment.doctor,
                    amount: payment.amount,
                    date: payment.date,
                });
                setPaymentData({
                    patientId,
                    doctorId,
                    serviceType: payment.serviceType || 'individual_session',
                    amount: payment.amount || (payment as any).sessionValue || (payment as any).value || 0,
                    status: 'paid',
                    paymentMethod: payment.paymentMethod || 'cartão',
                    notes: payment.notes || '',
                    specialty: payment.doctor?.specialty || 'fonoaudiologia',
                    isEvaluation: payment.serviceType === 'evaluation',
                    paymentDate: payment.date
                        ? new Date(payment.date).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0]
                });
                if (payment.advanceSessions && Array.isArray(payment.advanceSessions) && payment.advanceSessions.length > 0) {
                    setAdvanceServices(payment.advanceSessions.map((session: any) => ({
                        date: session.date || '',
                        time: session.time || '',
                        sessionType: session.sessionType || 'psicologia',
                        serviceType: session.serviceType || 'individual_session',
                        amount: session.amount || 0,
                        isEvaluation: session.serviceType === 'evaluation'
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
                    isEvaluation: false,
                    paymentDate: new Date().toISOString().split('T')[0]
                });
                setAdvanceServices([]);
            }
        }
    }, [open, payment, patient, doctors]);

    const handlePaymentAmountChange = (e: { target: { name: string; value: number; type: string } }) => {
        setPaymentData(prev => ({ ...prev, amount: e.target.value }));
    };

    const handleAdvanceServiceAmountChange = (index: number) => (e: { target: { name: string; value: number; type: string } }) => {
        const newServices = [...advanceServices];
        newServices[index] = { ...newServices[index], amount: e.target.value };
        setAdvanceServices(newServices);
    };

    const handlePaymentDataChange = (field: string, value: any) => {
        setPaymentData(prev => ({ ...prev, [field]: value }));
        if (field === 'serviceType' && value === 'evaluation') {
            setShowEvaluationFields(true);
        } else if (field === 'serviceType' && value !== 'evaluation') {
            setShowEvaluationFields(false);
        }
    };

    const handleAdvanceServiceChange = (index: number, field: keyof AdvanceService, value: any) => {
        const newServices = [...advanceServices];
        newServices[index] = { ...newServices[index], [field]: value };
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
            console.log('[PaymentModal] handleSubmit paymentData:', {
                paymentDate: paymentData.paymentDate,
                patientId: paymentData.patientId,
                doctorId: paymentData.doctorId,
                amount: paymentData.amount,
                paymentMethod: paymentData.paymentMethod,
                fullPaymentData: { ...paymentData },
            });
            const payload: any = {
                ...paymentData,
                amount: amount,
                date: paymentData.paymentDate
            };
            console.log('[PaymentModal] payload a enviar:', { date: payload.date, paymentDate: payload.paymentDate, amount: payload.amount });
            const paymentId = payment?._id || (payment as any)?.id;
            if (paymentId) {
                payload._id = paymentId;
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
            toast.error(extractErrorMessage(error, 'Erro ao registrar pagamento'));
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

    const calculateTotal = () => {
        const currentAmount = parseFloat(paymentData.amount.toString()) || 0;
        const advanceTotal = advanceServices.reduce((total, service) => total + (parseFloat(service.amount.toString()) || 0), 0);
        return currentAmount + advanceTotal;
    };

    if (!open) return null;

    return (
        <Modal
            isOpen={open}
            onRequestClose={onClose}
            className="w-full max-w-4xl mx-auto p-4 bg-white rounded-xl shadow-lg"
            overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            ariaHideApp={false}
        >
            {/* Cabeçalho simplificado */}
            <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" />
                    {payment
                        ? `Editar Pagamento - ${payment.patient?.fullName || ''}`
                        : patient
                            ? `Registrar Pagamento - ${patient.fullName}`
                            : 'Registrar Pagamento'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Fechar modal"
                    disabled={isLoading}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Corpo do Modal */}
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {/* Paciente e Tipo de Serviço */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patients && patients.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <Label className="block mb-1 text-xs font-medium text-gray-600 flex items-center gap-1">
                                <Users size={14} /> Paciente *
                            </Label>
                            <Select
                                value={paymentData.patientId}
                                onChange={(e) => handlePaymentDataChange('patientId', e.target.value)}
                                disabled={isLoading}
                                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                            >
                                <option value="">Selecione um paciente</option>
                                {patients?.map(p => (
                                    <option key={p._id} value={p._id}>{p.fullName}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Label className="block mb-1 text-xs font-medium text-gray-600 flex items-center gap-1">
                            <Stethoscope size={14} /> Tipo de Serviço *
                        </Label>
                        <Select
                            value={paymentData.serviceType}
                            onChange={(e) => handlePaymentDataChange('serviceType', e.target.value)}
                            disabled={isLoading}
                            className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                        >
                            <option value="individual_session">Sessão Individual</option>
                            <option value="evaluation">Avaliação</option>
                            <option value="package_session">Pacote</option>
                            <option value="workshop">Workshop</option>
                            <option value="consultation">Consulta</option>
                        </Select>
                        {paymentData.serviceType === 'evaluation' && (
                            <div className="mt-1 flex items-center gap-1 text-blue-600 text-xs">
                                <Clock size={12} />
                                <span>Registrando uma avaliação</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profissional e Especialidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Label className="flex mb-1 text-xs font-medium text-gray-600 items-center gap-1">
                            <User size={14} /> Profissional *
                        </Label>
                        <Select
                            value={paymentData.doctorId}
                            onChange={(e) => handlePaymentDataChange('doctorId', e.target.value)}
                            disabled={isLoading || doctors.length === 0}
                            className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                        >
                            {doctors && doctors.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>
                                    {doctor.fullName} - {doctor.specialty}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <Label className="block mb-1 text-xs font-medium text-gray-600">Especialidade *</Label>
                        <Select
                            value={paymentData.specialty}
                            onChange={(e) => handlePaymentDataChange('specialty', e.target.value)}
                            disabled={isLoading}
                            className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                        >
                            {EspecialidadesDisponiveis.map(service => (
                                <option key={service.value} value={service.value}>{service.label}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Pagamento atual */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <DollarSign size={16} className="text-emerald-600" />
                        {paymentData.serviceType === 'evaluation' ? 'Pagamento da Avaliação' : 'Pagamento da Sessão'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="block mb-1 text-xs font-medium text-gray-600">
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
                                    : 'Deixe zero se for apenas agendamento futuro'}
                            </p>
                        </div>
                        <div>
                            <Label className="block mb-1 text-xs font-medium text-gray-600">Forma de Pagamento *</Label>
                            <Select
                                value={paymentData.paymentMethod}
                                onChange={(e) => handlePaymentDataChange('paymentMethod', e.target.value)}
                                disabled={isLoading}
                                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                            >
                                {PaymentMethods.map(method => (
                                    <option key={method.value} value={method.value}>{method.label}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <Label className="block mb-1 text-xs font-medium text-gray-600 flex items-center gap-1">
                                <Calendar size={14} /> Data do Pagamento *
                            </Label>
                            <Input
                                type="date"
                                value={paymentData.paymentDate}
                                onChange={(e) => handlePaymentDataChange('paymentDate', e.target.value)}
                                disabled={isLoading}
                                className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* Serviços futuros */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar size={16} className="text-blue-500" />
                                Agendamentos Futuros (Pagamento Antecipado)
                            </h3>
                            <p className="text-xs text-gray-500">Adicione sessões/avaliações que serão realizadas futuramente</p>
                        </div>
                        <button
                            type="button"
                            onClick={addAdvanceService}
                            className="bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700 flex items-center gap-1 text-xs"
                            disabled={isLoading}
                        >
                            <Plus size={14} /> Adicionar
                        </button>
                    </div>

                    {advanceServices.map((service, index) => (
                        <div key={index} className={`bg-white p-3 rounded-md border mb-2 ${service.serviceType === 'evaluation' ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium text-gray-700">
                                        {service.serviceType === 'evaluation' ? 'Avaliação' : 'Sessão'} {index + 1}
                                    </h4>
                                    {service.serviceType === 'evaluation' && (
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">Avaliação</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeAdvanceService(index)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    disabled={isLoading}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <Label className="text-xs text-gray-500 mb-0.5">Data *</Label>
                                    <Input
                                        type="date"
                                        value={service.date}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'date', e.target.value)}
                                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-0.5">Hora *</Label>
                                    <Input
                                        type="time"
                                        value={service.time}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'time', e.target.value)}
                                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                                        disabled={isLoading}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-0.5">Tipo de Serviço *</Label>
                                    <Select
                                        value={service.serviceType}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'serviceType', e.target.value)}
                                        disabled={isLoading}
                                        className="w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md"
                                    >
                                        <option value="individual_session">Sessão Individual</option>
                                        <option value="evaluation">Avaliação</option>
                                        <option value="package_session">Pacote</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-500 mb-0.5">Valor (R$) *</Label>
                                    <InputCurrency
                                        value={service.amount}
                                        onChange={(e) => handleAdvanceServiceChange(index, 'amount', e.target.value)}
                                        disabled={isLoading}
                                        className="w-full p-1.5 text-sm border border-gray-300 rounded-md"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <div className="mt-2">
                                <Label className="text-xs text-gray-500 mb-0.5">Terapia/Especialidade</Label>
                                <Select
                                    value={service.sessionType}
                                    onChange={(e) => handleAdvanceServiceChange(index, 'sessionType', e.target.value)}
                                    disabled={isLoading}
                                    className="w-full p-1.5 text-sm bg-white border border-gray-300 rounded-md"
                                >
                                    {EspecialidadesDisponiveis.map(esp => (
                                        <option key={esp.value} value={esp.value}>{esp.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    ))}

                    {advanceServices.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-3 bg-white rounded border border-dashed">
                            Nenhum agendamento futuro adicionado
                        </p>
                    )}
                </div>

                {/* Resumo do total */}
                {advanceServices.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <DollarSign size={16} className="text-purple-600" />
                            Resumo do Pagamento
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500">Pagamento atual:</span>
                                <div className="font-semibold">
                                    R$ {parseFloat(paymentData.amount.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-500">{advanceServices.length} serviço(s) futuro(s):</span>
                                <div className="font-semibold">
                                    R$ {advanceServices.reduce((total, service) => total + (parseFloat(service.amount.toString()) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="border-t pt-1">
                                <span className="text-gray-500">Total:</span>
                                <div className="font-semibold text-base text-purple-600">
                                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Observações */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <Label className="block mb-1 text-xs font-medium text-gray-600">Observações</Label>
                    <Textarea
                        value={paymentData.notes}
                        onChange={(e) => handlePaymentDataChange('notes', e.target.value)}
                        disabled={isLoading}
                        placeholder="Detalhes do pagamento, observações importantes, etc."
                        rows={2}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    />
                </div>
            </div>

            {/* Rodapé */}
            <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-gray-200">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !canSubmit}
                    className={`px-5 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 flex items-center ${isLoading || !canSubmit ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {isLoading ? (
                        <>
                            <LoadingSpinner size="small" color="border-white" />
                            <span className="ml-2">Registrando...</span>
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            {payment ? 'Atualizar Pagamento' : 'Confirmar Pagamento'}
                        </>
                    )}
                </Button>
            </div>
        </Modal>
    );
};