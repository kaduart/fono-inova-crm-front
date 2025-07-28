// components/PixNotificationPopup.tsx
import { X } from 'lucide-react';
import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../utils/format';

const PixNotificationPopup: React.FC = () => {
    const { paymentNotification, closePaymentNotification } = useNotification();

    if (!paymentNotification) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm w-full">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center">
                            <div className="bg-green-100 p-2 rounded-full mr-3">
                                <div className="bg-green-500 w-4 h-4 rounded-full"></div>
                            </div>
                            <h3 className="font-semibold text-green-800">Pagamento Recebido!</h3>
                        </div>

                        <div className="ml-9 mt-2">
                            <p className="text-sm text-gray-700">
                                Recebemos seu pagamento Pix de <span className="font-bold">{formatCurrency(paymentNotification.amount)}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Para a consulta #{paymentNotification.appointmentId}
                            </p>
                            <p className="text-xs text-gray-500">
                                {paymentNotification.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={closePaymentNotification}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-3 pt-3 border-t border-green-100">
                    <button
                        onClick={closePaymentNotification}
                        className="text-green-700 hover:text-green-900 text-sm font-medium"
                    >
                        Ver detalhes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PixNotificationPopup;