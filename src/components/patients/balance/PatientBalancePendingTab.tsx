import { useMemo, useState } from 'react';
import { ArrowDownCircle, CheckCircle, CheckSquare, DollarSign, Square, Wallet } from 'lucide-react';
import type { PaymentItem } from '../PatientBalanceModal';

const SPECIALTY_LABELS: Record<string, string> = {
  fonoaudiologia: 'Fonoaudiologia',
  psicologia: 'Psicologia',
  terapia_ocupacional: 'Terapia Ocupacional',
  psicopedagogia: 'Psicopedagogia',
};

const formatSpecialtyLabel = (key: string) =>
  SPECIALTY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface Props {
  payments: PaymentItem[];
  selectablePending: PaymentItem[];
  selectedPayments: Set<string>;
  selectedTotal: number;
  isSubmitting: boolean;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onOpenQuickPayment: (id: string) => void;
  onOpenBulkPayment: () => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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

export const PatientBalancePendingTab: React.FC<Props> = ({
  payments,
  selectablePending,
  selectedPayments,
  selectedTotal,
  isSubmitting,
  onToggleSelection,
  onSelectAll,
  onOpenQuickPayment,
  onOpenBulkPayment,
}) => {
  const [activeSpecialty, setActiveSpecialty] = useState<string | 'todos'>('todos');

  const groupedBySpecialty = useMemo(() => {
    const groups = new Map<string, PaymentItem[]>();
    for (const p of payments) {
      const key = p.specialty || 'outros';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return groups;
  }, [payments]);

  const specialtyKeys = useMemo(
    () => Array.from(groupedBySpecialty.keys()).sort(),
    [groupedBySpecialty]
  );

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p>Sem débitos pendentes</p>
        <p className="text-sm text-gray-400 mt-1">Paciente está em dia!</p>
      </div>
    );
  }

  const allSelected =
    selectablePending.length > 0 && selectedPayments.size === selectablePending.length;

  const visibleGroups =
    activeSpecialty === 'todos'
      ? Array.from(groupedBySpecialty.entries())
      : groupedBySpecialty.has(activeSpecialty)
        ? [[activeSpecialty, groupedBySpecialty.get(activeSpecialty)!] as [string, PaymentItem[]]]
        : [];

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <button
          onClick={onSelectAll}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {allSelected ? (
            <CheckSquare className="w-5 h-5 text-amber-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
          {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>

        {selectedPayments.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedPayments.size} selecionado(s)
            </span>
            <span className="text-sm font-semibold text-gray-800">
              Total: {formatCurrency(selectedTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Filtro por área/especialidade */}
      {specialtyKeys.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSpecialty('todos')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeSpecialty === 'todos'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({payments.length})
          </button>
          {specialtyKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveSpecialty(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                activeSpecialty === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {formatSpecialtyLabel(key)} ({groupedBySpecialty.get(key)!.length})
            </button>
          ))}
        </div>
      )}

      {/* Botão pagamento em lote */}
      {selectedPayments.size > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-800 font-medium">
                Pagamento em Lote
              </p>
              <p className="text-xs text-amber-600">
                Quita todos os itens selecionados de uma vez
              </p>
            </div>
            <button
              onClick={onOpenBulkPayment}
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Pagar Selecionados
            </button>
          </div>
        </div>
      )}

      {/* Lista agrupada por área/especialidade */}
      <div className="space-y-5">
        {visibleGroups.map(([specialtyKey, items]) => (
          <div key={specialtyKey} className="space-y-3">
            {specialtyKeys.length > 1 && (
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  {formatSpecialtyLabel(specialtyKey)}
                </h4>
                <span className="text-xs font-semibold text-gray-500">
                  {formatCurrency(items.reduce((sum, p) => sum + p.amount, 0))}
                </span>
              </div>
            )}
            {items.map((payment) => {
              const isSelected = selectedPayments.has(payment.id);
              const specialty = payment.specialty;
              const isPackageSession = !!payment.packageId;

              return (
            <div
              key={payment.id}
              className={`p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-50/30 ring-1 ring-amber-500'
                  : 'border-red-200 bg-red-50/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleSelection(payment.id)}
                  className="flex-shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>

                <ArrowDownCircle className="w-5 h-5 flex-shrink-0 text-red-500" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {payment.description || 'Sessão'}
                    </p>
                    {specialty && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {specialty}
                      </span>
                    )}
                    {isPackageSession && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Pacote
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap">
                    {payment.appointment?.date && (
                      <p className="text-xs text-gray-600">
                        📅 {formatSessionDate(payment.appointment.date)}
                        {payment.appointment.time && (
                          <span className="text-gray-500"> às {payment.appointment.time}</span>
                        )}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Registrado em: {formatDateTime(payment.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-bold text-lg text-red-600">
                    {formatCurrency(payment.amount)}
                  </p>
                  <button
                    onClick={() => onOpenQuickPayment(payment.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <DollarSign className="w-3 h-3" />
                    Pagar
                  </button>
                </div>
              </div>
            </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
