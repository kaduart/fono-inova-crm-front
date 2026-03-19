import { CreditCard, DollarSign, FileText, Landmark, QrCode, X } from 'lucide-react';
import { useState } from "react";
import { toast } from "react-toastify";
import { addManualPayment } from "../../services/paymentService";
import { Button } from "../ui/Button";
import InputCurrency from '../ui/InputCurrency';
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface AddPaymentModalProps {
    packageData: any;
    onClose: () => void;
    onSuccess: (data: any) => void;
}

const paymentMethods = [
    { value: "dinheiro", label: "Dinheiro", icon: DollarSign },
    { value: "pix", label: "PIX", icon: QrCode },
    { value: "cartão", label: "Cartão", icon: CreditCard },
    { value: "transferência", label: "Transferência", icon: Landmark },
];

export const AddPaymentModal = ({ packageData, onClose, onSuccess }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState("dinheiro");
    const [serviceType, setServiceType] = useState("package_session");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    console.log('Adicionando pagamento ao pacote:', packageData);
    const handleSubmit = async () => {
        if (!amount || amount <= 0) {
            toast.warn("Informe um valor válido");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                packageId: packageData?._id,
                patientId: packageData?.patient?._id,
                doctorId: packageData?.doctor?._id,
                amount,
                paymentMethod,
                serviceType,
                paymentDate: new Date().toISOString().split("T")[0],
                note,
            };


            console.log("📦 Enviando payload de pagamento:", payload);

            const { data } = await addManualPayment(payload);

            toast.success("Pagamento registrado com sucesso! 💚");
            onSuccess(data);
            onClose();
        } catch (error: any) {
            console.error("Erro ao registrar pagamento:", error);
            toast.error("Erro ao registrar pagamento");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transition-all duration-300">
                {/* Header com Gradiente */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:text-green-100 transition-colors p-1 rounded-full hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Adicionar Pagamento</h2>
                            <p className="text-green-100 text-sm mt-1">
                                Registre um novo pagamento manual
                            </p>
                        </div>
                    </div>
                </div>

                {/* Conteúdo do Formulário */}
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Valor */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            Valor do Pagamento *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                            <InputCurrency
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white transition-all duration-200"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    {/* Tipo de Serviço */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Tipo de Serviço *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: "package_session", label: "Sessão de Pacote" },
                                { value: "individual_session", label: "Sessão Avulsa" },
                                { value: "evaluation", label: "Avaliação" },
                                { value: "other", label: "Outro" },
                            ].map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setServiceType(type.value)}
                                    className={`flex items-center justify-center p-3 border rounded-xl text-sm font-medium transition-all
          ${serviceType === type.value
                                            ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-25'}`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Método de Pagamento */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Método de Pagamento *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.value)}
                                        className={`flex items-center gap-2 p-3 border rounded-xl text-sm font-medium transition-all ${paymentMethod === method.value
                                            ? 'border-green-500 bg-green-50 text-green-700 shadow-sm'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-green-300 hover:bg-green-25'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {method.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Observações */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            Observações (Opcional)
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white resize-none transition-all duration-200"
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Adicione uma observação sobre este pagamento..."
                        />
                    </div>
                </div>

                {/* Footer com Botões */}
                <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-200 font-medium"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !amount || amount <= 0}
                        className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${loading || !amount || amount <= 0
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <LoadingSpinner size="small" color="border-white" />
                                <span>Registrando...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                <span>Registrar Pagamento</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};