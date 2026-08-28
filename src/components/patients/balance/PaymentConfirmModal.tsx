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
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      btnFrom: 'from-blue-600',
      btnTo: 'to-indigo-600',
      btnHoverFrom: 'hover:from-blue-700',
      btnHoverTo: 'hover:to-indigo-700',
      methodBorder: 'border-blue-500',
      methodBg: 'bg-blue-50',
      methodText: 'text-blue-700',
      methodHover: 'hover:border-blue-300',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      btnFrom: 'from-amber-600',
      btnTo: 'to-orange-600',
      btnHoverFrom: 'hover:from-amber-700',
      btnHoverTo: 'hover:to-orange-700',
      methodBorder: 'border-amber-500',
      methodBg: 'bg-amber-50',
      methodText: 'text-amber-700',
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

  const formatCentsToBRL = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const updateSplitAmount = (index: number, rawValue: string) => {
    if (!onSplitMethodsChange) return;
    const digits = rawValue.replace(/\D/g, '');
    const cents = digits === '' ? 0 : parseInt(digits, 10);
    const next = [...effectiveSplit];
    next[index] = { ...next[index], amount: cents / 100 };
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
    onSplitMethodsChange([...effectiveSplit, { method: '', amount: remaining }]);
  };

  const removeSplitMethod = (index: number) => {
    if (!onSplitMethodsChange) return;
    const next = effectiveSplit.filter((_, i) => i !== index);
    onSplitMethodsChange(next.length === 0 ? [{ method: paymentMethod, amount: totalAmount }] : next);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className={`w-4 h-4 ${accent.text}`} />
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onConfirm} className="flex flex-col">
          {/* Resumo compacto */}
          <div className={`p-3 rounded-xl border ${accent.border} ${accent.bg} mb-3`}>
            {isSingle ? (
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${accent.text}`}>Débito a ser pago</span>
                <span className="text-lg font-bold text-red-600">{formatCurrency(items[0]?.amount || 0)}</span>
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
                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700"
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
                        className="flex justify-between border-b border-gray-200 pb-1 last:border-0"
                      >
                        <span className="text-gray-700 truncate mr-2">{p.description || 'Débito'}</span>
                        <span className="font-medium text-red-600 flex-shrink-0">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="font-bold text-gray-800">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Toggle pagamento único / split */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => handleSplitToggle(false)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                !useSplit
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Pagamento único
            </button>
            <button
              type="button"
              onClick={() => handleSplitToggle(true)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                useSplit
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Múltiplas formas
            </button>
          </div>

          {/* Forma de pagamento único */}
          {!useSplit && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => onMethodChange(method)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all ${
                      paymentMethod === method
                        ? `${accent.methodBorder} ${accent.methodBg} ${accent.methodText}`
                        : `border-gray-200 ${accent.methodHover}`
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
            <div className="mb-3 space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-medium text-gray-700">
                  Formas de pagamento
                </label>
                <span className={`text-xs font-semibold ${splitValid ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(splitTotal)} / {formatCurrency(totalAmount)}
                  {splitDiff !== 0 && (
                    <span className="ml-1">({splitDiff > 0 ? `faltam ${formatCurrency(splitDiff)}` : `sobram ${formatCurrency(Math.abs(splitDiff))}`})</span>
                  )}
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {effectiveSplit.map((split, index) => (
                  <div key={index} className="flex gap-1.5 items-center">
                    <select
                      value={split.method}
                      onChange={(e) => updateSplitMethod(index, e.target.value)}
                      className={`flex-1 px-2 py-1.5 rounded-lg border text-xs ${
                        split.method ? 'border-gray-300 text-gray-800' : 'border-red-400 text-red-600'
                      } bg-white`}
                    >
                      <option value="" disabled>Selecione...</option>
                      {METHODS.map((m) => (
                        <option key={m} value={m}>{translatePaymentMethod(m)}</option>
                      ))}
                    </select>
                    <div className="relative w-28 flex-shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={split.amount === 0 ? '' : formatCentsToBRL(Math.round(split.amount * 100))}
                        onChange={(e) => updateSplitAmount(index, e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-gray-300 bg-white text-xs text-gray-800 text-right"
                      />
                    </div>
                    {effectiveSplit.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSplitMethod(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSplitMethod}
                disabled={splitTotal >= totalAmount}
                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-gray-400 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar forma
              </button>
            </div>
          )}

          <div className="p-2.5 bg-blue-50 rounded-lg text-xs text-blue-800 mb-3">
            <p>💡 Ao confirmar, o pagamento será registrado e o débito marcado como quitado.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (useSplit && !splitValid)}
              className={`flex-1 py-2 px-4 bg-gradient-to-r ${accent.btnFrom} ${accent.btnTo} text-white rounded-lg text-sm font-semibold ${accent.btnHoverFrom} ${accent.btnHoverTo} transition-all disabled:from-gray-400 disabled:to-gray-500`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="small" color="border-white" />
                  Processando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Confirmar Pagamento
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentConfirmModal;
