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

const PaymentMethodInline = ({ payment }: { payment: PaymentItem }) => {
  if (payment.splitMethods && payment.splitMethods.length >= 2) {
    return (
      <>
        <span className="text-gray-300">•</span>
        <span className="text-green-700 font-medium">
          Split:{' '}
          {payment.splitMethods.map((s, i) => (
            <span key={i}>
              {translateMethod(s.method)} {formatCurrency(s.amount)}
              {i < payment.splitMethods!.length - 1 ? ' + ' : ''}
            </span>
          ))}
        </span>
      </>
    );
  }
  if (payment.paymentMethod) {
    return (
      <>
        <span className="text-gray-300">•</span>
        <span className="text-green-700">💳 {translateMethod(payment.paymentMethod)}</span>
      </>
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
          className="p-3 rounded-xl border border-green-200 bg-green-50/30"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900 truncate">
                  {payment.description || 'Pagamento'}
                </p>
                <p className="font-bold text-lg text-green-600 flex-shrink-0">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-xs text-gray-500">
                {payment.appointment && (
                  <span className="text-gray-600">
                    📅 {formatSessionDate(payment.appointment.date)}
                    {payment.appointment.time && (
                      <span className="text-gray-500"> às {payment.appointment.time}</span>
                    )}
                  </span>
                )}
                {payment.appointment && <span className="text-gray-300">•</span>}
                <span>Registrado: {formatDateTime(payment.createdAt)}</span>
                {payment.paidAt && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-green-600">Quitado: {formatDateTime(payment.paidAt)}</span>
                  </>
                )}
                <PaymentMethodInline payment={payment} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
