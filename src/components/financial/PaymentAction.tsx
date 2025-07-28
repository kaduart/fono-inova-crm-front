import { Check, X } from 'lucide-react';
import { FaCheckCircle, FaEdit, FaRegTimesCircle } from 'react-icons/fa';
import { FinancialRecord } from '../../services/paymentService';
import { useEffect } from 'react';

interface PaymentActionIconsProps {
    payment: FinancialRecord;
    onMarkAsPaid: (payment: FinancialRecord) => void;
    onCancelPayment: (id: string) => void;
    onEditAmount: (id: string) => void;
}

export const PaymentActionIcons = ({
    payment,
    onMarkAsPaid,
    onCancelPayment,
    onEditAmount
}: PaymentActionIconsProps) => {

    useEffect(() => {
    }, [payment]);
    const getStatusIcon = () => {
        switch (payment.status) {
            case 'paid':
                return (
                    <span className="text-green-500 flex items-center">
                        <FaCheckCircle className="mr-1" />
                    </span>
                );
            case 'canceled':
                return (
                    <span className="text-red-500 flex items-center">
                        <FaRegTimesCircle className="mr-1" />
                    </span>
                );
            default:
            /*  return (
                 <span className="text-yellow-500 flex items-center">
                     <FaMoneyBillWave className="mr-1" /> 
                 </span>
             ); */
        }
    };

    return (
        <div className="flex items-center space-x-3">
            {/* Ícone de status */}
            {getStatusIcon()}

            {/* Ações condicionais */}
            {payment.status !== 'paid' && payment.status !== 'canceled' && (
                <>
                    <button
                        onClick={() => onMarkAsPaid(payment)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Marcar como pago"
                    >
                        <Check size={18} />
                    </button>

                    <button
                        onClick={() => onEditAmount(payment._id)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Editar valor"
                    >
                        <FaEdit size={16} />
                    </button>
                </>
            )}

            {payment.status !== 'canceled' && (
                <button
                    onClick={() => onCancelPayment(payment._id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Cancelar pagamento"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
};