import { CalendarClock, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from '../../utils/toast';
import { IDoctor, IPatient } from '../../utils/types/types';
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';

import { notifyApiError } from '../../utils/notifyApiError';
import { sessoes } from '../../utils/plural';

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
        amount: '',
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
                amount: '',
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

        const amount = parseFloat(paymentData.amount);
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
            notifyApiError(error, 'Erro ao registrar pagamento');
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

    const money = parseFloat(paymentData.amount);
    const summary = money > 0
        ? `${money.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${advanceSessions.length} ${sessoes(advanceSessions.length)}`
        : null;
    const set = (patch: Partial<typeof paymentData>) => setPaymentData({ ...paymentData, ...patch });

    return (
        <Modal
            open={open}
            onClose={() => !isLoading && onClose()}
            labelledBy="advanced-payment-title"
            zIndexClass="z-[1300]"
            panelClassName="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
        >
            <ModalHeader
                icon={<CalendarClock className="w-6 h-6" />}
                color="#059669"
                title="Pagamento de sessões futuras"
                subtitle="Paciente paga agora, sessões ficam agendadas"
                onClose={onClose}
                titleId="advanced-payment-title"
            />

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Paciente" required>
                        <select
                            value={paymentData.patientId}
                            onChange={(e) => set({ patientId: e.target.value })}
                            disabled={isLoading}
                            className={inputClass('emerald')}
                        >
                            <option value="">Selecione um paciente</option>
                            {patients.map((patient) => (
                                <option key={patient._id} value={patient._id}>{patient.fullName}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Profissional" required>
                        <select
                            value={paymentData.doctorId}
                            onChange={(e) => set({ doctorId: e.target.value })}
                            disabled={isLoading || doctors.length === 0}
                            className={inputClass('emerald')}
                        >
                            {doctors.map((doctor) => (
                                <option key={doctor._id} value={doctor._id}>{doctor.fullName}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">Sessões futuras</span>
                        <button
                            type="button"
                            onClick={addSession}
                            className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-emerald-700 transition-colors duration-quick hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                            <Plus size={16} /> Adicionar sessão
                        </button>
                    </div>
                    <div className="space-y-3">
                        {advanceSessions.map((session, index) => (
                            <div key={index} className="grid grid-cols-2 items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:grid-cols-[1fr_8rem_1fr_auto]">
                                <Field label="Data">
                                    <input type="date" value={session.date} onChange={(e) => updateSession(index, 'date', e.target.value)} className={inputClass('emerald')} />
                                </Field>
                                <Field label="Horário">
                                    <input type="time" value={session.time} onChange={(e) => updateSession(index, 'time', e.target.value)} className={inputClass('emerald')} />
                                </Field>
                                <Field label="Tipo" className="col-span-2 sm:col-span-1">
                                    <select value={session.sessionType} onChange={(e) => updateSession(index, 'sessionType', e.target.value)} className={inputClass('emerald')}>
                                        <option value="psicologia">Psicologia</option>
                                        <option value="neuropsicologia">Neuropsicologia</option>
                                        <option value="orientacao">Orientação</option>
                                    </select>
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => removeSession(index)}
                                    disabled={advanceSessions.length <= 1}
                                    aria-label="Remover sessão"
                                    className="col-span-2 flex h-11 w-11 items-center justify-center justify-self-end rounded-xl text-gray-400 transition-colors duration-quick hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-40 sm:col-span-1"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <Field
                    label="Valor total"
                    required
                    hint={`Valor total para ${advanceSessions.length} ${sessoes(advanceSessions.length)}`}
                >
                    <MoneyInput large value={paymentData.amount} onChange={(v) => set({ amount: v })} accent="emerald" />
                </Field>

                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
                    <ChoiceChips
                        label="Forma de pagamento"
                        value={paymentData.paymentMethod}
                        onChange={(v) => set({ paymentMethod: v })}
                        options={[
                            { value: 'cartão', label: 'Cartão' },
                            { value: 'pix', label: 'Pix' },
                            { value: 'dinheiro', label: 'Dinheiro' },
                            { value: 'transferência', label: 'Transferência' },
                        ]}
                    />
                </div>

                <Field label="Observações">
                    <textarea
                        value={paymentData.notes}
                        onChange={(e) => set({ notes: e.target.value })}
                        disabled={isLoading}
                        placeholder="Opcional"
                        rows={2}
                        className={`${inputClass('emerald')} resize-none`}
                    />
                </Field>
            </div>

            <ModalFooter
                accent="emerald"
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={isLoading}
                submitLabel="Registrar pagamento"
                submittingLabel="Registrando..."
                summary={summary}
            />
        </Modal>
    );
};
