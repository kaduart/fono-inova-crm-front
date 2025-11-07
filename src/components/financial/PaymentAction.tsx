import { CircleCheck, CircleDollarSign, CircleX, DollarSign, Edit, MoreVertical, TimerReset, X } from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';

interface PaymentActionIconsProps {
    payment: FinancialRecord;
    onMarkAsPaid: (payment: FinancialRecord) => void;
    onCancelPayment: (id: string) => void;
    onEditAmount: (id: string) => void;
    onAddPaymentToPackage: (id: string) => void;
    registerAppointmentAndPayemntFuture: (payment: FinancialRecord) => void;
}

export const PaymentActionIcons = ({
    payment,
    onMarkAsPaid,
    onCancelPayment,
    onEditAmount,
    onAddPaymentToPackage,
    registerAppointmentAndPayemntFuture,
}: PaymentActionIconsProps) => {
    const [open, setOpen] = useState(false);

    const getStatusIcon = () => {
        const baseClasses = "flex items-center justify-center";

        switch (payment.status) {
            case 'paid':
                return (
                    <span className={`${baseClasses} text-green-600`} title="Pago">
                        <CircleCheck size={20} />
                    </span>
                );
            case 'canceled':
                return (
                    <span className={`${baseClasses} text-red-600`} title="Cancelado">
                        <CircleX size={20} />
                    </span>
                );
            default:
                return null;
        }
    };

    const menuItems = [
        ...(payment.serviceType === 'package_session' && payment.package?._id
            ? [{
                icon: DollarSign,
                label: 'Adicionar Pagamento',
                onClick: () => onAddPaymentToPackage(payment.package._id),
                color: 'text-emerald-700 hover:bg-emerald-50'
            }]
            : []),

        ...(payment.status !== 'paid' && payment.status !== 'canceled'
            ? [
                {
                    icon: CircleDollarSign,
                    label: 'Marcar sessão como paga',
                    onClick: () => onMarkAsPaid(payment),
                    color: 'text-green-700 hover:bg-green-50'
                },
                {
                    icon: TimerReset,
                    label: 'Add pagamento futuro',
                    onClick: () => registerAppointmentAndPayemntFuture(payment),
                    color: 'text-purple-700 hover:bg-purple-50'
                },
                {
                    icon: Edit,
                    label: 'Editar Valor',
                    onClick: () => onEditAmount(payment._id),
                    color: 'text-blue-700 hover:bg-blue-50'
                }
            ]
            : []),

        ...(payment.status !== 'canceled'
            ? [{
                icon: X,
                label: 'Cancelar',
                onClick: () => onCancelPayment(payment._id),
                color: 'text-red-700 hover:bg-red-50'
            }]
            : [])
    ];

    return (
        <div className="relative flex items-center gap-3">
            {getStatusIcon()}

            <button
                onClick={() => setOpen((prev) => !prev)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-lg"
                title="Mais opções"
            >
                <MoreVertical size={20} />
            </button>

            {open && (
                <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setOpen(false)}
                    />

                    <div
                        className="absolute right-0 top-10 z-10 w-56 bg-white shadow-xl rounded-xl border border-gray-100 py-2 text-sm animate-fade-in"
                        onMouseLeave={() => setOpen(false)}
                    >
                        {menuItems.map((item, index) => (
                            <button
                                key={index}
                                onClick={item.onClick}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-200 ${item.color}`}
                            >
                                <item.icon size={18} className="flex-shrink-0" />
                                <span className="text-left font-medium">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};