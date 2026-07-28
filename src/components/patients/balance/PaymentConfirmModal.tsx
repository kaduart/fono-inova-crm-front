import { DollarSign, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useMemo } from 'react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

export interface SplitMethod {
  method: string;
  amount: number;
}

interface PaymentItemLite {
  id: string;
  description: string | null;
  amount: number;
}

interface Props {
  title: string;
  accentColor: 'blue' | 'amber';
  isOpen: boolean;
  items: PaymentItemLite[];
  totalAmount: number;
  paymentMethod: string;
  splitMethods?: SplitMethod[];
  isSubmitting: boolean;
  onMethodChange: (m: string) => void;
  onSplitMethodsChange?: (methods: SplitMethod[]) => void;
  onConfirm: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'transferencia_bancaria'] as const;

const translatePaymentMethod = (method: string): string => {
  const map: Record<string, string> = {
    dinheiro: '💵 Dinheiro',
    pix: '⚡ PIX',
    cartao_credito: '💳 Cartão Crédito',
    cartao_debito: '💳 Cartão Débito',
    transferencia_bancaria: '🏦 Transferência',
  };
  return map[method] || method;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const PaymentConfirmModal: React.FC<Props> = ({
  title,
  accentColor,
  isOpen,
  items,
  totalAmount,
  paymentMethod,
  splitMethods,
  isSubmitting,
  onMethodChange,
  onSplitMethodsChange,
  onConfirm,
  onCancel,
}) => {
  const [showItems, setShowItems] = useState(false);
  const [useSplit, setUseSplit] = useState(false);

  if (!isOpen) return null;

  const effectiveSplit = useSplit && splitMethods && splitMethods.length > 0 ? splitMethods : [{ method: paymentMethod, amount: totalAmount }];
  const splitTotal = effectiveSplit.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const splitDiff = totalAmount - splitTotal;
  const splitValid = Math.abs(splitDiff) < 0.01 && effectiveSplit.length > 0 && effectiveSplit.every(s => s.method && s.amount > 0);

  const accent = {
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      btnFrom: 'from-blue-600',
      btnTo: 'to-indigo-600',
      btnHoverFrom: 'hover:from-blue-700',
      btnHoverTo: 'hover:to-indigo-700',
      methodBorder: 'border-blue-500',
      methodBg: 'bg-blue-50 dark:bg-blue-900/30',
      methodText: 'text-blue-700 dark:text-blue-300',
      methodHover: 'hover:border-blue-300',
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-800 dark:text-amber-300',
      btnFrom: 'from-amber-600',
      btnTo: 'to-orange-600',
      btnHoverFrom: 'hover:from-amber-700',
      btnHoverTo: 'hover:to-orange-700',
      methodBorder: 'border-amber-500',
      methodBg: 'bg-amber-50 dark:bg-amber-900/30',
      methodText: 'text-amber-700 dark:text-amber-300',
      methodHover: 'hover:border-amber-300',
    },
  }[accentColor];

  const isSingle = items.length === 1;

  const handleSplitToggle = (enabled: boolean) => {
    setUseSplit(enabled);
    if (enabled && onSplitMethodsChange) {
      onSplitMethodsChange([{ method: paymentMethod, amount: totalAmount }]);
    } else if (!enabled && onSplitMethodsChange) {
      onSplitMethodsChange([]);
    }
  };

  const updateSplitAmount = (index: number, amount: string) => {
    if (!onSplitMethodsChange) return;
    const value = amount.replace(/[^\d,]/g, '').replace(',', '.');
    const num = value === '' ? 0 : parseFloat(value);
    const next = [...effectiveSplit];
    next[index] = { ...next[index], amount: num };
    onSplitMethodsChange(next);
  };

  const updateSplitMethod = (index: number, method: string) => {
    if (!onSplitMethodsChange) return;
    const next = [...effectiveSplit];
    next[index] = { ...next[index], method };
    onSplitMethodsChange(next);
  };

  const addSplitMethod = () => {
    if (!onSplitMethodsChange) return;
    const remaining = Math.max(0, totalAmount - splitTotal);
    onSplitMethodsChange([...effectiveSplit, { method: 'dinheiro', amount: remaining }]);
  };

  const removeSplitMethod = (index: number) => {
    if (!onSplitMethodsChange) return;
    const next = effectiveSplit.filter((_, i) => i !== index);
    onSplitMethodsChange(next.length === 0 ? [{ method: paymentMethod, amount: totalAmount }] : next);
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${accent.text}`} />
          {title}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onConfirm} className="flex flex-col flex-1 min-h-0">
        {/* Resumo compacto */}
        <div className={`p-3 rounded-xl border ${accent.border} ${accent.bg} mb-4`}>
          {isSingle ? (
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${accent.text}`}>Débito a ser pago</span>
              <span className="text-xl font-bold text-red-600">{formatCurrency(items[0]?.amount || 0)}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${accent.text}`}>
                  {items.length} itens selecionados
                </span>
                <button
                  type="button"
                  onClick={() => setShowItems(!showItems)}
                  className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showItems ? 'Ocultar' : 'Ver detalhes'}
                  {showItems ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              {showItems && (
                <div className="max-h-28 overflow-y-auto text-sm space-y-1 pr-1">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1 last:border-0"
                    >
                      <span className="text-gray-700 dark:text-gray-300 truncate mr-2">{p.description || 'Débito'}</span>
                      <span className="font-medium text-red-600 flex-shrink-0">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-300 dark:border-gray-700 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Toggle pagamento único / split */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleSplitToggle(false)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              !useSplit
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Pagamento único
          </button>
          <button
            type="button"
            onClick={() => handleSplitToggle(true)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
              useSplit
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Múltiplas formas
          </button>
        </div>

        {/* Forma de pagamento único */}
        {!useSplit && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => onMethodChange(method)}
                  className={`p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    paymentMethod === method
                      ? `${accent.methodBorder} ${accent.methodBg} ${accent.methodText}`
                      : `border-gray-200 dark:border-gray-700 ${accent.methodHover}`
                  }`}
                >
                  {translatePaymentMethod(method)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Split de pagamento */}
        {useSplit && (
          <div className="mb-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Formas de pagamento
              </label>
              <span className={`text-xs font-semibold ${splitValid ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(splitTotal)} / {formatCurrency(totalAmount)}
                {splitDiff !== 0 && (
                  <span className="ml-1">({splitDiff > 0 ? `faltam ${formatCurrency(splitDiff)}` : `sobram ${formatCurrency(Math.abs(splitDiff))}`})</span>
                )}
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {effectiveSplit.map((split, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={split.method}
                    onChange={(e) => updateSplitMethod(index, e.target.value)}
                    className="flex-1 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{translatePaymentMethod(m)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={split.amount === 0 ? '' : split.amount.toString().replace('.', ',')}
                    onChange={(e) => updateSplitAmount(index, e.target.value)}
                    placeholder="0,00"
                    className="w-28 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 text-right"
                  />
                  {effectiveSplit.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSplitMethod(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSplitMethod}
              disabled={splitTotal >= totalAmount}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-gray-400 dark:border-gray-500 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar forma
            </button>
          </div>
        )}

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300 mb-4">
          <p>💡 Ao confirmar, o pagamento será registrado e o débito marcado como quitado.</p>
        </div>

        <div className="flex gap-3 mt-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (useSplit && !splitValid)}
            className={`flex-1 py-3 px-4 bg-gradient-to-r ${accent.btnFrom} ${accent.btnTo} text-white rounded-lg font-semibold ${accent.btnHoverFrom} ${accent.btnHoverTo} transition-all disabled:from-gray-400 disabled:to-gray-500`}
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
  );
};

export default PaymentConfirmModal;
