import { ArrowDownCircle } from 'lucide-react';
import { InputCurrency } from '../../ui/InputCurrency';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

interface Props {
  amount: number;
  description: string;
  isSubmitting: boolean;
  onAmountChange: (v: number) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const PatientBalanceAddTab: React.FC<Props> = ({
  amount,
  description,
  isSubmitting,
  onAmountChange,
  onDescriptionChange,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-3">
        <div className="w-36 flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor (R$)
          </label>
          <InputCurrency
            name="addAmount"
            value={amount}
            onChange={(e) => onAmountChange(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Ex: Sessão extra - pagamento pendente"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white text-gray-900"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || amount <= 0}
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
  );
};
