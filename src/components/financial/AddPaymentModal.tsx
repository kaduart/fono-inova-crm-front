import { useState } from "react";
import { toast } from "react-toastify";
import { addManualPayment } from "../../services/paymentService";
import { Button } from "../ui/Button";

interface AddPaymentModalProps {
    packageId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddPaymentModal = ({ packageId, onClose, onSuccess }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            toast.warn("Informe um valor válido");
            return;
        }

        try {
            setLoading(true);
            await addManualPayment({
                packageId,
                amount,
                paymentMethod,
                note,
                paymentDate: new Date().toISOString().split("T")[0],
            });
            toast.success("Pagamento registrado com sucesso!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error("Erro ao registrar pagamento");
            console.error("Erro ao registrar pagamento:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-[400px]">
                <h2 className="text-lg font-semibold mb-4">Adicionar Pagamento</h2>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Valor</label>
                        <input
                            type="number"
                            className="w-full border rounded p-2"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Método</label>
                        <select
                            className="w-full border rounded p-2"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">Pix</option>
                            <option value="cartão">Cartão</option>
                            <option value="transferência">Transferência</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Observações</label>
                        <textarea
                            className="w-full border rounded p-2"
                            rows={2}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
