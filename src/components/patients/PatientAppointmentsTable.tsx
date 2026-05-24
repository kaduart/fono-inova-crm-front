import { Calendar, Filter, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IAppointment } from '../../utils/types/types';

interface Props {
  appointments: IAppointment[];
  onMonthChange?: (month: string) => void;
}

const statusLabels: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  canceled: 'Cancelado',
  paid: 'Pago',
  missed: 'Faltou',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-teal-100 text-teal-700',
  canceled: 'bg-red-100 text-red-700',
  paid: 'bg-amber-100 text-amber-700',
  missed: 'bg-gray-100 text-gray-700',
};

const paymentStatusLabels: Record<string, string> = {
  paid: 'Pago',
  partial: 'Parcial',
  pending: 'Pendente',
  canceled: 'Cancelado',
  refunded: 'Reembolsado',
  converted_to_package: 'Convertido p/ Pacote',
  recognized: 'Reconhecido',
  consumed: 'Consumido',
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  recognized: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-700',
  refunded: 'bg-gray-100 text-gray-500',
  converted_to_package: 'bg-blue-100 text-blue-700',
  consumed: 'bg-purple-100 text-purple-700',
};

function PaymentStatusBadge({ status }: { status?: string }) {
  const label = paymentStatusLabels[status || ''] || status || '—';
  const colorClass = paymentStatusColors[status || ''] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

export function PatientAppointmentsTable({ appointments, onMonthChange }: Props) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedDay, setSelectedDay] = useState<string>('all');

  // Extrai meses únicos dos appointments — sempre inclui o mês atual
  const months = useMemo(() => {
    const map = new Map<string, string>();
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nowLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    map.set(nowKey, nowLabel);
    appointments.forEach((appt) => {
      const d = new Date(appt.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      map.set(key, label);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [appointments]);

  // Extrai dias únicos do mês selecionado
  const days = useMemo(() => {
    if (selectedMonth === 'all') return [];
    const set = new Set<string>();
    appointments.forEach((appt) => {
      const d = new Date(appt.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key === selectedMonth) {
        set.add(String(d.getDate()).padStart(2, '0'));
      }
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [appointments, selectedMonth]);

  // Filtro de dia client-side (mês já vem filtrado da API)
  const filtered = useMemo(() => {
    return appointments
      .filter((appt) => {
        if (selectedDay === 'all') return true;
        const d = new Date(appt.date);
        return String(d.getDate()).padStart(2, '0') === selectedDay;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedMonth, selectedDay]);

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedDay('all');
    onMonthChange?.('all');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Calendar className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Atendimentos</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {filtered.length} de {appointments.length} atendimentos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelectedDay('all');
                onMonthChange?.(e.target.value);
              }}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">Todos os meses</option>
              {months.map(([key, label]) => (
                <option key={key} value={key}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {selectedMonth !== 'all' && (
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
              >
                <option value="all">Todos os dias</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    Dia {day}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(selectedMonth !== 'all' || selectedDay !== 'all') && (
            <button
              onClick={clearFilters}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Limpar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {filtered.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 text-sm text-gray-700">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Hora</th>
                <th className="px-4 py-3 text-left font-medium">Profissional</th>
                <th className="px-4 py-3 text-left font-medium">Especialidade</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((appt) => (
                <tr key={appt._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(appt.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{appt.time}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {appt.doctor?.fullName || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">
                    {appt.specialty || appt.sessionType || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[appt.operationalStatus || ''] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusLabels[appt.operationalStatus || ''] || appt.operationalStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatCurrency(appt.sessionValue ?? appt.paymentAmount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PaymentStatusBadge status={appt.payment?.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Nenhum atendimento encontrado
            </h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Tente ajustar os filtros de mês ou dia para visualizar outros períodos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
