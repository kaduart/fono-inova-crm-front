import { DollarSign } from 'lucide-react';
import { useState } from "react";
import { toast } from '../../utils/toast';
import usePayment from "../../hooks/usePayment";
import { Modal } from '../ui/Modal';
import { ChoiceChips, Field, ModalHeader, ModalFooter, MoneyInput, inputClass } from '../../pages/Financial/components/formKit';

import { notifyApiError } from '../../utils/notifyApiError';

interface AddPaymentModalProps {
    packageData: any;
    onClose: () => void;
    onSuccess: (data: any) => void;
}

const paymentMethods = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "pix", label: "Pix" },
    { value: "cartão", label: "Cartão" },
    { value: "transferência", label: "Transferência" },
];

export const AddPaymentModal = ({ packageData, onClose, onSuccess }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [serviceType, setServiceType] = useState("package_session");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Payment Hook
    const { addPayment, loading: isProcessing } = usePayment();

    const handleSubmit = async () => {
        const value = parseFloat(amount);
        if (!(value > 0)) {
            toast.warn("Informe um valor válido");
            return;
        }

        try {
            setLoading(true);

            // Payment
            const result = await addPayment({
                patientId: packageData?.patient?._id,
                doctorId: packageData?.doctor?._id,
                amount: value,
                paymentMethod,
                notes: note
            });

            toast.success("Pagamento registrado com sucesso! 💚");
            onSuccess(result.data);
            onClose();
        } catch (error: any) {
            console.error("Erro ao registrar pagamento:", error);
            notifyApiError(error, "Erro ao registrar pagamento");
        } finally {
            setLoading(false);
        }
    };

    const value = parseFloat(amount);
    const submitting = loading || isProcessing;
    return (
        <Modal
            open
            onClose={() => !submitting && onClose()}
            labelledBy="add-payment-title"
            zIndexClass="z-[1300]"
            panelClassName="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:rounded-[20px]"
        >
            <ModalHeader
                icon={<DollarSign className="w-6 h-6" />}
                color="#059669"
                title="Adicionar pagamento"
                subtitle="Registre um pagamento manual"
                onClose={onClose}
                titleId="add-payment-title"
            />
            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
                <Field label="Valor" required>
                    <MoneyInput large value={amount} onChange={setAmount} accent="emerald" />
                </Field>
                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Tipo de serviço</span>
                    <ChoiceChips
                        label="Tipo de serviço"
                        value={serviceType}
                        onChange={setServiceType}
                        options={[
                            { value: "package_session", label: "Sessão de pacote" },
                            { value: "individual_session", label: "Sessão avulsa" },
                            { value: "evaluation", label: "Avaliação" },
                            { value: "other", label: "Outro" },
                        ]}
                    />
                </div>
                <div>
                    <span className="mb-2 block text-xs font-semibold text-gray-600">Forma de pagamento</span>
                    <ChoiceChips label="Forma de pagamento" value={paymentMethod} onChange={setPaymentMethod} options={paymentMethods} />
                </div>
                <Field label="Observações">
                    <textarea
                        className={`${inputClass('emerald')} resize-none`}
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Opcional"
                    />
                </Field>
            </div>
            <ModalFooter
                accent="emerald"
                onCancel={onClose}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitDisabled={!(value > 0)}
                submitLabel="Registrar pagamento"
                submittingLabel="Registrando..."
                summary={value > 0 ? `${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · ${paymentMethods.find((m) => m.value === paymentMethod)?.label}` : null}
            />
        </Modal>
    );
};
