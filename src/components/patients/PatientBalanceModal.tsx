// src/components/patients/PatientBalanceModal.tsx
// Modal para visualizar e gerenciar pagamentos do paciente (100% Payment como fonte de verdade)

import {
  ArrowDownCircle,
  CheckCircle,
  DollarSign,
  History,
  Plus,
  Wallet,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  getPatientPendingPayments,
  getPatientPaidPayments,
  getPatientFinancialSummary,
  FinancialSummary,
} from '../../services/financialSummaryService';
import API from '../../services/api';
import { InputCurrency } from '../ui/InputCurrency';
import { LoadingSpinner, ModalSpinner } from '../ui/LoadingSpinner';
import { extractErrorMessage } from '../../utils/errorUtils';

interface PatientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onRefresh?: () => void;
}

interface PaymentItem {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  description: string | null;
  appointment: {
    id: string;
    date: string;
    time: string;
  } | null;
}

const mapToPaymentItem = (p: any): PaymentItem => ({
  id: p.id,
  amount: p.amount,
  status: p.status,
  createdAt: p.createdAt,
  paidAt: p.paidAt,
  description: p.description,
  appointment: p.appointment
    ? {
        id: p.appointment.id,
        date: p.appointment.date,
        time: p.appointment.time,
      }
    : null,
});

