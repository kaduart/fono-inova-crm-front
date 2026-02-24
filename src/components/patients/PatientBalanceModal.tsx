// src/components/patients/PatientBalanceModal.tsx
// Modal para visualizar e gerenciar a conta corrente do paciente

import { ptBR } from 'date-fns/locale';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, History, Plus, Trash2, Wallet, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { getPatientBalance, addBalanceDebit, addBalancePayment } from '../../services/paymentService';
import { appointmentService } from '../../services/appointmentService';
import { InputCurrency } from '../ui/InputCurrency';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface PatientBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
}

interface Transaction {
    _id?: string;
    type: 'debit' | 'credit' | 'payment';
    amount: number;
    description: string;
    paymentMethod?: string;
    transactionDate: string;
    registeredBy?: {
        fullName?: string;
        name?: string;
    };
    sessionId?: string;
    appointmentId?: string;
}

export const PatientBalanceModal: React.FC<PatientBalanceModalProps> = ({
    isOpen,
    onClose,
    patientId,
    patientName
}) => {
    const [balance, setBalance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'history' | 'add'>('history');
    
    // Form states
    const [transactionType, setTransactionType] = useState<'debit' | 'payment'>('debit');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('dinheiro');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 💰 Sessões não pagas para vincular pagamento
    const [unpaidSessions, setUnpaidSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [loadingSessions, setLoadingSessions] = useState(false);
    
    // 💰 Pagamento rápido de débito específico
    const [payingTransaction, setPayingTransaction] = useState<Transaction | null>(null);
    const [quickPaymentMethod, setQuickPaymentMethod] = useState('dinheiro');
    const [showQuickPaymentForm, setShowQuickPaymentForm] = useState(false);

    useEffect(() => {
        if (isOpen && patientId) {
            loadBalance();
            loadUnpaidSessions();
        }
    }, [isOpen, patientId]);
    
    // Carrega sessões não pagas quando muda para aba de pagamento
    useEffect(() => {
        if (activeTab === 'add' && transactionType === 'payment') {
            loadUnpaidSessions();
        }
    }, [activeTab, transactionType]);
    
    const loadUnpaidSessions = async () => {
        setLoadingSessions(true);
        try {
            // Buscar appointments/sessões pendentes do paciente
            const response = await appointmentService.list({ 
                patientId: patientId, 
                status: 'pending' as any,
                limit: 100
            });
            const data = response.data?.data || response.data || [];
            // Filtra apenas os que têm addedToBalance ou paymentStatus pendente
            const unpaid = data.filter((item: any) => 
                item.paymentStatus === 'pending' || 
                item.extendedProps?.paymentStatus === 'pending' ||
                item.addedToBalance === true
            );
            setUnpaidSessions(unpaid);
        } catch (error) {
            console.error('Erro ao carregar sessões não pagas:', error);
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadBalance = async () => {
        setLoading(true);
        try {
            console.log('🔄 Carregando saldo do paciente:', patientId);
            const data = await getPatientBalance(patientId);
            console.log('✅ Saldo carregado:', data);
            setBalance(data);
        } catch (error) {
            console.error('❌ Erro ao carregar saldo:', error);
        } finally {
            setLoading(false);
        }
    };
    
    // 💰 Pagamento rápido de um débito específico
    const handleQuickPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingTransaction) return;
        
        setIsSubmitting(true);
        try {
            await addBalancePayment(patientId, {
                amount: payingTransaction.amount,
                paymentMethod: quickPaymentMethod,
                description: `Pagamento de: ${payingTransaction.description}`,
                sessionId: payingTransaction.sessionId,
                appointmentId: payingTransaction.appointmentId
            });
            
            // Limpa estado
            setPayingTransaction(null);
            setShowQuickPaymentForm(false);
            setQuickPaymentMethod('dinheiro');
            
            // Recarrega dados
            await loadBalance();
            await loadUnpaidSessions();
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            alert('Erro ao registrar pagamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            alert('Valor deve ser maior que zero');
            return;
        }

        setIsSubmitting(true);
        try {
            if (transactionType === 'debit') {
                await addBalanceDebit(patientId, {
                    amount,
                    description: description || 'Débito manual'
                });
            } else {
                // Encontra a sessão selecionada para vincular
                const selectedSession = unpaidSessions.find((s: any) => s.id === selectedSessionId || s._id === selectedSessionId);
                
                await addBalancePayment(patientId, {
                    amount,
                    paymentMethod,
                    description: description || 'Pagamento recebido',
                    sessionId: selectedSession?.extendedProps?.session || selectedSession?.session,
                    appointmentId: selectedSessionId
                });
            }
            
            // Recarrega dados
            await loadBalance();
            
            // Limpa formulário
            setAmount(0);
            setDescription('');
            setActiveTab('history');
        } catch (error) {
            console.error('Erro ao registrar transação:', error);
            alert('Erro ao registrar transação');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'debit':
                return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
            case 'credit':
                return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
            case 'payment':
                return <DollarSign className="w-5 h-5 text-blue-500" />;
            default:
                return <History className="w-5 h-5 text-gray-500" />;
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'debit':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'credit':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'payment':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'debit':
                return 'Débito';
            case 'credit':
                return 'Crédito';
            case 'payment':
                return 'Pagamento';
            default:
                return type;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Wallet className="w-6 h-6" />
                                Conta Corrente
                            </h2>
                            <p className="text-amber-100 mt-1">{patientName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Saldo atual */}
                    <div className="mt-6 p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                        <p className="text-sm text-amber-100">Saldo Atual</p>
                        <p className={`text-2xl sm:text-3xl font-bold ${
                            (balance?.currentBalance || 0) > 0 
                                ? 'text-red-200' 
                                : (balance?.currentBalance || 0) < 0 
                                    ? 'text-green-200' 
                                    : 'text-white'
                        }`}>
                            {formatCurrency(balance?.currentBalance || 0)}
                        </p>
                        <p className="text-xs text-amber-100 mt-1">
                            {(balance?.currentBalance || 0) > 0 
                                ? '⚠️ Paciente deve este valor' 
                                : (balance?.currentBalance || 0) < 0 
                                    ? '✅ Paciente tem crédito' 
                                    : 'Sem saldo pendente'}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'history'
                                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        <History className="w-4 h-4" />
                        Histórico
                    </button>
                    <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'add'
                                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50'
                                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        Registrar
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <LoadingSpinner size="large" />
                        </div>
                    ) : activeTab === 'history' ? (
                        <div className="space-y-4">
                            {balance?.transactions?.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>Nenhuma transação registrada</p>
                                </div>
                            ) : (
                                balance?.transactions?.map((transaction: Transaction, index: number) => (
                                    <div
                                        key={transaction._id || index}
                                        className={`p-4 rounded-xl border ${getTransactionColor(transaction.type)}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                {getTransactionIcon(transaction.type)}
                                                <div>
                                                    <p className="font-semibold">
                                                        {getTransactionLabel(transaction.type)}
                                                    </p>
                                                    <p className="text-sm opacity-80">
                                                        {transaction.description}
                                                    </p>
                                                    {transaction.registeredBy && (
                                                        <p className="text-xs opacity-60 mt-1">
                                                            Por: {transaction.registeredBy.fullName || transaction.registeredBy.name || 'Sistema'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold text-lg ${
                                                    transaction.type === 'debit' 
                                                        ? 'text-red-600' 
                                                        : 'text-green-600'
                                                }`}>
                                                    {transaction.type === 'debit' ? '+' : '-'}
                                                    {formatCurrency(transaction.amount)}
                                                </p>
                                                <p className="text-xs opacity-60">
                                                    {formatDate(transaction.transactionDate)}
                                                </p>
                                                {/* 💰 BOTÃO PAGAR PARA DÉBITOS */}
                                                {transaction.type === 'debit' && (
                                                    <button
                                                        onClick={() => {
                                                            setPayingTransaction(transaction);
                                                            setShowQuickPaymentForm(true);
                                                        }}
                                                        className="mt-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-1 ml-auto"
                                                    >
                                                        <DollarSign className="w-3 h-3" />
                                                        Pagar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Tipo de transação */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Transação
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionType('debit')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                                            transactionType === 'debit'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-gray-200 hover:border-red-300'
                                        }`}
                                    >
                                        <ArrowDownCircle className="w-5 h-5 mx-auto mb-1" />
                                        <span className="text-sm font-medium">Débito (Paciente deve)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTransactionType('payment')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                                            transactionType === 'payment'
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <DollarSign className="w-5 h-5 mx-auto mb-1" />
                                        <span className="text-sm font-medium">Pagamento Recebido</span>
                                    </button>
                                </div>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor (R$)
                                </label>
                                <InputCurrency
                                    name="transactionAmount"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            {/* Descrição */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descrição
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder={transactionType === 'debit' 
                                        ? 'Ex: Sessão 19/02/2026 - pagamento pendente' 
                                        : 'Ex: Pagamento via PIX'
                                    }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>

                            {/* Método de pagamento (só para pagamentos) */}
                            {transactionType === 'payment' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Método de Pagamento
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartao_credito">Cartão de Crédito</option>
                                        <option value="cartao_debito">Cartão de Débito</option>
                                        <option value="transferencia_bancaria">Transferência Bancária</option>
                                    </select>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting || amount <= 0}
                                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
                                    transactionType === 'debit'
                                        ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                } disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed`}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <LoadingSpinner size="small" color="border-white" />
                                        Registrando...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        {transactionType === 'debit' ? <ArrowDownCircle className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                                        {transactionType === 'debit' ? 'Registrar Débito' : 'Registrar Pagamento'}
                                    </span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
                
                {/* 💰 MODAL DE PAGAMENTO RÁPIDO */}
                {showQuickPaymentForm && payingTransaction && (
                    <div className="absolute inset-0 bg-white rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                                Registrar Pagamento
                            </h3>
                            <button
                                onClick={() => {
                                    setShowQuickPaymentForm(false);
                                    setPayingTransaction(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleQuickPayment} className="space-y-4">
                            {/* Resumo do débito */}
                            <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                                <p className="text-sm text-red-600 font-medium">Débito a ser pago:</p>
                                <p className="text-lg font-bold text-red-700">{payingTransaction.description}</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {formatCurrency(payingTransaction.amount)}
                                </p>
                            </div>
                            
                            {/* Forma de pagamento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Forma de Pagamento
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia_bancaria'].map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setQuickPaymentMethod(method)}
                                            className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                                quickPaymentMethod === method
                                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                    : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            {method === 'dinheiro' && '💵 Dinheiro'}
                                            {method === 'pix' && '⚡ PIX'}
                                            {method === 'cartao_credito' && '💳 Crédito'}
                                            {method === 'cartao_debito' && '💳 Débito'}
                                            {method === 'transferencia_bancaria' && '🏦 Transferência'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Info */}
                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                <p>💡 Ao confirmar, o pagamento será registrado e a sessão vinculada será marcada como paga.</p>
                            </div>
                            
                            {/* Botões */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowQuickPaymentForm(false);
                                        setPayingTransaction(null);
                                    }}
                                    className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-gray-400 disabled:to-gray-500"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <LoadingSpinner size="small" color="border-white" />
                                            Processando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            Confirmar Pagamento de {formatCurrency(payingTransaction.amount)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientBalanceModal;
