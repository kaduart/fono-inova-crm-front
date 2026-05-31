import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CalendarCheck,
  Package,
  AlertCircle,
  CreditCard,
  Clock,
  User,
  Activity,
  Stethoscope,
  ClipboardCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { format, subMonths, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPaymentsV2 } from '../../../services/paymentService';
import { packageService } from '../../../services/packageService';
import appointmentService from '../../../services/appointmentService';
import { IPatient } from '../../../utils/types/types';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { toast } from 'react-toastify';

// ── Tipos ───────────────────────────────────────────────────────────────────
interface DoctorFinancialTabProps {
  doctorId: string;
  appointments: any[];
  patients: IPatient[];
}

interface PackageLite {
  _id: string;
  name?: string;
  patientName: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  status: string;
  sessionValue?: number;
}

interface V2PaymentItem {
  _id: string;
  date: string;
  patient?: { _id?: string; fullName?: string; phone?: string };
  doctor?: { _id?: string; fullName?: string; specialty?: string };
  amount: number;
  status: 'paid' | 'pending' | 'partial' | 'canceled';
  paymentMethod?: string;
  serviceType?: string;
  category?: string;
  notes?: string;
}

interface MonthlyData {
  month: string;
  label: string;
  received: number;
  produced: number;
  sessions: number;
}

interface TodayStats {
  cash: number;
  sessions: number;
  evaluations: number;
  production: number;
  scheduled: number;
  completed: number;
  canceled: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const currentMonth = () => format(new Date(), 'yyyy-MM');
const todayStr = () => format(new Date(), 'yyyy-MM-dd');
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-');
  return format(new Date(Number(y), Number(mo) - 1, 1), 'MMM', { locale: ptBR });
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const KPICard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'emerald' | 'amber' | 'blue' | 'rose' | 'violet' | 'cyan';
  subtitle?: string;
}> = ({ title, value, icon, color, subtitle }) => {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  const iconBgMap = {
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    rose: 'bg-rose-100 text-rose-600',
    violet: 'bg-violet-100 text-violet-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${iconBgMap[color]}`}>{icon}</div>
      </div>
    </div>
  );
};

// ── Card do dia (estilo admin) ──────────────────────────────────────────────
const TodayCard: React.FC<{
  title: string;
  subtitle: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, subtitle, value, detail, icon, color }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
    <p className="text-xs text-gray-500 mt-1">{detail}</p>
  </div>
);