export const PatientBalanceModal: React.FC<PatientBalanceModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  onRefresh,
}) => {
  // Estados principais
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentItem[]>([]);
  const [paidPayments, setPaidPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'add'>('pending');

  // Seleção múltipla
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState('dinheiro');

  // Pagamento rápido individual
  const [quickPaymentId, setQuickPaymentId] = useState<string | null>(null);
  const [quickPaymentMethod, setQuickPaymentMethod] = useState('dinheiro');
  const [showQuickPaymentModal, setShowQuickPaymentModal] = useState(false);

  // Formulário "add"
  const [addAmount, setAddAmount] = useState(0);
  const [addDescription, setAddDescription] = useState('');

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [summaryRes, pendingRes, paidRes] = await Promise.all([
        getPatientFinancialSummary(patientId),
        getPatientPendingPayments(patientId),
        getPatientPaidPayments(patientId),
      ]);
      setSummary(summaryRes);
      setPendingPayments(pendingRes.map(mapToPaymentItem));
      setPaidPayments(paidRes.map(mapToPaymentItem));
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setActiveTab('pending');
      setSelectedPayments(new Set());
      setShowBulkPaymentModal(false);
      setShowQuickPaymentModal(false);
    }
  }, [isOpen, fetchData]);

  const selectedTotal = useMemo(() => {
    return pendingPayments
      .filter((p) => selectedPayments.has(p.id))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [pendingPayments, selectedPayments]);

  const toggleSelection = (id: string) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPayments.size === pendingPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(pendingPayments.map((p) => p.id)));
    }
  };

  const handleQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPaymentId) return;
    setIsSubmitting(true);
    try {
      await API.patch(`/v2/payments/${quickPaymentId}/mark-as-paid`, {
        paymentMethod: quickPaymentMethod,
      });
      setShowQuickPaymentModal(false);
      setQuickPaymentId(null);
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      alert(extractErrorMessage(error, 'Erro ao registrar pagamento'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayments.size === 0) {
      alert('Selecione pelo menos um pagamento');
      return;
    }
    if (selectedTotal <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/v2/payments/bulk-settle', {
        paymentIds: Array.from(selectedPayments),
        paymentMethod: bulkPaymentMethod,
        totalAmount: selectedTotal,
      });
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Erro ao quitar pagamentos');
      }
      setShowBulkPaymentModal(false);
      setSelectedPayments(new Set());
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erro ao registrar pagamento em lote:', error);
      alert(extractErrorMessage(error, 'Erro ao registrar pagamento em lote'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ⚠️ V1 MENTALIDADE: Cria Payment pending manualmente (débito avulso).
  // ✅ V2 REALIDADE: Isso é OK para débitos avulsos NÃO vinculados a agendamento.
  // Mas se for para sessão, o Payment deve nascer no schedule/complete.
  const handleCreatePending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addAmount <= 0) {
      alert('Valor deve ser maior que zero');
      return;
    }
    setIsSubmitting(true);
    try {
      await API.post('/v2/payments', {
        patient: patientId,
        amount: addAmount,
        status: 'pending',
        description: addDescription || 'Débito manual',
      });
      setAddAmount(0);
      setAddDescription('');
      setActiveTab('pending');
      await fetchData();
      onRefresh?.();
    } catch (error: any) {
      console.error('Erro ao criar pagamento pendente:', error);
      alert(extractErrorMessage(error, 'Erro ao criar pagamento pendente'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const translatePaymentMethod = (method: string): string => {
    const methods: Record<string, string> = {
      dinheiro: '💵 Dinheiro',
      pix: '⚡ PIX',
      cartao_credito: '💳 Cartão Crédito',
      cartao_debito: '💳 Cartão Débito',
      transferencia_bancaria: '🏦 Transferência',
    };
    return methods[method] || method;
  };

  const formatSessionDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 sm:p-6 text-white flex-shrink-0">
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

            {/* Resumo */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm text-center">
                <p className="text-xs text-amber-100">Pendente</p>
                <p className="text-xl font-bold text-red-200">
                  {formatCurrency(summary?.totalPending || 0)}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm text-center">
                <p className="text-xs text-amber-100">Pago</p>
                <p className="text-xl font-bold text-green-200">
                  {formatCurrency(summary?.totalPaid || 0)}
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm text-center">
                <p className="text-xs text-amber-100">Sessões</p>
                <p className="text-xl font-bold text-white">
                  {summary?.completedSessions || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
              {pendingPayments.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {pendingPayments.length}
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
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'add'
                  ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Plus className="w-4 h-4" />
              Registrar
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <ModalSpinner />
            ) : activeTab === 'pending' ? (
              <div className="space-y-4">
                {/* Barra de ações */}
                {pendingPayments.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <button
                      onClick={selectAll}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900"
                    >
                      {selectedPayments.size === pendingPayments.length ? (
                        <CheckSquare className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                      {selectedPayments.size === pendingPayments.length
                        ? 'Desmarcar todos'
                        : 'Selecionar todos'}
                    </button>

                    {selectedPayments.size > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedPayments.size} selecionado(s)
                        </span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          Total: {formatCurrency(selectedTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Botão pagamento em lote */}
                {selectedPayments.size > 0 && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                          Pagamento em Lote
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Quita todos os itens selecionados de uma vez
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setBulkPaymentMethod('dinheiro');
                          setShowBulkPaymentModal(true);
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Pagar Selecionados
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista */}
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                    <p>Sem débitos pendentes</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Paciente está em dia!
                    </p>
                  </div>
                ) : (
                  pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className={`p-4 rounded-xl border transition-all ${
                        selectedPayments.has(payment.id)
                          ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-900/10 ring-1 ring-amber-500'
                          : 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleSelection(payment.id)}
                          className="mt-1 flex-shrink-0"
                        >
                          {selectedPayments.has(payment.id) ? (
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
                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {payment.description || 'Débito'}
                                </p>
                                <div className="mt-1.5 space-y-0.5">
                                  {payment.appointment && (
                                    <>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        📅 {formatSessionDate(payment.appointment.date)}
                                        {payment.appointment.time && (
                                          <span className="text-gray-500">
                                            {' '}
                                            às {payment.appointment.time}
                                          </span>
                                        )}
                                      </p>
                                    </>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    Registrado em: {formatDateTime(payment.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-lg text-red-600 dark:text-red-400">
                                {formatCurrency(payment.amount)}
                              </p>
                            </div>
                          </div>

                          {/* Ação rápida */}
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setQuickPaymentId(payment.id);
                                setQuickPaymentMethod('dinheiro');
                                setShowQuickPaymentModal(true);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              Pagar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'paid' ? (
              <div className="space-y-4">
                {paidPayments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nenhum pagamento quitado</p>
                  </div>
                ) : (
                  paidPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {payment.description || 'Pagamento'}
                              </p>
                              <div className="mt-1.5 space-y-0.5">
                                {payment.appointment && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    📅 {formatSessionDate(payment.appointment.date)}
                                    {payment.appointment.time && (
                                      <span className="text-gray-500">
                                        {' '}
                                        às {payment.appointment.time}
                                      </span>
                                    )}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Registrado em: {formatDateTime(payment.createdAt)}
                                </p>
                                {payment.paidAt && (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    Quitado em: {formatDateTime(payment.paidAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-lg text-green-600 dark:text-green-400">
                                {formatCurrency(payment.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Aba add */
              <form onSubmit={handleCreatePending} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor (R$)
                  </label>
                  <InputCurrency
                    name="addAmount"
                    value={addAmount}
                    onChange={(e) => setAddAmount(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Ex: Sessão extra - pagamento pendente"
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || addAmount <= 0}
                  className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="small" color="border-white" />
                      Registrando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <ArrowDownCircle className="w-5 h-5" />
                      Registrar Débito Pendente
                    </span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Modal de Pagamento Rápido Individual */}
          {showQuickPaymentModal && quickPaymentId && (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                  Registrar Pagamento
                </h3>
                <button
                  onClick={() => {
                    setShowQuickPaymentModal(false);
                    setQuickPaymentId(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleQuickPayment} className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    Débito a ser pago:
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(
                      pendingPayments.find((p) => p.id === quickPaymentId)?.amount || 0
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia_bancaria'].map(
                      (method) => (
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
                          {translatePaymentMethod(method)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                  <p>
                    💡 Ao confirmar, o pagamento será registrado e o débito marcado como quitado.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickPaymentModal(false);
                      setQuickPaymentId(null);
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

          {/* Modal de Pagamento em Lote */}
          {showBulkPaymentModal && (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-amber-600" />
                  Pagamento em Lote
                </h3>
                <button
                  onClick={() => {
                    setShowBulkPaymentModal(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleBulkPayment} className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-2">
                    Itens selecionados ({selectedPayments.size}):
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {pendingPayments
                      .filter((p) => selectedPayments.has(p.id))
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between text-sm border-b border-amber-100 dark:border-amber-800/50 pb-1 last:border-0"
                        >
                          <span className="text-gray-800 dark:text-gray-200 truncate mr-2">
                            {p.description || 'Débito'}
                          </span>
                          <span className="font-medium text-red-600 flex-shrink-0">
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="border-t border-amber-200 dark:border-amber-800 mt-2 pt-2 flex justify-between">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      Total:
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">
                      {formatCurrency(selectedTotal)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia_bancaria'].map(
                      (method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setBulkPaymentMethod(method)}
                          className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            bulkPaymentMethod === method
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                          }`}
                        >
                          {translatePaymentMethod(method)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                  <p>
                    💡 O sistema quitará todos os itens selecionados de uma só vez.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBulkPaymentModal(false)}
                    className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
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
    </>
  );
};

export default PatientBalanceModal;
