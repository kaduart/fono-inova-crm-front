import { parse } from 'date-fns';
import { useEffect, useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { dateFormat } from '../../utils/dateFormat';
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
    }) => Promise<void>;
}

export const EditPaymentModal = ({
    payment,
    isOpen,
    onClose,
    onSave
}: EditPaymentModalProps) => {
    if (!payment) return null;
    const [formData, setFormData] = useState({
        amount: payment.amount,
        serviceType: payment.serviceType,
        date: payment.date || payment.createdAt,
        paymentMethod: payment.paymentMethod,
        status: '',
    });
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        setFormData({
            amount: payment.amount,
            date: payment.date || payment.createdAt,
            paymentMethod: payment.paymentMethod,
            status: payment.status || '',
            serviceType: payment.serviceType || 'evaluation', // Default to 'evaluation' if not set
        });
    }, [payment]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const isoDate = parse(formData.date, 'dd/MM/yyyy', new Date()).toISOString();
            await onSave({
                ...payment,
                amount: formData.amount,
                date: isoDate,
                status: formData.status,
                paymentMethod: formData.paymentMethod,
                serviceType: formData.serviceType,
            });

        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        if (payment) {
            const formatted = dateFormat(payment.date || payment.createdAt);
            setFormData({
                amount: payment.amount,
                date: formatted,
                paymentMethod: payment.paymentMethod,
                status: payment.status || '',
                serviceType: payment.serviceType,
            });
        }
    }, []);
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-800">Editar Pagamento</h2>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-4">
                    {/* Campo Tipo de Serviço */}
                    <div className="mb-5">
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Serviço *
                        </Label>
                        <Select
                            name="serviceType"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

                    {/* Campo Valor */}
                    <div className="mb-5">
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                            Valor (R$)
                        </Label>
                        <InputCurrency
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            placeholder="R$ 0,00"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Campo Data */}
                    <div className="mb-5">
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                            Data
                        </Label>
                        <Input
                            mask='99/99/9999'
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>

                    {/* Campo Método de Pagamento */}
                    <div className="mb-6">
                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                            Método de Pagamento
                        </Label>
                        <Select
                            name="paymentMethod"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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

                    <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200">
                        <Button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-70"
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </span>
                            ) : 'Salvar Alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
};