// ── Componente principal ────────────────────────────────────────────────────
const DoctorFinancialTab: React.FC<DoctorFinancialTabProps> = ({
  doctorId,
  appointments,
  patients,
}) => {
  const [loading, setLoading] = useState(true);
  const [monthPayments, setMonthPayments] = useState<V2PaymentItem[]>([]);
  const [todayPayments, setTodayPayments] = useState<V2PaymentItem[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [packages, setPackages] = useState<PackageLite[]>([]);
  const [monthlyChart, setMonthlyChart] = useState<MonthlyData[]>([]);
  const hasLoadedRef = useRef(false);
  const abortCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!doctorId || hasLoadedRef.current) return;

    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortCtrlRef.current = abortCtrl;

    async function load() {
      setLoading(true);
      hasLoadedRef.current = true;

      try {
        const thisMonth = currentMonth();
        const today = todayStr();

        // 1. Payments do mês atual (consolidado para KPIs + listas)
        const monthRes = await getPaymentsV2({
          doctorId,
          month: thisMonth,
          limit: 500,
        });
        setMonthPayments((monthRes.data?.data || []) as V2PaymentItem[]);

        // 2. Payments de HOJE (para caixa e produção)
        const todayRes = await getPaymentsV2({
          doctorId,
          startDate: today,
          endDate: today,
          limit: 500,
        });
        setTodayPayments((todayRes.data?.data || []) as V2PaymentItem[]);

        // 3. Appointments de HOJE (para sessões e avaliações)
        const apptRes = await appointmentService.getAppointmentsByType({
          doctorId,
          date: today,
        });
        setTodayAppointments(apptRes.data?.appointments || []);

        // 4. Gráfico dos últimos 6 meses
        const chartMonths = Array.from({ length: 6 }, (_, i) =>
          format(subMonths(new Date(), 5 - i), 'yyyy-MM')
        );

        const chartPromises = chartMonths.map(async (m) => {
          try {
            const res = await getPaymentsV2({ doctorId, month: m, limit: 1 });
            return {
              month: m,
              label: monthLabel(m),
              received: res.data?.received || 0,
              produced: res.data?.produced || 0,
              sessions: res.data?.countPaid || 0,
            };
          } catch {
            return { month: m, label: monthLabel(m), received: 0, produced: 0, sessions: 0 };
          }
        });

        const chartData = await Promise.all(chartPromises);
        if (!abortCtrl.signal.aborted) {
          setMonthlyChart(chartData);
        }

        // 5. Packages dos patients
        const activePatients = patients.filter((p) => p._id).slice(0, 20);
        const packagePromises = activePatients.map((p) =>
          packageService.listPackages({ patientId: p._id!, limit: 50 }).catch(() => null)
        );
        const packagesResults = await Promise.all(packagePromises);

        const allPackages: PackageLite[] = [];
        packagesResults.forEach((res, idx) => {
          if (!res || !res.packages) return;
          const patient = activePatients[idx];
          res.packages.forEach((pkg: any) => {
            const completed =
              pkg.sessions?.filter((s: any) => s.status === 'completed').length || 0;
            const total = pkg.totalSessions || 0;
            allPackages.push({
              _id: pkg._id,
              name: pkg.name || 'Pacote',
              patientName: patient.fullName || 'Paciente',
              totalSessions: total,
              completedSessions: completed,
              remainingSessions: total - completed,
              status: pkg.status,
              sessionValue: pkg.sessionValue,
            });
          });
        });

        if (!abortCtrl.signal.aborted) {
          setPackages(allPackages);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message === 'canceled') return;
        console.error('Erro ao carregar dados financeiros:', err);
        toast.error(extractErrorMessage(err, 'Erro ao carregar dados financeiros'));
      } finally {
        if (!abortCtrl.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      abortCtrl.abort();
    };
  }, [doctorId]);

  // ── Métricas do dia ───────────────────────────────────────────────────────
  const todayStats: TodayStats = useMemo(() => {
    const cash = todayPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const production = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    const sessions = todayAppointments.length;
    const evaluations = todayAppointments.filter(
      (a) => a.serviceType === 'evaluation' || a.sessionType === 'evaluation'
    ).length;
    const scheduled = todayAppointments.filter((a) => a.status === 'scheduled').length;
    const completed = todayAppointments.filter((a) => a.status === 'completed').length;
    const canceled = todayAppointments.filter((a) => a.status === 'canceled').length;

    return { cash, sessions, evaluations, production, scheduled, completed, canceled };
  }, [todayPayments, todayAppointments]);

  // ── Métricas do mês ───────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const received = monthPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const pending = monthPayments
      .filter((p) => p.status === 'pending' || p.status === 'partial')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const countPaid = monthPayments.filter((p) => p.status === 'paid').length;
    const countPending = monthPayments.filter((p) => p.status === 'pending' || p.status === 'partial').length;

    const recentPayments = monthPayments
      .filter((p) => p.status === 'paid')
      .sort((a, b) => {
        try {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        } catch {
          return 0;
        }
      })
      .slice(0, 8);

    const pendingPayments = monthPayments
      .filter((p) => p.status === 'pending' || p.status === 'partial')
      .sort((a, b) => {
        try {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } catch {
          return 0;
        }
      })
      .slice(0, 8);

    return { received, pending, countPaid, countPending, recentPayments, pendingPayments };
  }, [monthPayments]);

  // Sessões concluídas no mês (via appointments prop)
  const completedSessionsMonth = useMemo(() => {
    const now = new Date();
    const monthStr = format(now, 'yyyy-MM');
    return appointments.filter((a) => {
      if (a.status !== 'completed' || !a.date) return false;
      try {
        const d = typeof a.date === 'string' ? parseISO(a.date) : new Date(a.date);
        return format(d, 'yyyy-MM') === monthStr;
      } catch {
        return false;
      }
    }).length;
  }, [appointments]);

  const activePackages = useMemo(
    () => packages.filter((p) => p.status === 'active').length,
    [packages]
  );

  const endingPackages = useMemo(
    () =>
      packages
        .filter((p) => p.status === 'active' && p.remainingSessions <= 2)
        .sort((a, b) => a.remainingSessions - b.remainingSessions)
        .slice(0, 8),
    [packages]
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl bg-gray-100" />
          <div className="h-64 rounded-2xl bg-gray-100" />
          <div className="h-64 rounded-2xl bg-gray-100" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Visão Financeira</h2>
          <p className="text-sm text-gray-500">
            Dados referentes aos seus atendimentos e recebimentos
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 border border-amber-200">
          <AlertCircle size={14} className="text-amber-600" />
          <span className="text-xs font-medium text-amber-700">Modo leitura</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SEÇÃO: HOJE                                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Activity size={16} className="text-emerald-600" />
          Resumo do Dia — {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TodayCard
            title="Caixa Hoje"
            subtitle="Dinheiro Recebido"
            value={formatCurrency(todayStats.cash)}
            detail={`${todayPayments.filter((p) => p.status === 'paid').length} transações`}
            icon={<DollarSign size={18} />}
            color="bg-emerald-100 text-emerald-600"
          />
          <TodayCard
            title="Produção Hoje"
            subtitle="Valor Total"
            value={formatCurrency(todayStats.production)}
            detail={`${todayStats.sessions} sessões agendadas`}
            icon={<TrendingUp size={18} />}
            color="bg-blue-100 text-blue-600"
          />
          <TodayCard
            title="Agenda Hoje"
            subtitle="Estado da Operação"
            value={`${todayStats.completed} / ${todayStats.sessions}`}
            detail={`${todayStats.scheduled} aguardando · ${todayStats.canceled} cancelados`}
            icon={<CalendarCheck size={18} />}
            color="bg-cyan-100 text-cyan-600"
          />
          <TodayCard
            title="Avaliações"
            subtitle="Exames e Avaliações"
            value={todayStats.evaluations.toString()}
            detail={todayStats.evaluations > 0 ? 'Agendadas para hoje' : 'Nenhuma hoje'}
            icon={<ClipboardCheck size={18} />}
            color="bg-violet-100 text-violet-600"
          />
        </div>
      </div>

      {/* KPIs Mensais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Recebido no Mês"
          value={formatCurrency(metrics.received)}
          icon={<DollarSign size={20} />}
          color="emerald"
          subtitle={`${metrics.countPaid} pagamentos confirmados`}
        />
        <KPICard
          title="A Receber"
          value={formatCurrency(metrics.pending)}
          icon={<Clock size={20} />}
          color="amber"
          subtitle={`${metrics.countPending} pendências`}
        />
        <KPICard
          title="Sessões Concluídas"
          value={completedSessionsMonth.toString()}
          icon={<CalendarCheck size={20} />}
          color="blue"
          subtitle="Neste mês"
        />
        <KPICard
          title="Pacotes Ativos"
          value={activePackages.toString()}
          icon={<Package size={20} />}
          color="violet"
          subtitle="Em andamento"
        />
      </div>

      {/* Gráfico de evolução mensal */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-emerald-600" />
          <h3 className="font-semibold text-gray-800">Evolução Mensal</h3>
          <span className="text-xs text-gray-400 ml-2">(últimos 6 meses)</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Bar dataKey="received" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {monthlyChart.map((_entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === monthlyChart.length - 1 ? '#10b981' : '#6ee7b7'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos recebimentos */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <CreditCard size={16} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Últimos Recebimentos</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {metrics.recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Nenhum recebimento encontrado
              </div>
            ) : (
              metrics.recentPayments.map((p) => (
                <div
                  key={p._id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.patient?.fullName || 'Paciente'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.date ? format(parseISO(p.date), 'dd/MM/yyyy') : '--'}
                      {p.paymentMethod && (
                        <span className="ml-1 text-gray-300">· {p.paymentMethod}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 ml-3 shrink-0">
                    {formatCurrency(p.amount || 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pendências */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Pendências</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {metrics.pendingPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Nenhuma pendência encontrada
              </div>
            ) : (
              metrics.pendingPayments.map((p) => (
                <div
                  key={p._id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.patient?.fullName || 'Paciente'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.date ? format(parseISO(p.date), 'dd/MM/yyyy') : '--'}
                      {' · '}
                      <span className="text-amber-600 font-medium">{p.status}</span>
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-600 ml-3 shrink-0">
                    {formatCurrency(p.amount || 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pacotes próximos do fim */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Package size={16} className="text-violet-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Pacotes Próximos do Fim</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {endingPackages.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">
                Nenhum pacote próximo do fim
              </div>
            ) : (
              endingPackages.map((pkg) => (
                <div key={pkg._id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{pkg.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={10} />
                        {pkg.patientName}
                      </p>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          pkg.remainingSessions === 0
                            ? 'bg-red-100 text-red-700'
                            : pkg.remainingSessions === 1
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {pkg.remainingSessions} restante
                        {pkg.remainingSessions !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{
                          width: `${
                            pkg.totalSessions > 0
                              ? (pkg.completedSessions / pkg.totalSessions) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer disclaimer */}
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          Estes dados são apenas para consulta. Em caso de divergências, entre em contato com a
          administração da clínica. O caixa e competência são gerenciados exclusivamente pela equipe
          financeira.
        </p>
      </div>
    </div>
  );
};

export default DoctorFinancialTab;
