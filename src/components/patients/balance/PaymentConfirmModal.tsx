import { DollarSign, X } from 'lucide-react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

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
  isSubmitting: boolean;
  onMethodChange: (m: string) => void;
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
  isSubmitting,
  onMethodChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

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

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 z-10 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <DollarSign className={`w-6 h-6 ${accent.text}`} />
          {title}
        </h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={onConfirm} className="space-y-4">
        {/* Resumo do débito */}
        <div className={`p-4 rounded-xl border ${accent.border} ${accent.bg}`}>
          {isSingle ? (
            <>
              <p className={`text-sm font-medium ${accent.text}`}>Débito a ser pago:</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(items[0]?.amount || 0)}
              </p>
            </>
          ) : (
            <>
              <p className={`text-sm font-medium ${accent.text} mb-2`}>
                Itens selecionados ({items.length}):
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {items.map((p) => (
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
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Forma de pagamento */}
        <div>
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

        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
          <p>
            💡 Ao confirmar, o pagamento será registrado e o débito marcado como quitado.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
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
