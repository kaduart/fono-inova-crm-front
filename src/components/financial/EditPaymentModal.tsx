import { format, parse } from 'date-fns';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { PaymentMethods, ServiceTypes } from '../../utils/types/types';
import { Button } from '../ui/Button';
import Input from '../ui/Input';
import InputCurrency from '../ui/InputCurrency';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';

interface EditPaymentModalProps {
    payment: FinancialRecord;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        id: string;
        amount: number;
        date: string;
        status: string;
        paymentMethod: string;
        serviceType: string;
        specialty: string;
    }) => Promise<void>;
}

export const EditPaymentModal = ({
    payment,
    isOpen,
    onClose,
    onSave
}: EditPaymentModalProps) => {
    const [formData, setFormData] = useState({
        amount: 0,
        serviceType: 'evaluation',
        date: '',
        paymentMethod: 'pix',
        status: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (payment) {
            const dateToFormat = payment.date || payment.createdAt;
            const parsedDate = new Date(dateToFormat);
            const formattedDate = format(parsedDate, 'dd/MM/yyyy');

            setFormData({
                amount: payment.amount || 0,
                date: formattedDate,
                paymentMethod: payment.paymentMethod || 'pix',
                status: payment.status || 'pending',
                serviceType: payment.serviceType || 'evaluation',
            });
        }
    }, [payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const isoDate = parse(formData.date, 'dd/MM/yyyy', new Date()).toISOString();

            await onSave({
                id: payment._id,
                amount: formData.amount,
                date: isoDate,
                status: formData.status,
                paymentMethod: formData.paymentMethod,
                serviceType: formData.serviceType,
                specialty: payment.specialty || payment.doctor?.specialty || '',
            });
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: number | string; type?: string } }) => {
        const { name, value, type } = e.target;
        if (name === 'amount') {
            setFormData((prev) => ({ ...prev, [name]: typeof value === 'number' ? value : Number(value) || 0 }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    if (!isOpen || !payment) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header simplificado */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Editar Pagamento</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Atualize as informações</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
                        disabled={isSaving}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Tipo de Serviço */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700">Tipo de Serviço</Label>
                        <Select
                            name="serviceType"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                            value={formData.serviceType}
                            onChange={handleChange}
                            required
                        >
                            {ServiceTypes.map(service => (
                                <option key={service.value} value={service.value}>
                                    {service.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Valor */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700">Valor</Label>
                        <InputCurrency
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="R$ 0,00"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                        />
                    </div>

                    {/* Data */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700">Data</Label>
                        <Input
                            mask='99/99/9999'
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            placeholder="DD/MM/AAAA"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                        />
                    </div>

                    {/* Método de Pagamento */}
                    <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-700">Método de Pagamento</Label>
                        <Select
                            name="paymentMethod"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                            value={formData.paymentMethod}
                            onChange={handleChange}
                            required
                        >
                            {PaymentMethods.map(method => (
                                <option key={method.value} value={method.value}>
                                    {method.label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {/* Botões */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </span>
                            ) : (
                                "Salvar Alterações"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};