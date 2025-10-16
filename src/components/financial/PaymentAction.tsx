import { Check, CircleCheck, CircleX, DollarSign, Edit, MoreVertical, X } from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';

interface PaymentActionIconsProps {
    payment: FinancialRecord;
    onMarkAsPaid: (payment: FinancialRecord) => void;
    onCancelPayment: (id: string) => void;
    onEditAmount: (id: string) => void;
    onAddPaymentToPackage: (id: string) => void;
}

export const PaymentActionIcons = ({
    payment,
    onMarkAsPaid,
    onCancelPayment,
    onEditAmount,
    onAddPaymentToPackage
}: PaymentActionIconsProps) => {
    const [open, setOpen] = useState(false);

    const getStatusIcon = () => {
        switch (payment.status) {
            case 'paid':
                return (
                    <span className="text-green-500 flex items-center" title="Pago">
                        <CircleCheck size={18} />
                    </span>
                );
            case 'canceled':
                return (
                    <span className="text-red-500 flex items-center" title="Cancelado">
                        <CircleX size={18} />
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="relative flex items-center space-x-2">
            {getStatusIcon()}

            <button
                onClick={() => setOpen((prev) => !prev)}
                className="text-gray-500 hover:text-gray-700 transition"
                title="Mais opções"
            >
                <MoreVertical size={18} />
            </button>

            {open && (
                <div
                    className="absolute right-0 top-6 z-10 w-44 bg-white shadow-lg rounded-lg border border-gray-200 p-2 text-sm animate-fade-in"
                    onMouseLeave={() => setOpen(false)}
                >
                    {payment.serviceType === 'package_session' && (
                        <button
                            onClick={() => {
                                onAddPaymentToPackage(payment.package?._id);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors"
                        >
                            <DollarSign size={16} /> Adicionar Pagamento
                        </button>
                    )}

                    {payment.status !== 'paid' && payment.status !== 'canceled' && (
                        <>
                            <button
                                onClick={() => {
                                    onMarkAsPaid(payment);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-green-50 text-green-700 transition-colors"
                            >
                                <Check size={16} /> Marcar como Pago
                            </button>

                            <button
                                onClick={() => {
                                    onEditAmount(payment._id);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 text-blue-700 transition-colors"
                            >
                                <Edit size={16} /> Editar Valor
                            </button>
                        </>
                    )}

                    {payment.status !== 'canceled' && (
                        <button
                            onClick={() => {
                                onCancelPayment(payment._id);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-50 text-red-700 transition-colors"
                        >
                            <X size={16} /> Cancelar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
