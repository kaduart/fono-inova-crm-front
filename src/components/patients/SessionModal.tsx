import { PlusCircle, Save, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';
// (máscara agora em components/ui/MaskedInput)
import { toast } from '../../utils/toast';
import { IDoctor, ISession, THERAPY_TYPES } from '../../utils/types/types';
import { Modal } from '../ui/Modal';
import { ModalHeader, ModalFooter, Field, ChoiceChips, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/TextArea';
import CancelRequesterPicker from '../calendar/CancelRequesterPicker';


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
    const title = action === 'edit' ? 'Editar Sessão' : 'Registrar Uso da Sessão';
    const submitText = action === 'edit' ? 'Salvar Alterações' : 'Registrar Sessão';
    
    const [isFormValid, setIsFormValid] = useState(false);

    // 🛡️ Sessão de pacote já concluída não pode ter data/horário/profissional
    // reescritos por aqui — o histórico (sessionsDone incrementado, Payment
    // liquidado) já foi processado. Backend tem o mesmo guard (defesa em
    // profundidade); isso aqui é só a UX de não deixar tentar. Cancelamento
    // (mudar Status para "Cancelada") continua permitido normalmente.
    const isCompletedLocked = action === 'edit' && sessionData.status === 'completed';

    useEffect(() => {
        const isValid = Boolean(
            sessionData.doctorId &&
            sessionData.date &&
            sessionData.time
        );
        setIsFormValid(isValid);
    }, [sessionData.doctorId, sessionData.date, sessionData.time]);



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
        if (sessionData.status === 'canceled' && !sessionData.cancelRequester) {
            toast.error("Informe quem solicitou o cancelamento!");
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

    const PAY: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', 'cartão': 'Cartão' };
    const STATUS: Record<string, string> = { pending: 'Pendente', completed: 'Concluída', canceled: 'Cancelada', scheduled: 'Agendada' };
    const amount = Number(sessionData.paymentAmount || 0);
    const summaryText = [
        amount > 0 ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null,
        sessionData.paymentMethod ? PAY[sessionData.paymentMethod] : null,
        STATUS[sessionData.status || 'pending'],
        sessionData.date ? `${String(sessionData.date).substring(8, 10)}/${String(sessionData.date).substring(5, 7)}${sessionData.time ? ` às ${sessionData.time}` : ''}` : null,
    ].filter(Boolean).join(' · ');

    return (
        <Modal
            open
            onClose={() => !loading && onClose()}
            labelledBy="session-modal-title"
            zIndexClass="z-[100]"
            panelClassName="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
        >
            <>
                <ModalHeader
                    icon={action === 'edit' ? <Save className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                    color="#059669"
                    title={title}
                    subtitle={action === 'edit' ? 'Atualize os dados da sessão' : 'Registre uma nova sessão do pacote'}
                    onClose={onClose}
                    titleId="session-modal-title"
                />

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field label="Valor pago">
                            <MoneyInput
                                large
                                accent="emerald"
                                value={sessionData.paymentAmount ? String(Number(sessionData.paymentAmount).toFixed(2)) : ''}
                                onChange={(v) => onSessionDataChange({ ...sessionData, paymentAmount: v === '' ? 0 : Number(v) })}
                            />
                        </Field>
                        <Field label="Data" required>
                            <input
                                type="date"
                                value={sessionData.date ? String(sessionData.date).substring(0, 10) : ''}
                                onChange={(e) => onSessionDataChange({ ...sessionData, date: e.target.value })}
                                disabled={isCompletedLocked}
                                className={inputClass('emerald')}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
                        <Field label="Profissional" required>
                            <Select
                                value={sessionData.doctorId || ''}
                                onChange={(e) => onSessionDataChange({ ...sessionData, doctorId: e.target.value })}
                                disabled={isCompletedLocked}
                                className={inputClass('emerald')}
                            >
                                <option value="">Selecione um profissional</option>
                                {doctors.map((doctor) => (
                                    <option key={doctor._id} value={doctor._id}>{doctor.fullName}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Horário" required>
                            <input
                                type="time"
                                step={900}
                                value={sessionData.time || ''}
                                onChange={(e) => onSessionDataChange({ ...sessionData, time: e.target.value })}
                                disabled={isCompletedLocked}
                                className={inputClass('emerald')}
                            />
                        </Field>
                    </div>

                    {isCompletedLocked && (
                        <p className="-mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                            <Ban className="h-3.5 w-3.5 shrink-0" />
                            Sessão concluída: data, horário e profissional não podem mais ser alterados.
                        </p>
                    )}

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-gray-600">Situação</span>
                        <ChoiceChips
                            label="Situação"
                            fill
                            value={(sessionData.status || 'pending') as string}
                            onChange={(v) => onSessionDataChange({ ...sessionData, status: v as ISession['status'] })}
                            options={STATUS_OPTIONS}
                        />
                        {sessionData.sessionType && (
                            <p className="mt-2 text-xs text-gray-500">
                                Tipo de sessão: <span className="font-medium text-gray-700">{THERAPY_TYPES.find((t) => t.value === sessionData.sessionType)?.label || sessionData.sessionType}</span>
                            </p>
                        )}
                    </div>

                    {sessionData.status === 'canceled' && (
                        <>
                            <CancelRequesterPicker
                                value={sessionData.cancelRequester ?? null}
                                onChange={(v) => onSessionDataChange({ ...sessionData, cancelRequester: v })}
                            />
                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-gray-600">Falta confirmada (o paciente avisou que não vem)</span>
                                <ChoiceChips
                                    label="Falta confirmada"
                                    value={sessionData.confirmedAbsence === true ? 'sim' : sessionData.confirmedAbsence === false ? 'nao' : ''}
                                    onChange={(v) => onSessionDataChange({ ...sessionData, confirmedAbsence: v === 'sim' })}
                                    options={[{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }]}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
                        <ChoiceChips
                            label="Forma de pagamento"
                            fill
                            value={(sessionData.paymentMethod || '') as string}
                            onChange={(v) => onSessionDataChange({ ...sessionData, paymentMethod: (v === 'none' ? '' : v) as typeof sessionData.paymentMethod })}
                            options={[
                                { value: 'pix', label: 'Pix' },
                                { value: 'dinheiro', label: 'Dinheiro' },
                                { value: 'cartão', label: 'Cartão' },
                            ]}
                        />
                    </div>

                    {sessionData.status === 'completed' && (
                        <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                            <label className="flex cursor-pointer items-start gap-3">
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
                                    className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <div>
                                    <span className="text-sm font-semibold text-gray-800">Não remunerar o profissional por esta sessão</span>
                                    <p className="text-xs text-gray-500">A sessão continua faturada e recebida pela clínica, mas não gera comissão ao profissional.</p>
                                </div>
                            </label>
                            {sessionData.professionalPaymentStatus === 'non_payable' && (
                                <Field label="Motivo" required>
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
                                        placeholder="Ex.: Paciente avisou com antecedência"
                                        className={inputClass('emerald')}
                                    />
                                </Field>
                            )}
                            {sessionData.professionalPaymentOverride?.excludedAt && (
                                <p className="text-xs text-gray-500">
                                    Última alteração: {new Date(sessionData.professionalPaymentOverride.excludedAt).toLocaleString('pt-BR')}
                                    {sessionData.professionalPaymentOverride.reason ? ` — ${sessionData.professionalPaymentOverride.reason}` : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <Field label="Observações">
                        <Textarea
                            value={sessionData.notes || ''}
                            onChange={(e) => onSessionDataChange({ ...sessionData, notes: e.target.value })}
                            className={`${inputClass('emerald')} min-h-[88px] resize-none`}
                            placeholder="Detalhes da sessão ou do atendimento"
                        />
                    </Field>
                </div>

                <ModalFooter
                    accent="emerald"
                    onCancel={onClose}
                    onSubmit={handleSubmit}
                    submitting={loading}
                    submitDisabled={!isFormValid}
                    submitLabel={submitText}
                    submittingLabel="Processando..."
                    summary={!isFormValid ? 'Preencha todos os campos obrigatórios (*)' : summaryText}
                />
            </>
        </Modal>
    );
};