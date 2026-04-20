// src/components/patients/PatientBalanceModal.tsx
// Modal para visualizar e gerenciar a conta corrente do paciente

import { ArrowDownCircle, ArrowUpCircle, CheckCircle, DollarSign, History, Plus, Trash2, Wallet, X, CheckSquare, Square, Calculator, Pencil, AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { getBalanceV2, addBalanceDebitV2 } from '../../services/balanceService';
import usePayment from '../../hooks/usePayment';
import { InputCurrency } from '../ui/InputCurrency';
import { ModalSpinner } from '../ui/LoadingSpinner';
import { extractErrorMessage } from '../../utils/errorUtils';
import { extractSessionId } from '../../dtos/payment.dto';

interface PatientBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
    onRefresh?: () => void;
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
    sessionId?: {
        _id?: string;
        date?: string;
        time?: string;
        status?: string;
        serviceType?: string;
    };
    appointmentId?: {
        _id?: string;
        date?: string;
        time?: string;
        operationalStatus?: string;
        doctor?: {
            fullName?: string;
            specialty?: string;
        };
    };
    // Campos adicionais para controle de status
    paid?: boolean;
    remainingAmount?: number;
    isPaid?: boolean;
    paidAmount?: number;
    linkedDebitId?: string;
}

export const PatientBalanceModal: React.FC<PatientBalanceModalProps> = ({
    isOpen,
    onClose,
    patientId,
    patientName,
    onRefresh
}) => {
    // Hooks adaptados
    const [balance, setBalance] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const { addPayment } = usePayment();

    // Buscar balance do paciente
    const fetchBalance = useCallback(async () => {
        if (!patientId) return;
        setLoading(true);
        try {
            const response = await getBalanceV2(patientId);
            setBalance(response.data);
        } catch (error) {
            console.error('Erro ao buscar balance:', error);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance]);

    const addDebit = async (data: { amount: number; description: string }) => {
        if (!patientId) return;
        setIsProcessing(true);
        try {
            await addBalanceDebitV2(patientId, data);
            await fetchBalance();
        } finally {
            setIsProcessing(false);
        }
    };

    // Adaptação para pagamento múltiplo
    const createPaymentMulti = async (patientId: string, data: any) => {
        setIsProcessing(true);
        setProgress(50);
        try {
            // Cria pagamentos individuais para cada item
            if (data.payments && data.payments.length > 0) {
                for (const payment of data.payments) {
                    await addPayment({
                        patientId,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        notes: payment.description,
                    });
                }
            }
            await fetchBalance();
            setProgress(100);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'add'>('pending');
    
    // 🆕 Card de especialidade selecionado (filtra lista abaixo)
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
        
    // Form states
    const [transactionType, setTransactionType] = useState<'debit' | 'payment'>('debit');
    const [amount, setAmount] = useState(0);
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('dinheiro');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 💰 Pagamento personalizado - seleção múltipla
    const [selectedDebits, setSelectedDebits] = useState<Set<string>>(new Set());
    const [showCustomPaymentModal, setShowCustomPaymentModal] = useState(false);
    const [customPaymentAmount, setCustomPaymentAmount] = useState(0);
    
    // 💳 Múltiplas formas de pagamento
    interface PaymentMethodItem {
        id: string;
        method: string;
        amount: number;
    }
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([
        { id: '1', method: 'dinheiro', amount: 0 }
    ]);
    
    // Atualiza valor total baseado na soma das formas de pagamento
    useEffect(() => {
        const total = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
        setCustomPaymentAmount(total);
    }, [paymentMethods]);

    // 🆕 Ao abrir modal, NÃO seleciona card automaticamente — mostra todos os débitos do ledger
    // O usuário clica no card para filtrar por especialidade
    
    // 💰 Pagamento rápido de débito específico
    const [payingTransaction, setPayingTransaction] = useState<Transaction | null>(null);
    const [quickPaymentMethod, setQuickPaymentMethod] = useState('dinheiro');
    const [showQuickPaymentForm, setShowQuickPaymentForm] = useState(false);

    // ✏️ Editar transação
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [editAmount, setEditAmount] = useState(0);
    const [editDescription, setEditDescription] = useState('');
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);

    // 🗑️ Excluir transação
    const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

    // Balance é carregado via useEffect

    // Separa transações por status
    const { pendingDebits, paidDebits, payments } = useMemo(() => {
        if (!balance?.transactions) return { pendingDebits: [], paidDebits: [], payments: [] };
        
        const pending: Transaction[] = [];
        const paid: Transaction[] = [];
        const paymentList: Transaction[] = [];
        
        balance.transactions.forEach((t: Transaction) => {
            if (t.type === 'debit') {
                // Débito está pendente se não foi totalmente pago
                if (!t.isPaid) {
                    pending.push(t);
                } else {
                    paid.push(t);
                }
            } else if (t.type === 'payment' || t.type === 'credit') {
                paymentList.push(t);
            }
        });
        
        return { pendingDebits: pending, paidDebits: paid, payments: paymentList };
    }, [balance]);

    // 🆕 Filtra pendingDebits (ledger) por especialidade do card clicado
    const filteredPendingDebits = useMemo(() => {
        if (!selectedSpecialty) return pendingDebits;
        return pendingDebits.filter((t: Transaction) =>
            t.appointmentId?.doctor?.specialty?.toLowerCase() === selectedSpecialty.toLowerCase()
        );
    }, [pendingDebits, selectedSpecialty]);
    
    // Calcula total selecionado
    const selectedTotal = useMemo(() => {
        return filteredPendingDebits
            .filter((t: Transaction) => selectedDebits.has(t._id || ''))
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    }, [filteredPendingDebits, selectedDebits]);

    // Toggle seleção de débito
    const toggleDebitSelection = (debitId: string) => {
        setSelectedDebits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(debitId)) {
                newSet.delete(debitId);
            } else {
                newSet.add(debitId);
            }
            return newSet;
        });
    };

    // Selecionar todos
    const selectAllDebits = () => {
        if (selectedDebits.size === filteredPendingDebits.length) {
            setSelectedDebits(new Set());
        } else {
            setSelectedDebits(new Set(filteredPendingDebits.map((t: Transaction) => t._id || '')));
        }
    };

    // ✏️ Abrir edição
    const openEdit = (t: Transaction) => {
        setEditingTransaction(t);
        setEditAmount(t.amount);
        setEditDescription(t.description);
    };

    // ✏️ Salvar edição
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTransaction?._id) return;
        setIsEditSubmitting(true);
        try {
            // TODO: Implementar updateTransaction
            console.warn('Edit transaction not implemented yet');
            setEditingTransaction(null);
            await fetchBalance();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Erro ao editar transação');
        } finally {
            setIsEditSubmitting(false);
        }
    };

    // 🗑️ Confirmar exclusão
    const handleDeleteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deletingTransaction?._id) return;
        if (deleteReason.trim().length < 5) {
            alert('Informe o motivo da exclusão (mínimo 5 caracteres)');
            return;
        }
        setIsDeleteSubmitting(true);
        try {
            // TODO: Implementar deleteTransaction
            console.warn('Delete transaction not implemented yet');
            setDeletingTransaction(null);
            setDeleteReason('');
            await fetchBalance();
        } catch (err: any) {
            alert(err?.response?.data?.message || 'Erro ao excluir transação');
        } finally {
            setIsDeleteSubmitting(false);
        }
    };

    // 💰 Pagamento rápido de um débito específico
    const handleQuickPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payingTransaction) return;
        
        setIsSubmitting(true);
        try {
            // 🚀 V2: Usa createPaymentMulti
            await createPaymentMulti(patientId, {
                payments: [{
                    amount: payingTransaction.amount,
                    paymentMethod: quickPaymentMethod,
                    description: `Pagamento de: ${payingTransaction.description}`
                }],
                totalAmount: payingTransaction.amount,
                debitIds: [payingTransaction._id]
            });
            
            // Limpa estado
            setPayingTransaction(null);
            setShowQuickPaymentForm(false);
            setQuickPaymentMethod('dinheiro');
            
            // Recarrega dados e notifica pai para atualizar cards
            await fetchBalance();
            setSelectedDebits(new Set());
            onRefresh?.();
        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            alert('Erro ao registrar pagamento');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 💰 Pagamento personalizado de múltiplos débitos
    // Calcula total das formas de pagamento
    const totalPaymentMethods = paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);

    const handleCustomPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (customPaymentAmount <= 0) {
            alert('Valor deve ser maior que zero');
            return;
        }
        if (selectedDebits.size === 0) {
            alert('Selecione pelo menos um débito');
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedDebitsList = filteredPendingDebits.filter((t: Transaction) => 
                selectedDebits.has(t._id || '')
            );
            
            // Prepara os pagamentos combinando formas de pagamento com débitos
            const payments: Array<{
                amount: number;
                paymentMethod: string;
                description: string;
                sessionId?: string;
                appointmentId?: string;
            }> = [];
            
            // Para cada forma de pagamento, distribuímos entre os débitos
            for (const paymentMethod of paymentMethods) {
                if (paymentMethod.amount <= 0) continue;
                
                let remainingForThisMethod = paymentMethod.amount;
                let debitIndex = 0;
                
                // Distribui esta forma de pagamento pelos débitos
                while (remainingForThisMethod > 0 && debitIndex < selectedDebitsList.length) {
                    const debit = selectedDebitsList[debitIndex];
                    const amountToPay = Math.min(debit.amount, remainingForThisMethod);
                    
                    payments.push({
                        amount: amountToPay,
                        paymentMethod: paymentMethod.method,
                        description: `Pagamento de: ${debit.description}`,
                        sessionId: extractSessionId(debit.sessionId),
                        appointmentId: extractSessionId(debit.appointmentId)
                    });
                    
                    remainingForThisMethod -= amountToPay;
                    debitIndex++;
                }
                
                // Se sobrou valor desta forma, registra como crédito/aditivo
                if (remainingForThisMethod > 0) {
                    payments.push({
                        amount: remainingForThisMethod,
                        paymentMethod: paymentMethod.method,
                        description: 'Crédito remanescente do pagamento'
                    });
                }
            }
            
            // Envia todos os pagamentos de uma vez + IDs dos débitos selecionados
            await createPaymentMulti(patientId, {
                payments,
                totalAmount: customPaymentAmount,
                debitIds: Array.from(selectedDebits)
            });
            
            // Limpa estado
            setShowCustomPaymentModal(false);
            setCustomPaymentAmount(0);
            setPaymentMethods([{ id: '1', method: 'dinheiro', amount: 0 }]);
            setSelectedDebits(new Set());

            // Recarrega dados e notifica pai para atualizar cards
            await fetchBalance();
            onRefresh?.();
        } catch (error: any) {
            console.error('Erro ao registrar pagamento:', error);
            const message = extractErrorMessage(error, 'Erro ao registrar pagamento');
            alert(message);
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
                await addDebit({
                    amount,
                    description: description || 'Débito manual'
                });
            } else {
                // 🚀 V2: Usa createPaymentMulti para pagamentos
                await createPaymentMulti(patientId, {
                    payments: [{
                        amount,
                        paymentMethod,
                        description: description || 'Pagamento recebido'
                    }],
                    totalAmount: amount,
                    debitIds: []
                });
            }
            
            // Limpa formulário
            setAmount(0);
            setDescription('');
            setActiveTab('pending');
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

    // 🩺 Traduz especialidade para português
    const translateSpecialty = (specialty: string): string => {
        const specialties: Record<string, string> = {
            'fonoaudiologia': 'Fonoaudiologia',
            'terapia_ocupacional': 'Terapia Ocupacional',
            'psicologia': 'Psicologia',
            'fisioterapia': 'Fisioterapia',
            'pediatria': 'Pediatria',
            'neuroped': 'Neuropediatria',
            'psicomotricidade': 'Psicomotricidade',
            'musicoterapia': 'Musicoterapia',
            'psicopedagogia': 'Psicopedagogia',
            'nutricao': 'Nutrição',
            'psiquiatria': 'Psiquiatria'
        };
        return specialties[specialty] || specialty;
    };

    // 💳 Traduz método de pagamento
    const translatePaymentMethod = (method: string): string => {
        const methods: Record<string, string> = {
            'dinheiro': '💵 Dinheiro',
            'pix': '⚡ PIX',
            'cartao_credito': '💳 Cartão Crédito',
            'cartao_debito': '💳 Cartão Débito',
            'transferencia_bancaria': '🏦 Transferência'
        };
        return methods[method] || method;
    };

    // 🩺 Traduz tipo de serviço
    const translateServiceType = (serviceType: string): string => {
        const types: Record<string, string> = {
            'consulta': 'Consulta',
            'sessao': 'Sessão',
            'avaliacao': 'Avaliação',
            'retorno': 'Retorno',
            'teleconsulta': 'Teleconsulta',
            'reavaliacao': 'Reavaliação',
            'parecer': 'Parecer',
            'laudo': 'Laudo'
        };
        return types[serviceType] || serviceType;
    };

    // 📅 Formata data da sessão (sem hora)
    const formatSessionDate = (dateString?: string): string => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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
                return 'text-red-600 bg-red-50/50 border-red-200';
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
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
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
                    
                    {/* Saldo atual — fonte de verdade: V2 (Payments), fallback: ledger */}
                    <div className="mt-6 p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                        <p className="text-sm text-amber-100">Saldo Atual</p>
                        {(() => {
                            const v2Total = balance?.v2_financial?.totalPendentes || 0;
                            const ledgerTotal = balance?.currentBalance || 0;
                            const displayTotal = v2Total > 0 ? v2Total : ledgerTotal;
                            return (
                                <>
                                    <p className={`text-2xl sm:text-3xl font-bold ${
                                        displayTotal > 0 
                                            ? 'text-red-200' 
                                            : displayTotal < 0 
                                                ? 'text-green-200' 
                                                : 'text-white'
                                    }`}>
                                        {formatCurrency(displayTotal)}
                                    </p>
                                    <p className="text-xs text-amber-100 mt-1">
                                        {displayTotal > 0
                                            ? '⚠️ Paciente deve este valor'
                                            : displayTotal < 0
                                                ? '✅ Paciente tem crédito'
                                                : 'Sem saldo pendente'}
                                    </p>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'pending'
                                ? 'text-red-600 border-b-2 border-red-500 bg-red-50 dark:bg-red-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <ArrowDownCircle className="w-4 h-4" />
                        Pendentes
                        {(balance?.v2_financial?.count || pendingDebits.length) > 0 && (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                                {balance?.v2_financial?.count || pendingDebits.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('paid')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'paid'
                                ? 'text-green-600 border-b-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <CheckCircle className="w-4 h-4" />
                        Quitados
                    </button>
                   {/*  <button
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                            activeTab === 'add'
                                ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Plus className="w-4 h-4" />
                        Registrar
                    </button> */}
                </div>

                {/* Content */}
                <div className="p-3 sm:p-6 max-h-[50vh] overflow-y-auto">
                    {loading ? (
                        <ModalSpinner />
                    ) : activeTab === 'pending' ? (
                        <div className="space-y-4">
                            {/* 🆕 CARDS POR ESPECIALIDADE (V2) — topo da aba, estilo igual ao da interface */}
                            {balance?.v2_financial?.bySpecialty && Object.keys(balance.v2_financial.bySpecialty).length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {Object.entries(balance.v2_financial.bySpecialty).map(([spec, group]: [string, any]) => {
                                        const isSelected = selectedSpecialty === spec;
                                        return (
                                            <button
                                                key={spec}
                                                onClick={() => setSelectedSpecialty(isSelected ? null : spec)}
                                                className={`p-4 rounded-xl border text-left transition-all ${
                                                    isSelected
                                                        ? 'bg-gray-800 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                                                }`}
                                            >
                                                <p className={`text-xs uppercase tracking-wider font-medium ${isSelected ? 'text-emerald-400' : 'text-gray-400'}`}>{spec}</p>
                                                <p className={`text-xl font-bold mt-1 ${isSelected ? 'text-white' : 'text-gray-100'}`}>{formatCurrency(group.total)}</p>
                                                <p className="text-xs text-gray-500 mt-1">{group.count} sessão(ões)</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Barra de ações */}
                            {filteredPendingDebits.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <button
                                        onClick={selectAllDebits}
                                        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900"
                                    >
                                        {selectedDebits.size === filteredPendingDebits.length ? (
                                            <CheckSquare className="w-5 h-5 text-amber-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                        )}
                                        {selectedDebits.size === filteredPendingDebits.length 
                                            ? 'Desmarcar todos' 
                                            : 'Selecionar todos'}
                                    </button>
                                    
                                    {selectedDebits.size > 0 && (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {selectedDebits.size} selecionado(s)
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                Total: {formatCurrency(selectedTotal)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botão de pagamento personalizado */}
                            {selectedDebits.size > 0 && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                    {isProcessing && (
                                        <div className="mb-3">
                                            <p className="text-sm text-amber-800 dark:text-amber-200">Processando pagamento...</p>
                                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                                <div className="bg-amber-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                                Pagamento Personalizado
                                            </p>
                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                {isProcessing ? 'Processando na fila...' : 'Defina um valor diferente do total'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setPaymentMethods([{ id: '1', method: 'dinheiro', amount: selectedTotal }]);
                                                setShowCustomPaymentModal(true);
                                            }}
                                            disabled={isProcessing}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Calculator className="w-4 h-4" />
                                            {isProcessing ? `${progress}%` : 'Pagar Selecionados'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {(() => {
                                // 🆕 Se card selecionado e V2 tem items → mostra items do V2 filtrados
                                const v2Items = selectedSpecialty && balance?.v2_financial?.items
                                    ? balance.v2_financial.items.filter((item: any) => item.specialty === selectedSpecialty)
                                    : [];
                                const showV2 = selectedSpecialty && v2Items.length > 0;
                                const listItems = showV2 ? v2Items : filteredPendingDebits;
                                const isV2 = showV2;
                                
                                if (listItems.length === 0) return (
                                    <div className="text-center py-8 text-gray-500">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                                        <p>Sem débitos pendentes</p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Paciente está em dia!
                                        </p>
                                    </div>
                                );
                                
                                return isV2 ? (
                                    // Lista V2 com estilo igual ao ledger
                                    v2Items.map((item: any, index: number) => (
                                        <div
                                            key={item._id || index}
                                            className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0">
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                                            <ArrowDownCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                                    {item.doctor?.fullName || 'Profissional não informado'}
                                                                </p>
                                                                <div className="mt-1.5 space-y-0.5">
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                                        <span className="font-medium">Especialidade:</span>
                                                                        <span className="text-gray-800 dark:text-gray-300">{item.specialty || '—'}</span>
                                                                    </p>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                        {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '—'}
                                                                    </p>
                                                                    {item.notes && (
                                                                        <p className="text-xs text-gray-500">{item.notes}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                                                                {formatCurrency(item.amount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    filteredPendingDebits.map((transaction: Transaction, index: number) => (
                                    <div
                                        key={transaction._id || index}
                                        className={`p-4 rounded-xl border transition-all ${
                                            selectedDebits.has(transaction._id || '')
                                                ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10 ring-1 ring-amber-500'
                                                : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleDebitSelection(transaction._id || '')}
                                                className="mt-1 flex-shrink-0"
                                            >
                                                {selectedDebits.has(transaction._id || '') ? (
                                                    <CheckSquare className="w-5 h-5 text-amber-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                                )}
                                            </button>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <ArrowDownCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            {/* Descrição principal */}
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                                {transaction.description || 'Débito'}
                                                            </p>
                                                            
                                                            {/* 🩺 Detalhes da sessão/consulta */}
                                                            <div className="mt-1.5 space-y-0.5">
                                                                {/* Profissional e Especialidade */}
                                                                {transaction.appointmentId?.doctor && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                                        <span className="font-medium">Profissional:</span>
                                                                        <span className="text-gray-800 dark:text-gray-300">
                                                                            {transaction.appointmentId.doctor.fullName}
                                                                        </span>
                                                                        {transaction.appointmentId.doctor.specialty && (
                                                                            <span className="text-gray-500 dark:text-gray-500">
                                                                                ({translateSpecialty(transaction.appointmentId.doctor.specialty)})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                                
                                                                {/* Data/hora da sessão */}
                                                                {(transaction.sessionId?.date || transaction.appointmentId?.date) && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                                        <span className="font-medium">Atendimento:</span>
                                                                        <span className="text-gray-800 dark:text-gray-300">
                                                                            {formatSessionDate(transaction.sessionId?.date || transaction.appointmentId?.date)}
                                                                            {(transaction.sessionId?.time || transaction.appointmentId?.time) && (
                                                                                <span className="text-gray-500">
                                                                                    {' '}às {transaction.sessionId?.time || transaction.appointmentId?.time}
                                                                                </span>
                                                                            )}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                                
                                                                {/* Tipo de serviço */}
                                                                {transaction.sessionId?.serviceType && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                                        <span className="font-medium">Tipo:</span>
                                                                        <span className="text-gray-800 dark:text-gray-300">
                                                                            {translateServiceType(transaction.sessionId.serviceType)}
                                                                        </span>
                                                                    </p>
                                                                )}
                                                                
                                                                {/* Registrado por */}
                                                                {transaction.registeredBy && (
                                                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                                                        Registrado por: {transaction.registeredBy.fullName || transaction.registeredBy.name || 'Sistema'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <p className="font-bold text-lg text-red-600">
                                                            {formatCurrency(transaction.amount)}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {formatDate(transaction.transactionDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                {/* Ações */}
                                                <div className="mt-3 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openEdit(transaction)}
                                                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                                        title="Editar valor ou descrição"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeletingTransaction(transaction); setDeleteReason(''); }}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                                        title="Excluir por erro operacional"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Excluir
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setPayingTransaction(transaction);
                                                            setShowQuickPaymentForm(true);
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        <DollarSign className="w-3 h-3" />
                                                        Pagar Total
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )})()}

                        </div>
                    ) : activeTab === 'paid' ? (
                        <div className="space-y-4">
                            {paidDebits.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>Nenhuma transação quitada</p>
                                </div>
                            ) : (
                                // Mostra os débitos pagos com info do pagamento específico
                                paidDebits.map((debit, index) => {
                                    // Encontra o(s) pagamento(s) que quitaram este débito específico
                                    const matchingPayments = payments.filter(p => 
                                        p.linkedDebitId === debit._id || 
                                        p.description?.includes(debit.description || '')
                                    );
                                    
                                    // Se não encontrou por linkedDebitId, tenta encontrar pelo valor
                                    const totalPaid = matchingPayments.reduce((sum, p) => sum + p.amount, 0);
                                    
                                    return (
                                        <div
                                            key={debit._id || index}
                                            className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                                        >
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                                                                {debit.description || 'Débito'}
                                                            </p>
                                                            
                                                            {/* 🩺 Detalhes da sessão */}
                                                            <div className="mt-1.5 space-y-0.5">
                                                                {debit.appointmentId?.doctor && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                        Profissional: {debit.appointmentId.doctor.fullName}
                                                                        {debit.appointmentId.doctor.specialty && (
                                                                            <span className="text-gray-500"> • {translateSpecialty(debit.appointmentId.doctor.specialty)}</span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                                {(debit.sessionId?.date || debit.appointmentId?.date) && (
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                        Atendimento: {formatSessionDate(debit.sessionId?.date || debit.appointmentId?.date)}
                                                                        {(debit.sessionId?.time || debit.appointmentId?.time) && (
                                                                            <span className="text-gray-500"> às {debit.sessionId?.time || debit.appointmentId?.time}</span>
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-lg text-gray-700 dark:text-gray-300 line-through">
                                                                {formatCurrency(debit.amount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Info do pagamento específico */}
                                                    {matchingPayments.length > 0 ? (
                                                        <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg space-y-2">
                                                            <p className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide">
                                                                Pago com:
                                                            </p>
                                                            {matchingPayments.map((payment, pIdx) => (
                                                                <div key={pIdx} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <DollarSign className="w-4 h-4 text-green-600" />
                                                                        <span className="text-sm text-green-800 dark:text-green-300">
                                                                            {translatePaymentMethod(payment.paymentMethod || 'dinheiro')}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                                                                        {formatCurrency(payment.amount)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {matchingPayments.length > 1 && (
                                                                <div className="border-t border-green-200 dark:border-green-800 pt-2 mt-2 flex justify-between">
                                                                    <span className="text-xs text-green-700">Total pago:</span>
                                                                    <span className="text-sm font-bold text-green-800">{formatCurrency(totalPaid)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                                            <p className="text-xs text-gray-500">
                                                                Quitado via pagamento em conta corrente
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            
                            {/* Resumo de pagamentos */}
                            {payments.length > 0 && (
                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Resumo dos Pagamentos</h4>
                                    <div className="space-y-2">
                                        {Object.entries(
                                            payments.reduce((groups, p) => {
                                                const method = p.paymentMethod || 'dinheiro';
                                                if (!groups[method]) groups[method] = 0;
                                                groups[method] += p.amount;
                                                return groups;
                                            }, {} as Record<string, number>)
                                        ).map(([method, total]) => (
                                            <div key={method} className="flex justify-between text-sm">
                                                <span className="text-gray-700 dark:text-gray-300">{translatePaymentMethod(method)}</span>
                                                <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-blue-200 dark:border-blue-800 mt-2 pt-2 flex justify-between">
                                        <span className="font-bold text-blue-900 dark:text-blue-300">Total Pago:</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-400">{formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Tipo de transação */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de Transação
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionType('debit')}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                                            transactionType === 'debit'
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
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
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                                        }`}
                                    >
                                        <DollarSign className="w-5 h-5 mx-auto mb-1" />
                                        <span className="text-sm font-medium">Pagamento Recebido</span>
                                    </button>
                                </div>
                            </div>

                            {/* Valor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                />
                            </div>

                            {/* Método de pagamento (só para pagamentos) */}
                            {transactionType === 'payment' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Método de Pagamento
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                
                {/* 💰 MODAL DE PAGAMENTO RÁPIDO (individual) */}
                {showQuickPaymentForm && payingTransaction && (
                    <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                                Registrar Pagamento
                            </h3>
                            <button
                                onClick={() => {
                                    setShowQuickPaymentForm(false);
                                    setPayingTransaction(null);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleQuickPayment} className="space-y-4">
                            {/* Resumo do débito */}
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Débito a ser pago:</p>
                                <p className="text-lg font-bold text-red-700 dark:text-red-300">{payingTransaction.description}</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">
                                    {formatCurrency(payingTransaction.amount)}
                                </p>
                            </div>
                            
                            {/* Forma de pagamento */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
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
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                <p>💡 Ao confirmar, o pagamento será registrado e o débito marcado como quitado.</p>
                            </div>
                            
                            {/* Botões */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowQuickPaymentForm(false);
                                        setPayingTransaction(null);
                                    }}
                                    className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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
                                            Confirmar Pagamento
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 💰 MODAL DE PAGAMENTO PERSONALIZADO (múltiplos) */}
                {showCustomPaymentModal && (
                    <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Calculator className="w-6 h-6 text-amber-600" />
                                Pagamento Personalizado
                            </h3>
                            <button
                                onClick={() => {
                                    setShowCustomPaymentModal(false);
                                    setCustomPaymentAmount(0);
                                    setPaymentMethods([{ id: '1', method: 'dinheiro', amount: 0 }]);
                                }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCustomPayment} className="space-y-4">
                            {/* Resumo dos débitos selecionados */}
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">
                                    Débitos selecionados ({selectedDebits.size}):
                                </p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {filteredPendingDebits
                                        .filter((t: Transaction) => selectedDebits.has(t._id || ''))
                                        .map((t: Transaction) => (
                                            <div key={t._id} className="flex justify-between text-sm border-b border-amber-100 dark:border-amber-800/50 pb-1 last:border-0">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <p className="text-gray-800 dark:text-gray-200 font-medium truncate">
                                                        {t.description}
                                                    </p>
                                                    {t.appointmentId?.doctor && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {t.appointmentId.doctor.fullName}
                                                            {t.appointmentId.doctor.specialty && (
                                                                <span className="text-gray-400">
                                                                    {' '}• {translateSpecialty(t.appointmentId.doctor.specialty)}
                                                                </span>
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="font-medium text-red-600 flex-shrink-0">
                                                    {formatCurrency(t.amount)}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                                <div className="border-t border-amber-200 dark:border-amber-800 mt-2 pt-2 flex justify-between">
                                    <span className="font-semibold text-amber-900 dark:text-amber-200">Total dos débitos:</span>
                                    <span className="font-bold text-amber-700 dark:text-amber-300">{formatCurrency(selectedTotal)}</span>
                                </div>
                            </div>
                            
                            {/* Valor do pagamento - SOMENTE LEITURA */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    Valor Total a Pagar
                                </label>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {formatCurrency(customPaymentAmount)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {customPaymentAmount < selectedTotal 
                                        ? `⚠️ Formas de pagamento somam ${formatCurrency(customPaymentAmount)}, menor que ${formatCurrency(selectedTotal)}. O restante continua em aberto.`
                                        : customPaymentAmount > selectedTotal
                                            ? '💚 Valor maior que o total dos débitos. O excedente será registrado como crédito.'
                                            : '✅ Valor exato para quitar todos os débitos selecionados.'
                                    }
                                </p>
                            </div>
                            
                            {/* 💳 Múltiplas formas de pagamento */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Formas de Pagamento
                                    </label>
                                    <span className={`text-sm font-semibold ${
                                        totalPaymentMethods === selectedTotal 
                                            ? 'text-green-600' 
                                            : totalPaymentMethods > selectedTotal 
                                                ? 'text-red-600' 
                                                : 'text-amber-600'
                                    }`}>
                                        Total: {formatCurrency(totalPaymentMethods)} / {formatCurrency(selectedTotal)}
                                    </span>
                                </div>
                                
                                {paymentMethods.map((pm, index) => (
                                    <div key={pm.id} className="flex items-center gap-2">
                                        <select
                                            value={pm.method}
                                            onChange={(e) => {
                                                const newMethods = [...paymentMethods];
                                                newMethods[index].method = e.target.value;
                                                setPaymentMethods(newMethods);
                                            }}
                                            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        >
                                            <option value="dinheiro">💵 Dinheiro</option>
                                            <option value="pix">⚡ PIX</option>
                                            <option value="cartao_credito">💳 Cartão Crédito</option>
                                            <option value="cartao_debito">💳 Cartão Débito</option>
                                            <option value="transferencia_bancaria">🏦 Transferência</option>
                                        </select>
                                        <div className="w-32">
                                            <InputCurrency
                                                name={`paymentAmount-${pm.id}`}
                                                value={pm.amount}
                                                onChange={(e) => {
                                                    const newMethods = [...paymentMethods];
                                                    newMethods[index].amount = Number(e.target.value);
                                                    setPaymentMethods(newMethods);
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                        {paymentMethods.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
                                                }}
                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentMethods([
                                            ...paymentMethods, 
                                            { id: Date.now().toString(), method: 'dinheiro', amount: 0 }
                                        ]);
                                    }}
                                    disabled={paymentMethods.length >= 5}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:border-amber-500 hover:text-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    + Adicionar forma de pagamento
                                </button>
                                
                                {/* Status da soma */}
                                {totalPaymentMethods !== customPaymentAmount && customPaymentAmount > 0 && (
                                    <p className={`text-xs ${
                                        totalPaymentMethods > selectedTotal 
                                            ? 'text-red-600' 
                                            : 'text-amber-600'
                                    }`}>
                                        {totalPaymentMethods > selectedTotal 
                                            ? `⚠️ Soma (${formatCurrency(totalPaymentMethods)}) excede o valor dos débitos em ${formatCurrency(totalPaymentMethods - selectedTotal)}`
                                            : `⚠️ Faltam ${formatCurrency(selectedTotal - totalPaymentMethods)} para completar o valor dos débitos`
                                        }
                                    </p>
                                )}
                            </div>
                            
                            {/* Info */}
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                <p>💡 O sistema distribuirá cada forma de pagamento pelos débitos, começando pelos mais antigos.</p>
                            </div>
                            
                            {/* Botões */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCustomPaymentModal(false);
                                        setCustomPaymentAmount(0);
                                        setPaymentMethods([{ id: '1', method: 'dinheiro', amount: 0 }]);
                                    }}
                                    className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || totalPaymentMethods <= 0}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition-all disabled:from-gray-400 disabled:to-gray-500"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <LoadingSpinner size="small" color="border-white" />
                                            Processando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            Confirmar Pagamento
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>

        {/* ✏️ Modal de Edição */}
        {editingTransaction && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-gray-500" />
                            Editar Transação
                        </h3>
                        <button onClick={() => setEditingTransaction(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (R$)</label>
                            <InputCurrency
                                name="editAmount"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
                            <input
                                type="text"
                                value={editDescription}
                                onChange={e => setEditDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setEditingTransaction(null)}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isEditSubmitting}
                                className="flex-1 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                {isEditSubmitting ? <LoadingSpinner size="small" color="border-white" /> : <><Pencil className="w-4 h-4" />Salvar</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* 🗑️ Modal de Exclusão */}
        {deletingTransaction && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Excluir Transação
                        </h3>
                        <button onClick={() => setDeletingTransaction(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleDeleteSubmit} className="p-5 space-y-4">
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 text-sm text-gray-700 dark:text-gray-300">
                            <p className="font-semibold">{deletingTransaction.description}</p>
                            <p className="text-red-600 font-bold mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deletingTransaction.amount)}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Motivo da exclusão <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={deleteReason}
                                onChange={e => setDeleteReason(e.target.value)}
                                placeholder="Ex: Registro duplicado por erro operacional"
                                rows={3}
                                required
                                minLength={5}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">{deleteReason.length}/5 caracteres mínimos</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDeletingTransaction(null)}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                                Cancelar
                            </button>
                            <button type="submit" disabled={isDeleteSubmitting || deleteReason.trim().length < 5}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                                {isDeleteSubmitting ? <LoadingSpinner size="small" color="border-white" /> : <><Trash2 className="w-4 h-4" />Excluir</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </>
    );
};

export default PatientBalanceModal;
