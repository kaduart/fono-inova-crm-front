import { Calendar, Filter, X, ArrowRightLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { IAppointment } from '../../utils/types/types';
import { getGuides, moveAppointmentToGuide } from '../../services/insuranceGuideApi';
import type { InsuranceGuide } from '../../services/insuranceGuideApi';

interface Props {
  appointments: IAppointment[];
  patientId?: string;
  onMoved?: () => void;
}

// O endpoint /v2/appointments retorna `id`, não `_id` (mapAppointmentToEvent) —
// alguns fluxos legados ainda mandam `_id`. Aceita os dois pra não colidir tudo
// na mesma chave quando `_id` vem undefined.
function apptId(appt: IAppointment): string {
  return appt._id || appt.id || '';
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

function OriginBadge({ appt, ordinalInPackage }: { appt: IAppointment; ordinalInPackage: number | null }) {
  if (appt.package) {
    const total = appt.package.totalSessions;
    const label = ordinalInPackage && total ? `Pacote ${ordinalInPackage}/${total}` : 'Pacote';
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
        {label}
      </span>
    );
  }
  if (appt.liminarContract) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
        Liminar
      </span>
    );
  }
  if (appt.billingType === 'convenio') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
        {appt.insuranceProvider ? `Convênio (${appt.insuranceProvider})` : 'Convênio'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Avulso
    </span>
  );
}

