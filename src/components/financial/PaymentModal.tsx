import { Calendar, DollarSign, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from '../../utils/toast';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, ModalFooter, ModalHeader, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';
import { FinancialRecord } from '../../services/paymentService';
import { EspecialidadesDisponiveis, IDoctor, IPatient, PaymentMethods } from '../../utils/types/types';

import { notifyApiError } from '../../utils/notifyApiError';
import { ymdSP } from '../../utils/dateFormat';

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
        paymentDate: ymdSP()
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
                        ? ymdSP(payment.date)
                        : ymdSP()
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
            notifyApiError(error, 'Erro ao registrar pagamento');
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

    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const currentAmount = parseFloat(paymentData.amount.toString()) || 0;
    const methodLabel = PaymentMethods.find(m => m.value === paymentData.paymentMethod)?.label || paymentData.paymentMethod;
    const [py, pm, pd] = (paymentData.paymentDate || '').split('-');
    const summary = advanceServices.length > 0
        ? `${brl(currentAmount)} agora + ${advanceServices.length} ${advanceServices.length === 1 ? 'futuro' : 'futuros'} = ${brl(calculateTotal())}`
        : `${brl(currentAmount)} · ${methodLabel}${pd ? ` · ${pd}/${pm}/${py}` : ''}`;
    const isEval = paymentData.serviceType === 'evaluation';
    const patientName = payment?.patient?.fullName || patient?.fullName || patients?.find(p => p._id === paymentData.patientId)?.fullName;
    const selectCls = inputClass('emerald');

    return (
        <Modal
            open={open}
            onClose={() => { if (!isLoading) onClose(); }}
            labelledBy="payment-modal-title"
            zIndexClass="z-[99999]"
            panelClassName="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
        >
            <ModalHeader
                icon={<DollarSign className="h-6 w-6" />}
                color="#059669"
                title={payment ? 'Editar pagamento' : 'Registrar pagamento'}
                subtitle={patientName || 'Valor, forma e data do recebimento'}
                onClose={onClose}
                titleId="payment-modal-title"
                closeDisabled={isLoading}
            />

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                {/* Valor em destaque */}
                <div>
                    <span className="mb-1 block text-xs font-semibold text-gray-600">
                        {isEval ? 'Valor da avaliação' : 'Valor da sessão'} {advanceServices.length === 0 ? <span className="text-red-500">*</span> : <span className="font-normal text-gray-400">(opcional)</span>}
                    </span>
                    <MoneyInput
                        large
                        accent="emerald"
                        value={currentAmount > 0 ? currentAmount.toFixed(2) : ''}
                        onChange={(v) => handlePaymentDataChange('amount', v === '' ? 0 : Number(v))}
                    />
                    <span className="mt-1 block text-[11px] text-gray-400">
                        {advanceServices.length === 0 ? 'Obrigatório para registrar o pagamento' : 'Deixe zero se for apenas agendamento futuro'}
                    </span>
                </div>

                <ChoiceChips
                    label="Forma de pagamento"
                    fill
                    value={paymentData.paymentMethod}
                    options={PaymentMethods.map(m => ({ value: m.value, label: m.label }))}
                    onChange={(v) => handlePaymentDataChange('paymentMethod', v)}
                />

                <ChoiceChips
                    label="Tipo de serviço"
                    fill
                    value={paymentData.serviceType}
                    options={[
                        { value: 'individual_session', label: 'Sessão' },
                        { value: 'evaluation', label: 'Avaliação' },
                        { value: 'package_session', label: 'Pacote' },
                        { value: 'workshop', label: 'Workshop' },
                        { value: 'consultation', label: 'Consulta' },
                    ]}
                    onChange={(v) => handlePaymentDataChange('serviceType', v)}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {patients && patients.length > 0 && (
                        <Field label="Paciente" required className="sm:col-span-2">
                            <select value={paymentData.patientId} onChange={(e) => handlePaymentDataChange('patientId', e.target.value)} disabled={isLoading} className={selectCls}>
                                <option value="">Selecione um paciente</option>
                                {patients.map(p => <option key={p._id} value={p._id}>{p.fullName}</option>)}
                            </select>
                        </Field>
                    )}
                    <Field label="Profissional" required>
                        <select value={paymentData.doctorId} onChange={(e) => handlePaymentDataChange('doctorId', e.target.value)} disabled={isLoading || doctors.length === 0} className={selectCls}>
                            {doctors && doctors.map(doctor => (
                                <option key={doctor._id} value={doctor._id}>{doctor.fullName} - {doctor.specialty}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Especialidade" required>
                        <select value={paymentData.specialty} onChange={(e) => handlePaymentDataChange('specialty', e.target.value)} disabled={isLoading} className={selectCls}>
                            {EspecialidadesDisponiveis.map(service => <option key={service.value} value={service.value}>{service.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Data do pagamento" required>
                        <input type="date" value={paymentData.paymentDate} onChange={(e) => handlePaymentDataChange('paymentDate', e.target.value)} disabled={isLoading} className={selectCls} />
                    </Field>
                </div>

                {/* Serviços futuros (pagamento antecipado) */}
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <Calendar size={16} className="text-emerald-600" aria-hidden />
                                Agendamentos futuros
                            </h3>
                            <p className="text-xs text-gray-500">Pagamento antecipado de sessões ou avaliações que serão realizadas depois</p>
                        </div>
                        <button
                            type="button"
                            onClick={addAdvanceService}
                            disabled={isLoading}
                            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <Plus size={14} aria-hidden /> Adicionar
                        </button>
                    </div>

                    <div className="space-y-2">
                        {advanceServices.map((service, index) => (
                            <div key={index} className={`rounded-xl border p-3 ${service.serviceType === 'evaluation' ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/60'}`}>
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-gray-700">
                                        {service.serviceType === 'evaluation' ? 'Avaliação' : 'Sessão'} {index + 1}
                                    </h4>
                                    <button type="button" onClick={() => removeAdvanceService(index)} disabled={isLoading} aria-label={`Remover ${index + 1}`} className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <Field label="Data" required>
                                        <input type="date" value={service.date} onChange={(e) => handleAdvanceServiceChange(index, 'date', e.target.value)} disabled={isLoading} className={selectCls} />
                                    </Field>
                                    <Field label="Hora" required>
                                        <input type="time" value={service.time} onChange={(e) => handleAdvanceServiceChange(index, 'time', e.target.value)} disabled={isLoading} className={selectCls} />
                                    </Field>
                                    <Field label="Tipo" required>
                                        <select value={service.serviceType} onChange={(e) => handleAdvanceServiceChange(index, 'serviceType', e.target.value)} disabled={isLoading} className={selectCls}>
                                            <option value="individual_session">Sessão</option>
                                            <option value="evaluation">Avaliação</option>
                                            <option value="package_session">Pacote</option>
                                        </select>
                                    </Field>
                                    <Field label="Valor" required>
                                        <MoneyInput
                                            accent="emerald"
                                            value={parseFloat(service.amount.toString()) > 0 ? parseFloat(service.amount.toString()).toFixed(2) : ''}
                                            onChange={(v) => handleAdvanceServiceChange(index, 'amount', v === '' ? 0 : Number(v))}
                                        />
                                    </Field>
                                </div>
                                <Field label="Terapia" className="mt-3">
                                    <select value={service.sessionType} onChange={(e) => handleAdvanceServiceChange(index, 'sessionType', e.target.value)} disabled={isLoading} className={selectCls}>
                                        {EspecialidadesDisponiveis.map(esp => <option key={esp.value} value={esp.value}>{esp.label}</option>)}
                                    </select>
                                </Field>
                            </div>
                        ))}
                        {advanceServices.length === 0 && (
                            <p className="rounded-xl border border-dashed border-gray-200 py-3 text-center text-xs text-gray-500">Nenhum agendamento futuro adicionado</p>
                        )}
                    </div>
                </div>

                <Field label="Observações">
                    <textarea
                        value={paymentData.notes}
                        onChange={(e) => handlePaymentDataChange('notes', e.target.value)}
                        disabled={isLoading}
                        placeholder="Detalhes do pagamento, observações importantes, etc."
                        rows={2}
                        className={`${selectCls} resize-none`}
                    />
                </Field>
            </div>

            <ModalFooter
                accent="emerald"
                summary={summary}
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={isLoading}
                submitDisabled={!canSubmit}
                submitTitle={canSubmit ? undefined : 'Preencha paciente, profissional e valor'}
                submitLabel={payment ? 'Atualizar pagamento' : 'Confirmar pagamento'}
                submittingLabel="Registrando..."
            />
        </Modal>
    );
};
