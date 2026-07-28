import { CheckCircle, History } from 'lucide-react';
import type { PaymentItem } from '../PatientBalanceModal';

interface Props {
  payments: PaymentItem[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const translateMethod = (method?: string | null): string => {
  if (!method) return '';
  const map: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    credit_card: 'Cartão Crédito',
    debit_card: 'Cartão Débito',
    bank_transfer: 'Transferência',
    cartão: 'Cartão',
    transferencia: 'Transferência',
    cash: 'Dinheiro',
    other: 'Outro',
    outro: 'Outro',
  };
  return map[method] || method;
};

const PaymentMethodBadge = ({ payment }: { payment: PaymentItem }) => {
  if (payment.splitMethods && payment.splitMethods.length >= 2) {
    return (
      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
        <span className="font-semibold">Split:</span>{' '}
        {payment.splitMethods.map((s, i) => (
          <span key={i}>
            {translateMethod(s.method)} {formatCurrency(s.amount)}
            {i < payment.splitMethods!.length - 1 ? ' + ' : ''}
          </span>
        ))}
      </div>
    );
  }
  if (payment.paymentMethod) {
    return (
      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
        💳 {translateMethod(payment.paymentMethod)}
      </p>
    );
  }
  return null;
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

export const PatientBalancePaidTab: React.FC<Props> = ({ payments }) => {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhum pagamento quitado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
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
                          <span className="text-gray-500"> às {payment.appointment.time}</span>
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
                    <PaymentMethodBadge payment={payment} />
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
      ))}
    </div>
  );
};