function MoveGuideModal({
  appt,
  patientId,
  onClose,
  onSuccess,
}: {
  appt: IAppointment;
  patientId?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [guides, setGuides] = useState<InsuranceGuide[] | null>(null);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [targetGuideId, setTargetGuideId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    setLoadingGuides(true);
    // 🚨 GET /v2/insurance-guides ignora o filtro de specialty no backend
    // (só filtra patientId/insurance/status) — filtra no client pra não
    // deixar escolher guia de outra especialidade e só descobrir no erro.
    getGuides(patientId)
      .then((all) => setGuides(appt.specialty ? all.filter((g) => g.specialty === appt.specialty) : all))
      .catch((err) => toast.error(err.message || 'Erro ao buscar guias'))
      .finally(() => setLoadingGuides(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, appt.specialty]);

  const handleConfirm = async () => {
    if (!targetGuideId) {
      toast.error('Selecione a guia de destino');
      return;
    }
    setSubmitting(true);
    try {
      await moveAppointmentToGuide(apptId(appt), targetGuideId, { reason: reason || undefined });
      toast.success('Atendimento movido para a nova guia');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover atendimento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5">
        <h4 className="text-base font-semibold text-gray-900 mb-1">Mover atendimento entre guias</h4>
        <p className="text-xs text-gray-500 mb-4">
          {formatDateStatic(appt.date)} · {appt.specialty || appt.sessionType || '—'}
          {appt.insuranceProvider ? ` · ${appt.insuranceProvider}` : ''}
        </p>

        <label className="block text-xs font-medium text-gray-600 mb-1">Guia de destino</label>
        {loadingGuides ? (
          <p className="text-sm text-gray-400 mb-3">Carregando guias...</p>
        ) : (
          <select
            value={targetGuideId}
            onChange={(e) => setTargetGuideId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:border-indigo-400"
          >
            <option value="">Selecione...</option>
            {(guides || []).map((g) => (
              <option key={g._id} value={g._id}>
                {g.number} — {g.insurance} ({g.remaining ?? (g.totalSessions - g.usedSessions)} restantes, {g.status})
              </option>
            ))}
          </select>
        )}

        <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: correção administrativa"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-indigo-400"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !targetGuideId}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Movendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateStatic(date: string | Date) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function PatientAppointmentsTable({ appointments, patientId, onMoved }: Props) {
  const PAGE_SIZE = 10;
  const [movingAppt, setMovingAppt] = useState<IAppointment | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Extrai meses únicos a partir do dataset completo (já vem inteiro do backend,
  // então a lista de meses não depende de qual filtro está selecionado)
  const months = useMemo(() => {
    const map = new Map<string, string>();
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

  // Extrai profissionais únicos presentes no dataset
  const doctors = useMemo(() => {
    const map = new Map<string, string>();
    appointments.forEach((appt) => {
      const id = appt.doctor?._id;
      const name = appt.doctor?.fullName;
      if (id && name) map.set(id, name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [appointments]);

  // Extrai status únicos presentes no dataset
  const statuses = useMemo(() => {
    const set = new Set<string>();
    appointments.forEach((appt) => {
      if (appt.operationalStatus) set.add(appt.operationalStatus);
    });
    return Array.from(set);
  }, [appointments]);

  // Numeração global (ordem cronológica, do 1º atendimento pro mais recente) —
  // estável independente dos filtros aplicados, pra servir de referência rápida.
  const globalOrdinal = useMemo(() => {
    const map = new Map<string, number>();
    const ascending = [...appointments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    ascending.forEach((appt, idx) => map.set(apptId(appt), idx + 1));
    return map;
  }, [appointments]);

  // Posição do atendimento dentro do próprio pacote (ex: 5/16) — só faz
  // sentido pra atendimentos vinculados a um Package.
  const packageOrdinal = useMemo(() => {
    const byPackage = new Map<string, IAppointment[]>();
    appointments.forEach((appt) => {
      const pkgId = appt.package?._id;
      if (!pkgId) return;
      if (!byPackage.has(pkgId)) byPackage.set(pkgId, []);
      byPackage.get(pkgId)!.push(appt);
    });
    const map = new Map<string, number>();
    byPackage.forEach((appts) => {
      const ascending = [...appts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      ascending.forEach((appt, idx) => map.set(apptId(appt), idx + 1));
    });
    return map;
  }, [appointments]);

  // Filtro 100% client-side — mês, dia, profissional e status
  const filtered = useMemo(() => {
    return appointments
      .filter((appt) => {
        const d = new Date(appt.date);
        if (selectedMonth !== 'all') {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== selectedMonth) return false;
        }
        if (selectedDay !== 'all' && String(d.getDate()).padStart(2, '0') !== selectedDay) return false;
        if (selectedDoctor !== 'all' && appt.doctor?._id !== selectedDoctor) return false;
        if (selectedStatus !== 'all' && appt.operationalStatus !== selectedStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, selectedMonth, selectedDay, selectedDoctor, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedAppointments = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedDay, selectedDoctor, selectedStatus, appointments.length]);

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

  const hasActiveFilters =
    selectedMonth !== 'all' || selectedDay !== 'all' || selectedDoctor !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedDay('all');
    setSelectedDoctor('all');
    setSelectedStatus('all');
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

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">Todos os profissionais</option>
              {doctors.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-sm text-gray-700 outline-none cursor-pointer"
            >
              <option value="all">Todos os status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
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
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Hora</th>
                <th className="px-4 py-3 text-left font-medium">Profissional</th>
                <th className="px-4 py-3 text-left font-medium">Especialidade</th>
                <th className="px-4 py-3 text-left font-medium">Origem</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Valor</th>
                <th className="px-4 py-3 text-left font-medium">Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {paginatedAppointments.map((appt) => (
                <tr key={apptId(appt)} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                    {globalOrdinal.get(apptId(appt)) ?? '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(appt.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{appt.time}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {appt.doctor?.fullName || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap capitalize">
                    {appt.specialty || appt.sessionType || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <OriginBadge appt={appt} ordinalInPackage={packageOrdinal.get(apptId(appt)) ?? null} />
                      {appt.billingType === 'convenio' && (
                        <button
                          onClick={() => setMovingAppt(appt)}
                          className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Mover para outra guia"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Exibindo <span className="font-semibold text-gray-700">{(currentPage - 1) * PAGE_SIZE + 1}</span>–<span className="font-semibold text-gray-700">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> de <span className="font-semibold text-gray-700">{filtered.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCurrentPage(page => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
              Anterior
            </button>
            <span className="min-w-24 text-center text-xs font-semibold text-gray-600">Página {currentPage} de {totalPages}</span>
            <button type="button" onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
              Próxima
            </button>
          </div>
        </div>
      )}

      {movingAppt && (
        <MoveGuideModal
          appt={movingAppt}
          patientId={patientId}
          onClose={() => setMovingAppt(null)}
          onSuccess={() => {
            setMovingAppt(null);
            onMoved?.();
          }}
        />
      )}
    </div>
  );
}
