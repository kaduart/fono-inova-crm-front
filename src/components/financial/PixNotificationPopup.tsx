// components/PixNotificationPopup.tsx
import { Calendar, DollarSign, User, X } from 'lucide-react';
import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../utils/format';

interface PaymentNotification {
    id: string;
    amount: number;
    date: Date;
    patientName: string;
}

const PixNotificationPopup: React.FC = () => {
    const { paymentNotification, closePaymentNotification } = useNotification();

    if (!paymentNotification) return null;

    // Formatar data e hora de forma mais completa
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg p-4 max-w-sm w-full relative overflow-hidden">
                {/* Elemento decorativo */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 opacity-10 rounded-full -translate-y-8 translate-x-8"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div className="flex-1">
                        <div className="flex items-center mb-2">
                            <div className="bg-green-100 p-2 rounded-full mr-3 flex items-center justify-center">
                                <DollarSign size={16} className="text-green-600" />
                            </div>
                            <h3 className="font-semibold text-green-800 text-lg">Pagamento Recebido!</h3>
                        </div>

                        <div className="ml-11 mt-3 space-y-2">
                            <div className="flex items-center">
                                <User size={14} className="text-gray-500 mr-2" />
                                <p className="text-sm text-gray-700">
                                    De <span className="font-bold">{paymentNotification.patientName}</span>
                                </p>
                            </div>

                            <div className="flex items-center">
                                <DollarSign size={14} className="text-gray-500 mr-2" />
                                <p className="text-sm text-gray-700">
                                    Valor: <span className="font-bold text-green-600">{formatCurrency(paymentNotification.amount)}</span>
                                </p>
                            </div>

                            <div className="flex items-center">
                                <Calendar size={14} className="text-gray-500 mr-2" />
                                <p className="text-xs text-gray-500">
                                    {formatDate(paymentNotification.date)} às {formatTime(paymentNotification.date)}
                                </p>
                            </div>

                            <p className="text-xs text-gray-400 mt-2">
                                ID: {paymentNotification.id.replace('notif-', '')}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closePaymentNotification}
                        className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 pt-3 border-t border-green-100 border-dashed flex justify-between">
                    <button
                        onClick={closePaymentNotification}
                        className="text-green-700 hover:text-green-900 text-sm font-medium py-1 px-3 rounded-md bg-green-100 hover:bg-green-200 transition-colors"
                    >
                        Ver detalhes
                    </button>
                    <button
                        onClick={closePaymentNotification}
                        className="text-gray-500 hover:text-gray-700 text-sm font-medium py-1 px-3 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PixNotificationPopup;