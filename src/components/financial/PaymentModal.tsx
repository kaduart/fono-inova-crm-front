import { Calendar, Check, ChevronDown, DollarSign, Plus, User, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from 'react-modal';
import { FinancialRecord } from '../../services/paymentService';
import { EspecialidadesDisponiveis, IDoctor, IPatient, PaymentMethods, ServiceTypes } from '../../utils/types/types';
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
    const [advanceSessions, setAdvanceSessions] = useState<Array<{
        date: string;
        time: string;
        sessionType: string;
    }>>([]);

    const [paymentData, setPaymentData] = useState({
        patientId: '',
        doctorId: '',
        serviceType: 'individual_session' as const,
        amount: 0,
        paymentMethod: 'cartão' as const,
        notes: '',
        specialty: 'fonoaudiologia' as const,
        status: 'paid' as const
    });

    const canSubmit = useMemo(() => {
        // Campos obrigatórios
        if (!paymentData.patientId || !paymentData.doctorId || !paymentData.specialty) {
            return false;
        }

        // Para sessão avulsa, valor e método de pagamento são obrigatórios
        if (paymentData.serviceType === 'individual_session') {
            const amount = parseFloat(paymentData.amount.toString());
            if (isNaN(amount) || amount <= 0 || !paymentData.paymentMethod) {
                return false;
            }
        }

        return true;
    }, [paymentData]);

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
                    specialty: payment.doctor?.specialty || 'fonoaudiologia'
                });

                if (payment.advanceSessions && payment.advanceSessions.length > 0) {
                    setAdvanceSessions(payment.advanceSessions.map(session => ({
                        date: session.date || '',
                        time: session.time || '',
                        sessionType: session.sessionType || 'fonoaudiologia'
                    })));
                } else {
                    setAdvanceSessions([]);
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
                    specialty: patient?.specialty || 'fonoaudiologia'
                });
                setAdvanceSessions([]);
            }
        }
    }, [open, payment, patient, doctors]);

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
        if (isNaN(amount) || amount <= 0) {
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

            if (advanceSessions.length > 0) {
                payload.advanceSessions = advanceSessions;
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

    const addAdvanceSession = () => {
        setAdvanceSessions([
            ...advanceSessions,
            { date: '', time: '', sessionType: 'psicologia' }
        ]);
    };

    const removeAdvanceSession = (index: number) => {
        const newSessions = [...advanceSessions];
        newSessions.splice(index, 1);
        setAdvanceSessions(newSessions);
    };

    const handleAdvanceSessionChange = (
        index: number,
        field: 'date' | 'time' | 'specialty' | 'amount',
        value: string
    ) => {
        const newSessions = [...advanceSessions];
        newSessions[index][field] = value;
        setAdvanceSessions(newSessions);
    };

    if (!open) return null;

    return (
        <Modal
            isOpen={open}
            onRequestClose={onClose}
            className="p-6 bg-white rounded-xl max-w-4xl mx-auto my-8 shadow-xl w-full outline-none"
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
                            <Label htmlFor="patientId" className="block mb-2 font-medium text-gray-700 flex items-center gap-2">
                                <Users size={18} /> Paciente *
                            </Label>
                            <div className="relative">
                                <Select
                                    value={paymentData.patientId}
                                    onChange={(e) => setPaymentData({
                                        ...paymentData,
                                        patientId: e.target.value
                                    })}
                                    disabled={isLoading}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Selecione um paciente</option>
                                    {patients?.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.fullName}
                                        </option>
                                    ))}
                                </Select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <ChevronDown className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label htmlFor="serviceType" className="block mb-2 font-medium text-gray-700">
                            Tipo de Serviço *
                        </Label>
                        <div className="relative">
                            <Select
                                value={paymentData.serviceType}
                                onChange={(e) => setPaymentData({
                                    ...paymentData,
                                    serviceType: e.target.value
                                })}
                                disabled={isLoading}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {ServiceTypes.map(service => (
                                    <option key={service.value} value={service.value}>
                                        {service.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Profissional e Especialidade */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label htmlFor="doctorId" className="flex mb-2 font-medium text-gray-700 flex items-center gap-2">
                            <div className='flex items-center gap-1'>
                                <User size={18} />
                                Profissional *
                            </div>
                        </Label>
                        <div className="relative">
                            <Select
                                value={paymentData.doctorId}
                                onChange={(e) => setPaymentData({
                                    ...paymentData,
                                    doctorId: e.target.value
                                })}
                                disabled={isLoading || doctors.length === 0}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {doctors && doctors.map(doctor => (
                                    <option key={doctor._id} value={doctor._id}>
                                        {doctor.fullName}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <Label htmlFor="specialty" className="block mb-2 font-medium text-gray-700">
                            Especialidade *
                        </Label>
                        <div className="relative">
                            <Select
                                value={paymentData.specialty}
                                onChange={(e) => setPaymentData({
                                    ...paymentData,
                                    specialty: e.target.value
                                })}
                                disabled={isLoading}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {EspecialidadesDisponiveis.map(service => (
                                    <option key={service.value} value={service.value}>
                                        {service.label}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Valor e Forma de Pagamento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <Label className="block mb-2 font-medium text-gray-700">
                            Valor (R$) *
                        </Label>
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
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <Label htmlFor="paymentMethod" className="block mb-2 font-medium text-gray-700">
                            Forma de Pagamento *
                        </Label>
                        <div className="relative">
                            <Select
                                value={paymentData.paymentMethod}
                                onChange={(e) => setPaymentData({
                                    ...paymentData,
                                    paymentMethod: e.target.value
                                })}
                                disabled={isLoading}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                {/* Sessões Futuras */}
                {paymentData.serviceType === 'individual_session' && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-600" />
                                Sessões Futuras Pagas
                            </h3>
                            <button
                                type="button"
                                onClick={addAdvanceSession}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                disabled={isLoading}
                            >
                                <Plus size={16} className="mr-1" /> Adicionar Sessão
                            </button>
                        </div>

                        {advanceSessions.map((session, index) => (
                            <div key={index} className="flex flex-row items-end gap-5 flex-wrap">
                                <div className="w-36">
                                    <Label className="text-xs text-gray-600 mb-1">Data</Label>
                                    <Input
                                        type="date"
                                        value={session.date}
                                        onChange={(e) => handleAdvanceSessionChange(index, 'date', e.target.value)}
                                        className="p-2 border rounded"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="w-40">
                                    <Label className="text-xs text-gray-600 mb-1">Hora</Label>
                                    <Input
                                        type="time"
                                        value={session.time}
                                        onChange={(e) => handleAdvanceSessionChange(index, 'time', e.target.value)}
                                        className="p-2 border rounded"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="w-40">
                                    <Label className="text-xs text-gray-600 mb-1">Tipo</Label>
                                    <Select
                                        value={session.sessionType}
                                        onChange={(e) => handleAdvanceSessionChange(index, 'sessionType', e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        disabled={isLoading}
                                    >
                                        {EspecialidadesDisponiveis.map(esp => (
                                            <option key={esp.value} value={esp.value}>{esp.label}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="w-48">
                                    <InputCurrency
                                        label="Valor Sessão Unitária (R$)"
                                        name="amount"
                                        value={paymentData.amount}
                                        onChange={(e) => handleAdvanceSessionChange(index, 'amount', e.target.value)}
                                        disabled={isLoading}
                                        className="px-3 py-2 border border-gray-300 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="flex items-end h-full">
                                    <button
                                        type="button"
                                        onClick={() => removeAdvanceSession(index)}
                                        className="text-red-500 hover:text-red-700 p-2"
                                        disabled={isLoading}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {advanceSessions.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                                Nenhuma sessão futura adicionada
                            </p>
                        )}
                    </div>
                )}

                {/* Observações */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <Label htmlFor="notes" className="block mb-2 font-medium text-gray-700">
                        Observações
                    </Label>
                    <Textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({
                            ...paymentData,
                            notes: e.target.value
                        })}
                        disabled={isLoading}
                        placeholder="Detalhes do pagamento, observações importantes, etc."
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Rodapé com botões - CORREÇÃO APLICADA AQUI */}
            <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-gray-200">
                <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !canSubmit}
                    className={`px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:opacity-90 transition-opacity flex items-center ${isLoading || !canSubmit ? 'opacity-70 cursor-not-allowed' : ''}`}
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