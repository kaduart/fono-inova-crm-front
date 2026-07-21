import { Check, CircleCheck, CircleX, DollarSign, Edit, HandCoins, MoreVertical, X } from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';

interface PaymentActionIconsProps {
    payment: FinancialRecord;
    onMarkAsPaid: (payment: FinancialRecord) => void;
    onMarkAsDebit?: (payment: FinancialRecord) => void;
    onCancelPayment: (id: string) => void;
    onEditAmount: (id: string) => void;
    onEditAppointment?: (id: string) => void;
    onAddPaymentToPackage: (id: string) => void;
    disabled?: boolean;
    registerAppointmentAndPayemntFuture?: (payment: FinancialRecord) => void;
}

export const PaymentActionIcons = ({
    payment,
    onMarkAsPaid,
    onMarkAsDebit,
    onCancelPayment,
    onEditAmount,
    onEditAppointment,
    onAddPaymentToPackage,
    disabled,
    registerAppointmentAndPayemntFuture,
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

    // ✅ VALIDAÇÃO: Verifica se pode marcar como pago
    const canMarkAsPaid = () => {
        // Não pode se já está pago ou cancelado
        if (payment.status === 'paid' || payment.status === 'canceled') {
            return false;
        }

        // 🆕 Sessão avulsa/appointment SEM paymentId real → ainda permite clicar
        // (o handler cria o payment automaticamente antes de marcar como pago)
        return true;
    };

    // ✅ Tooltip explicativo
    const getMarkAsPaidTooltip = () => {
        if (payment.status === 'paid') return 'Já está pago';
        if (payment.status === 'canceled') return 'Pagamento cancelado';
        return 'Marcar como pago';
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
                    className="absolute right-0 top-6 z-10 w-56 bg-white shadow-lg rounded-lg border border-gray-200 p-2 text-sm animate-fade-in"
                    onMouseLeave={() => setOpen(false)}
                >
                    {/* ✅ BOTÃO ADICIONAR PAGAMENTO AO PACOTE */}
                    {payment.serviceType === 'package_session' && payment.packageId && (
                        <button
                            onClick={() => {
                                onAddPaymentToPackage(payment.packageId);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors"
                        >
                            <DollarSign size={16} /> Adicionar Pagamento ao Pacote
                        </button>
                    )}

                    {/* ✅ BOTÃO MARCAR COMO PAGO - COM VALIDAÇÃO */}
                    {canMarkAsPaid() ? (
                        <button
                            onClick={() => {
                                onMarkAsPaid(payment);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-green-50 text-green-700 transition-colors"
                            title={getMarkAsPaidTooltip()}
                        >
                            <Check size={16} /> Marcar como Pago
                        </button>
                    ) : (
                        <div
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                            title={getMarkAsPaidTooltip()}
                        >
                            <Check size={16} /> Marcar como Pago
                            {payment.serviceType === 'package_session' && (
                                <span className="text-xs ml-auto">📦 Pacote</span>
                            )}
                        </div>
                    )}

                    {/* ✅ BOTÃO MARCAR COMO DÉBITO — converte pending/paid particular em fiado (PatientBalance).
                        Cobre os dois casos: secretária esqueceu de marcar débito no complete (payment
                        ficou 'paid') e payment já pendente que precisa virar débito formal. */}
                    {onMarkAsDebit && (payment.status === 'pending' || payment.status === 'paid') && (payment.billingType || 'particular') === 'particular' && (
                        <button
                            onClick={() => {
                                onMarkAsDebit(payment);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-amber-50 text-amber-700 transition-colors"
                            title="Registra este pagamento como débito (fiado) no saldo do paciente"
                        >
                            <HandCoins size={16} /> Marcar como Débito
                        </button>
                    )}

                    {/* ✅ BOTÃO EDITAR */}
                    {payment.status !== 'canceled' && (!(payment as any).__isAppointmentRecord || (payment as any).__realPaymentId) && (() => {
                        const isPackage = (payment as any).__isPackageAppointment || payment.serviceType === 'package_session' || payment.packageId;
                        const isConvenio = payment.billingType === 'convenio';
                        const isLiminar = payment.billingType === 'liminar';
                        const blocked = isPackage || isConvenio || isLiminar;
                        const blockReason = isPackage ? 'Sessão de pacote — valor não editável' : isConvenio ? 'Convênio — valor não editável' : 'Liminar — valor não editável';
                        console.log('[PaymentAction] Editar bloqueado?', blocked, { billingType: payment.billingType, serviceType: payment.serviceType, packageId: payment.packageId });
                        return blocked ? (
                            <div
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                                title={blockReason}
                            >
                                <Edit size={16} /> Editar Valor
                                <span className="text-xs ml-auto">🚫</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    // 🎯 Usa __realPaymentId se for appointment com payment vinculado
                                    const id = (payment as any).__realPaymentId || (payment as any).id || payment._id;
                                    console.log('[PaymentAction] Editar Valor id:', id, '_id:', payment._id, '__realPaymentId:', (payment as any).__realPaymentId);
                                    onEditAmount(id);
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-50 text-blue-700 transition-colors"
                            >
                                <Edit size={16} /> Editar Valor
                            </button>
                        );
                    })()}

                    {/* 🚨 BOTÃO EDITAR AGENDAMENTO (quando for registro de appointment) */}
                    {(payment as any).__isAppointmentRecord && (
                        <button
                            onClick={() => {
                                const id = (payment as any).id || payment._id;
                                console.log('[PaymentAction] Editar Agendamento id:', id);
                                (onEditAppointment || onEditAmount)(id);
                                setOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-amber-50 text-amber-700 transition-colors"
                            title="Editar no calendário"
                        >
                            <Edit size={16} /> Editar Agendamento
                        </button>
                    )}

                    {/* ✅ BOTÃO CANCELAR */}
                    {payment.status !== 'canceled' && (
                        <button
                            onClick={() => {
                                const id = (payment as any).id || payment._id;
                                onCancelPayment(id);
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
