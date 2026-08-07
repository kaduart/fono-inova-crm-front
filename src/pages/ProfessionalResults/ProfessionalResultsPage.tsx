// src/pages/ProfessionalResults/ProfessionalResultsPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, FormControl, Select, MenuItem, Button } from '@mui/material';
import {
  Trophy,
  UserCircle,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign,
  Lock,
  X,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useProfessionalResults, TabValue } from '../../hooks/useProfessionalResults';
import { RankingProfissionais } from '../Financial/components/RankingProfissionais';
import { ListaPacientesVIP } from '../Financial/components/ListaPacientesVIP';
import AlertsPanel from '../../components/doctor/AlertsPanel';
import { ReceivablesCard } from './components/ReceivablesCard';
import { ProfessionalResultsTable, Column } from './components/ProfessionalResultsTable';
import { SettlementItem, SettlementPreview, professionalResultsService } from '../../services/professionalResultsService';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

const KPICard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: { current: number; previous: number; label?: string };
  onClick?: () => void;
  active?: boolean;
}> = ({ title, value, icon, color, subtitle, trend, onClick, active }) => {
  let trendNode: React.ReactNode = null;
  if (trend && trend.previous > 0) {
    const change = ((trend.current - trend.previous) / trend.previous) * 100;
    const isPositive = change >= 0;
    trendNode = (
      <div className={`text-xs font-medium mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% <span className="text-gray-500">vs {trend.label || 'período anterior'}</span>
      </div>
    );
  } else if (trend && trend.previous === 0 && trend.current > 0) {
    trendNode = (
      <div className="text-xs font-medium mt-1 text-emerald-600">
        ↑ novo <span className="text-gray-500">vs {trend.label || 'período anterior'}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
      style={{
        borderColor: active ? color : `${color}30`,
        backgroundColor: `${color}08`,
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: '2px',
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20`, color }}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
      {trendNode}
    </div>
  );
};

interface ProfessionalResultsPageProps {
  month?: number;
  year?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

export const ProfessionalResultsPage: React.FC<ProfessionalResultsPageProps> = ({
  month: externalMonth,
  year: externalYear,
  onMonthChange,
  onYearChange,
}) => {
  const {
    activeTab,
    setActiveTab,
    period,
    setPeriod,
    selectedDoctorId,
    setSelectedDoctorId,
    ranking,
    loadingRanking,
    summary,
    loadingSummary,
    previousSummary,
    loadingPreviousSummary,
    patients,
    loadingPatients,
    settlements,
    loadingSettlements,
    issues,
    loadingIssues,
    refresh,
  } = useProfessionalResults();

  const selectedDoctor = useMemo(
    () => ranking.find((d) => d.doctorId === selectedDoctorId) || null,
    [ranking, selectedDoctorId]
  );

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const toggleCard = (card: string) => setSelectedCard(prev => prev === card ? null : card);

  // 🔒 Fechamento mensal — preview antes de confirmar, nunca fecha direto
  const [closeModal, setCloseModal] = useState<{
    open: boolean;
    loading: boolean;
    confirming: boolean;
    preview: SettlementPreview | null;
  }>({ open: false, loading: false, confirming: false, preview: null });

  const handleOpenCloseModal = async () => {
    if (!selectedDoctorId) return;
    setCloseModal({ open: true, loading: true, confirming: false, preview: null });
    try {
      const preview = await professionalResultsService.previewSettlement(
        selectedDoctorId,
        currentMonth.month,
        currentMonth.year
      );
      setCloseModal({ open: true, loading: false, confirming: false, preview });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar prévia do fechamento');
      setCloseModal({ open: false, loading: false, confirming: false, preview: null });
    }
  };

  const handleConfirmClose = async () => {
    if (!selectedDoctorId) return;
    setCloseModal((prev) => ({ ...prev, confirming: true }));
    try {
      // O backend exige `force` quando há pendência financeira no período. O modal
      // já exibe o aviso detalhado acima, então confirmar aqui é a ciência explícita
      // do usuário — sem isso o fechamento ficava travado sem saída pela tela.
      const temPendencia = !!closeModal.preview?.hasFinancialIssues;
      await professionalResultsService.closeSettlement(
        selectedDoctorId,
        currentMonth.month,
        currentMonth.year,
        { force: temPendencia }
      );
      toast.success('Mês fechado com sucesso!');
      setCloseModal({ open: false, loading: false, confirming: false, preview: null });
      refresh();
    } catch (err: any) {
      // Mensagem do servidor primeiro — `err.message` do axios é sempre o genérico
      // "Request failed with status code XXX", que não diz nada ao usuário.
      const msg = err?.response?.data?.message
        || (err instanceof Error ? err.message : null)
        || 'Erro ao fechar o mês';
      toast.error(msg);
      setCloseModal((prev) => ({ ...prev, confirming: false }));
    }
  };

  const handleDoctorClick = (doctorId: string) => {
    setSelectedDoctorId(doctorId);
    setActiveTab('result');
  };

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const years = useMemo(() => [2024, 2025, 2026, 2027], []);

  const currentMonth = useMemo(() => {
    const [year, month] = period.startDate.split('-').map(Number);
    return { year, month };
  }, [period]);

  // 🔗 Sincroniza com o seletor global do Painel Financeiro (topo da página) —
  // sem isso esta aba mantinha um período 100% desconectado, sempre iniciando
  // no mês atual mesmo com outra aba já filtrada por outro mês.
  useEffect(() => {
    if (externalMonth === undefined || externalYear === undefined) return;
    if (externalMonth === currentMonth.month && externalYear === currentMonth.year) return;
    const start = `${externalYear}-${String(externalMonth).padStart(2, '0')}-01`;
    const end = new Date(externalYear, externalMonth, 0).toISOString().split('T')[0];
    setPeriod({ startDate: start, endDate: end });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMonth, externalYear]);

  const handleMonthChange = (month: number) => {
    const year = currentMonth.year;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    setPeriod({ startDate: start, endDate: end });
    onMonthChange?.(month);
  };

  const handleYearChange = (year: number) => {
    const month = currentMonth.month;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    setPeriod({ startDate: start, endDate: end });
    onYearChange?.(year);
  };

  const settlementColumns: Column<SettlementItem>[] = [
    { key: 'period', header: 'Competência', render: (row) => `${String(row.periodMonth).padStart(2, '0')}/${row.periodYear}` },
    { key: 'commission', header: 'Comissão', align: 'right', render: (row) => formatCurrency(row.snapshot.commission) },
    { key: 'advances', header: 'Adiantamentos', align: 'right', render: (row) => formatCurrency(row.snapshot.advances) },
    { key: 'balance', header: 'Saldo', align: 'right', render: (row) => formatCurrency(row.snapshot.balance) },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === 'closed'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {row.status === 'closed' ? 'Fechado' : 'Cancelado'}
        </span>
      ),
    },
    { key: 'closedAt', header: 'Fechado em', render: (row) => formatDate(row.closedAt) },
  ];

  const issueAlerts = issues.map((issue) => ({
    id: `${issue.type}-${issue.entityId || Math.random()}`,
    type: issue.severity === 'high' ? 'urgent' : issue.severity === 'medium' ? 'warning' : 'info',
    title: issue.type === 'orphan_payment' ? 'Pagamento órfão' : issue.type === 'private_pending' ? 'Particular pendente' : 'Problema financeiro',
    description: `${issue.description} — ${issue.doctorName || 'Sem profissional'}${issue.patientName ? ` / ${issue.patientName}` : ''}${issue.amount ? ` (${formatCurrency(issue.amount)})` : ''}`,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#10B98118' }}>
            <DollarSign size={28} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Centro de Resultado dos Profissionais</h2>
            <p className="text-sm text-gray-500 mt-0.5">Produção, recebimento, comissão e saldo por profissional</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 items-center">
            <Calendar size={16} color="#666" />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={currentMonth.month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
              >
                {months.map((m) => (
                  <MenuItem key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('pt-BR', { month: 'short' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={currentMonth.year}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
          <button
            onClick={refresh}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
          <div className="px-3 pt-3 pb-0 border-b border-gray-100">
            <TabsList className="bg-gray-100 p-1 rounded-xl">
              <TabsTrigger value="ranking" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                <Trophy size={16} />
                Ranking
              </TabsTrigger>
              <TabsTrigger value="result" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                <UserCircle size={16} />
                Resultado
              </TabsTrigger>
              <TabsTrigger value="patients" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                <Users size={16} />
                Pacientes
              </TabsTrigger>
              <TabsTrigger value="settlements" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                <FileText size={16} />
                Fechamentos
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900">
                <AlertTriangle size={16} />
                Saúde Financeira
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4">
            <TabsContent value="ranking">
              <RankingProfissionais
                data={ranking}
                loading={loadingRanking}
                onRowClick={handleDoctorClick}
                title="Ranking de Profissionais"
                onAdvanceRegistered={refresh}
              />
            </TabsContent>

            <TabsContent value="result">
              {!selectedDoctorId ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'grey.500' }}>
                  <UserCircle size={48} color="#9ca3af" />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Selecione um profissional no Ranking
                  </Typography>
                  <Typography variant="body2">
                    Clique em um profissional para ver seu resultado detalhado.
                  </Typography>
                </Box>
              ) : loadingSummary && !summary ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Carregando...</div>
                </div>
              ) : summary ? (
                <Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" fontWeight="bold" color="grey.800">
                      {summary.doctorName}
                    </Typography>
                    <Typography variant="body2" color="grey.500" sx={{ textTransform: 'capitalize' }}>
                      {summary.specialty} • Período: {summary.period.start} a {summary.period.end}
                    </Typography>
                  </Box>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <KPICard
                      title="Pacientes Ativos"
                      value={String(summary.patients.active)}
                      icon={<Users size={20} />}
                      color="#3b82f6"
                      trend={previousSummary ? { current: summary.patients.active, previous: previousSummary.patients.active } : undefined}
                      onClick={() => toggleCard('patients')}
                      active={selectedCard === 'patients'}
                    />
                    <KPICard
                      title="Produção"
                      value={formatCurrency(summary.production.total)}
                      icon={<DollarSign size={20} />}
                      color="#10b981"
                      trend={previousSummary ? { current: summary.production.total, previous: previousSummary.production.total } : undefined}
                      onClick={() => toggleCard('production')}
                      active={selectedCard === 'production'}
                    />
                    <KPICard
                      title="Recebido"
                      value={formatCurrency(summary.received.total)}
                      subtitle={
                        summary.received.packageSales > 0
                          ? `${formatCurrency(summary.received.sessionCash ?? 0)} sessões · ${formatCurrency(summary.received.packageSales)} pacotes vendidos`
                          : undefined
                      }
                      icon={<DollarSign size={20} />}
                      color="#6366f1"
                      trend={previousSummary ? { current: summary.received.total, previous: previousSummary.received.total } : undefined}
                      onClick={() => toggleCard('received')}
                      active={selectedCard === 'received'}
                    />
                    {(() => {
                      const realPending =
                        (summary.receivables.insurance ?? 0) +
                        (summary.receivables.particular ?? 0) +
                        (summary.receivables.liminar ?? 0);
                      const prevRealPending = previousSummary
                        ? (previousSummary.receivables.insurance ?? 0) +
                          (previousSummary.receivables.particular ?? 0) +
                          (previousSummary.receivables.liminar ?? 0)
                        : undefined;
                      return (
                        <KPICard
                          title="A Receber"
                          value={formatCurrency(realPending)}
                          subtitle={
                            summary.receivables.packageConsumed > 0
                              ? `+ ${formatCurrency(summary.receivables.packageConsumed)} sessões pré-pagas realizadas`
                              : undefined
                          }
                          icon={<DollarSign size={20} />}
                          color="#f59e0b"
                          trend={
                            prevRealPending !== undefined
                              ? { current: realPending, previous: prevRealPending }
                              : undefined
                          }
                          onClick={() => toggleCard('receivables')}
                          active={selectedCard === 'receivables'}
                        />
                      );
                    })()}
                    <KPICard
                      title="Comissão"
                      value={formatCurrency(summary.commission)}
                      icon={<DollarSign size={20} />}
                      color="#8b5cf6"
                      trend={previousSummary ? { current: summary.commission, previous: previousSummary.commission } : undefined}
                      onClick={() => toggleCard('commission')}
                      active={selectedCard === 'commission'}
                    />
                    <KPICard
                      title="Adiantamentos"
                      value={formatCurrency(summary.advances)}
                      icon={<DollarSign size={20} />}
                      color="#ef4444"
                      trend={previousSummary ? { current: summary.advances, previous: previousSummary.advances } : undefined}
                      onClick={() => toggleCard('advances')}
                      active={selectedCard === 'advances'}
                    />
                    <KPICard
                      title="Saldo"
                      value={formatCurrency(summary.balance)}
                      icon={<DollarSign size={20} />}
                      color={summary.balance >= 0 ? '#10b981' : '#ef4444'}
                      trend={previousSummary ? { current: summary.balance, previous: previousSummary.balance } : undefined}
                      onClick={() => toggleCard('balance')}
                      active={selectedCard === 'balance'}
                    />
                    <KPICard
                      title="Sessões Realizadas"
                      value={String(summary.sessions.completed)}
                      icon={<Calendar size={20} />}
                      color="#06b6d4"
                      trend={previousSummary ? { current: summary.sessions.completed, previous: previousSummary.sessions.completed } : undefined}
                      onClick={() => toggleCard('sessions')}
                      active={selectedCard === 'sessions'}
                    />
                  </div>

                  {/* Painel de detalhe do card selecionado */}
                  {selectedCard && (
                    <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <span className="text-sm font-semibold text-gray-700">
                          {{ patients: 'Pacientes Ativos', production: 'Produção', received: 'Recebido', receivables: 'A Receber', commission: 'Comissão', advances: 'Adiantamentos', balance: 'Saldo', sessions: 'Sessões Realizadas' }[selectedCard]}
                        </span>
                        <button onClick={() => setSelectedCard(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ fechar</button>
                      </div>
                      <div className="p-4">

                        {/* PACIENTES ATIVOS */}
                        {selectedCard === 'patients' && (
                          patients.length === 0
                            ? <p className="text-sm text-gray-400">Nenhum dado de paciente disponível.</p>
                            : <table className="w-full text-sm">
                                <thead><tr className="text-left text-xs text-gray-400 border-b">
                                  <th className="pb-2 font-medium">Paciente</th>
                                  <th className="pb-2 font-medium text-right">Sessões</th>
                                  <th className="pb-2 font-medium text-right">Produção</th>
                                  <th className="pb-2 font-medium text-right">Recebido</th>
                                  <th className="pb-2 font-medium text-right">Comissão</th>
                                  <th className="pb-2 font-medium text-right">Última sessão</th>
                                </tr></thead>
                                <tbody>
                                  {patients.map(p => (
                                    <tr key={p.patientId} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-2 font-medium text-gray-800">{p.patientName}</td>
                                      <td className="py-2 text-right text-gray-600">{p.sessionsCompleted}</td>
                                      <td className="py-2 text-right text-emerald-600">{formatCurrency(p.production)}</td>
                                      <td className="py-2 text-right text-gray-600">{formatCurrency(p.received)}</td>
                                      <td className="py-2 text-right text-purple-600">{formatCurrency(p.commission)}</td>
                                      <td className="py-2 text-right text-gray-400 text-xs">{p.lastSession ? formatDate(p.lastSession) : '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                        )}

                        {/* PRODUÇÃO */}
                        {selectedCard === 'production' && (
                          <div className="space-y-2">
                            {[
                              { label: 'Particular', value: summary.production.particular, color: '#10b981' },
                              { label: 'Pacote', value: summary.production.pacote, color: '#3b82f6' },
                              { label: 'Convênio', value: summary.production.convenio, color: '#6366f1' },
                              { label: 'Liminar', value: summary.production.liminar, color: '#f59e0b' },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                                  <span className="text-sm text-gray-700">{row.label}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(row.value)}</span>
                                  <span className="text-xs text-gray-400 w-10 text-right">
                                    {summary.production.total > 0 ? `${Math.round((row.value / summary.production.total) * 100)}%` : '—'}
                                  </span>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm font-bold text-gray-800">Total</span>
                              <span className="text-sm font-bold text-emerald-600">{formatCurrency(summary.production.total)}</span>
                            </div>
                          </div>
                        )}

                        {/* RECEBIDO */}
                        {selectedCard === 'received' && (
                          <div className="space-y-2">
                            {[
                              { label: 'Sessões (caixa)', value: summary.received.sessionCash ?? summary.received.particular, color: '#6366f1' },
                              { label: 'Pacotes vendidos', value: summary.received.packageSales, color: '#3b82f6' },
                              { label: 'Convênio', value: summary.received.convenio, color: '#10b981' },
                              { label: 'Liminar', value: summary.received.liminar, color: '#f59e0b' },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                                  <span className="text-sm text-gray-700">{row.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{formatCurrency(row.value)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm font-bold text-gray-800">Total recebido</span>
                              <span className="text-sm font-bold text-indigo-600">{formatCurrency(summary.received.total)}</span>
                            </div>
                          </div>
                        )}

                        {/* A RECEBER */}
                        {selectedCard === 'receivables' && (
                          <div className="space-y-2">
                            {[
                              { label: 'Particular pendente', value: summary.receivables.particular, color: '#ef4444' },
                              { label: 'Convênio aguardando', value: summary.receivables.insurance, color: '#6366f1' },
                              { label: 'Liminar', value: summary.receivables.liminar, color: '#f59e0b' },
                              { label: 'Pacotes pré-pagos (info)', value: summary.receivables.packageConsumed, color: '#9ca3af' },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                                  <span className="text-sm text-gray-700">{row.label}</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{formatCurrency(row.value)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* COMISSÃO */}
                        {selectedCard === 'commission' && (
                          patients.length === 0
                            ? <p className="text-sm text-gray-400">Nenhum dado disponível.</p>
                            : <table className="w-full text-sm">
                                <thead><tr className="text-left text-xs text-gray-400 border-b">
                                  <th className="pb-2 font-medium">Paciente</th>
                                  <th className="pb-2 font-medium text-right">Sessões</th>
                                  <th className="pb-2 font-medium text-right">Produção</th>
                                  <th className="pb-2 font-medium text-right">Comissão</th>
                                </tr></thead>
                                <tbody>
                                  {[...patients].sort((a, b) => b.commission - a.commission).map(p => (
                                    <tr key={p.patientId} className="border-b border-gray-50 hover:bg-gray-50">
                                      <td className="py-2 font-medium text-gray-800">{p.patientName}</td>
                                      <td className="py-2 text-right text-gray-600">{p.sessionsCompleted}</td>
                                      <td className="py-2 text-right text-gray-600">{formatCurrency(p.production)}</td>
                                      <td className="py-2 text-right font-semibold text-purple-600">{formatCurrency(p.commission)}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-gray-200">
                                    <td className="py-2 font-bold text-gray-800" colSpan={3}>Total</td>
                                    <td className="py-2 text-right font-bold text-purple-600">{formatCurrency(summary.commission)}</td>
                                  </tr>
                                </tbody>
                              </table>
                        )}

                        {/* ADIANTAMENTOS */}
                        {selectedCard === 'advances' && (
                          <div className="text-sm text-gray-600">
                            <p>Total de adiantamentos no período: <span className="font-semibold text-red-500">{formatCurrency(summary.advances)}</span></p>
                            <p className="text-xs text-gray-400 mt-1">Para ver o histórico detalhado, acesse a aba Fechamentos.</p>
                          </div>
                        )}

                        {/* SALDO */}
                        {selectedCard === 'balance' && (
                          <div className="space-y-2">
                            {[
                              { label: 'Comissão bruta', value: summary.commission, color: '#8b5cf6' },
                              { label: 'Adiantamentos', value: -summary.advances, color: '#ef4444' },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                                <span className="text-sm text-gray-700">{row.label}</span>
                                <span className={`text-sm font-semibold ${row.value >= 0 ? 'text-gray-800' : 'text-red-500'}`}>{formatCurrency(Math.abs(row.value))}{row.value < 0 ? ' (-)' : ''}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm font-bold text-gray-800">Saldo líquido</span>
                              <span className={`text-sm font-bold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(summary.balance)}</span>
                            </div>
                          </div>
                        )}

                        {/* SESSÕES REALIZADAS */}
                        {selectedCard === 'sessions' && (
                          <div className="space-y-2">
                            {[
                              { label: 'Pacote pré-pago', count: summary.sessions.breakdown.packageCount, value: summary.sessions.breakdown.package, color: '#3b82f6' },
                              { label: 'Convênio', count: summary.sessions.breakdown.insuranceCount, value: summary.sessions.breakdown.insurance, color: '#6366f1' },
                              { label: 'Liminar', count: summary.sessions.breakdown.liminarCount, value: summary.sessions.breakdown.liminar, color: '#f59e0b' },
                              { label: 'Particular pendente', count: summary.sessions.breakdown.privatePendingCount, value: summary.sessions.breakdown.privatePending, color: '#ef4444' },
                            ].map(row => (
                              <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                                  <span className="text-sm text-gray-700">{row.label}</span>
                                  <span className="text-xs text-gray-400">({row.count} sessão{row.count !== 1 ? 'ões' : ''})</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-800">{formatCurrency(row.value)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between pt-2">
                              <span className="text-sm font-bold text-gray-800">Total — {summary.sessions.completed} sessões</span>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <ReceivablesCard receivables={summary.receivables} />
                    <AlertsPanel
                      alerts={[
                        // Problemas reais: particular pendente, convênio aguardando, sessões sem modelo
                        ...(summary.sessions.breakdown.realIssues > 0 || summary.sessions.breakdown.privatePendingCount > 0 || summary.sessions.breakdown.insuranceCount > 0
                          ? [{
                              id: 'receivables',
                              type: (summary.sessions.breakdown.realIssues > 0 ? 'warning' : 'info') as const,
                              title: 'Sessões pendentes de recebimento',
                              description: [
                                summary.sessions.breakdown.privatePendingCount > 0 && `${summary.sessions.breakdown.privatePendingCount} particular (${formatCurrency(summary.sessions.breakdown.privatePending)})`,
                                summary.sessions.breakdown.insuranceCount > 0 && `${summary.sessions.breakdown.insuranceCount} convênio (${formatCurrency(summary.sessions.breakdown.insurance)})`,
                                summary.sessions.breakdown.liminarCount > 0 && `${summary.sessions.breakdown.liminarCount} liminar (${formatCurrency(summary.sessions.breakdown.liminar)})`,
                                summary.sessions.breakdown.realIssues > 0 && `${summary.sessions.breakdown.realIssues} sem modelo financeiro identificado`,
                              ].filter(Boolean).join(' · '),
                            }]
                          : []),
                        // Pacotes pré-pagos: informativo, não é problema
                        ...(summary.sessions.breakdown.packageCount > 0
                          ? [{
                              id: 'packages',
                              type: 'info' as const,
                              title: 'Sessões de pacote pré-pago realizadas',
                              description: `${summary.sessions.breakdown.packageCount} sessão(ões) (${formatCurrency(summary.sessions.breakdown.package)}). Valor já recebido na venda do pacote — não é pendência.`,
                            }]
                          : []),
                        ...(summary.health.orphanSessions > 0
                          ? [
                              {
                                id: 'orphan-sessions',
                                type: 'warning' as const,
                                title: 'Sessões sem explicação',
                                description: `${summary.health.orphanSessions} sessão(ões) realizada(s) sem pagamento vinculado e sem modelo financeiro identificado.`,
                              },
                            ]
                          : []),
                        ...(summary.health.orphanPayments > 0
                          ? [
                              {
                                id: 'orphan-payments',
                                type: 'warning' as const,
                                title: 'Pagamentos órfãos',
                                description: `${summary.health.orphanPayments} pagamento(s) sem sessão vinculada.`,
                              },
                            ]
                          : []),
                        ...(!summary.health.hasCommissionData
                          ? [
                              {
                                id: 'commission',
                                type: 'info' as const,
                                title: 'Comissão',
                                description: 'Nenhum registro de comissão encontrado para o período.',
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </Box>
              ) : null}
            </TabsContent>

            <TabsContent value="patients">
              {!selectedDoctorId ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'grey.500' }}>
                  <Users size={48} color="#9ca3af" />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Selecione um profissional no Ranking
                  </Typography>
                </Box>
              ) : (
                <ListaPacientesVIP
                  data={patients}
                  loading={loadingPatients}
                  title="Pacientes por Profissional"
                />
              )}
            </TabsContent>

            <TabsContent value="settlements">
              {!selectedDoctorId ? (
                <Box sx={{ textAlign: 'center', py: 8, color: 'grey.500' }}>
                  <FileText size={48} color="#9ca3af" />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Selecione um profissional no Ranking
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <Typography variant="h5" fontWeight="bold" color="grey.800">
                      Fechamentos — {selectedDoctor?.doctorName}
                    </Typography>
                    <button
                      onClick={handleOpenCloseModal}
                      className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                    >
                      <Lock className="w-4 h-4" />
                      Fechar {new Date(2000, currentMonth.month - 1).toLocaleString('pt-BR', { month: 'long' })}/{currentMonth.year}
                    </button>
                  </div>
                  <ProfessionalResultsTable
                    columns={settlementColumns}
                    data={settlements}
                    loading={loadingSettlements}
                    emptyMessage="Nenhum fechamento encontrado."
                    getRowKey={(row) => row._id}
                  />
                </Box>
              )}
            </TabsContent>

            <TabsContent value="health">
              <Box>
                <Typography variant="h5" fontWeight="bold" color="grey.800" sx={{ mb: 3 }}>
                  Saúde Financeira
                </Typography>
                {issueAlerts.length === 0 && !loadingIssues ? (
                  <AlertsPanel alerts={[]} />
                ) : (
                  <AlertsPanel alerts={issueAlerts} />
                )}
              </Box>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Fechamento mensal — sempre passa por prévia antes de confirmar */}
      {closeModal.open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => !closeModal.confirming && setCloseModal({ open: false, loading: false, confirming: false, preview: null })}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#059669' }}>
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Fechar {closeModal.preview ? `${new Date(2000, closeModal.preview.periodMonth - 1).toLocaleString('pt-BR', { month: 'long' })}/${closeModal.preview.periodYear}` : '...'}
                </h3>
              </div>
              <button
                onClick={() => !closeModal.confirming && setCloseModal({ open: false, loading: false, confirming: false, preview: null })}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {closeModal.loading || !closeModal.preview ? (
              <div className="flex items-center justify-center py-10 text-gray-400">Carregando prévia...</div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">{closeModal.preview.preview.doctorName}</p>

                {closeModal.preview.alreadyClosed && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm text-red-700">
                    Este período já foi fechado. Cancele o fechamento existente na aba Fechamentos antes de fechar de novo.
                  </div>
                )}

                {closeModal.preview.hasFinancialIssues && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                    <p className="text-sm text-amber-800 font-semibold mb-1">
                      {closeModal.preview.financialIssues?.orphanSessions ?? 0} atendimento(s) sem pagamento registrado
                    </p>
                    <p className="text-xs text-amber-700 mb-2">
                      Não é erro do sistema: estes atendimentos foram concluídos e <strong>entram normalmente na comissão</strong>,
                      mas não têm pagamento vinculado — ou seja, a clínica pode não ter recebido por eles.
                      Confira se o recebimento ficou pendente de lançamento.
                    </p>
                    {(closeModal.preview.financialIssues?.orphanSessionsList || []).length > 0 && (
                      <ul className="space-y-1 border-l-2 border-amber-300 pl-3">
                        {closeModal.preview.financialIssues!.orphanSessionsList!.slice(0, 5).map((s) => (
                          <li key={s.sessionId} className="text-xs text-amber-800 flex justify-between gap-2">
                            <span>
                              {new Date(s.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                              {s.time ? ` ${s.time}` : ''} · {s.patientName}
                            </span>
                            <span className="font-medium whitespace-nowrap">{formatCurrency(s.value)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-amber-600 mt-2">
                      Feche esses atendimentos na agenda, ou confirme assim mesmo — nesse caso o valor não entra depois.
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 mb-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Comissão bruta</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(closeModal.preview.preview.commission)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Adiantamentos vinculados</span>
                    <span className="font-semibold text-red-600">− {formatCurrency(closeModal.preview.preview.advances)}</span>
                  </div>
                  {closeModal.preview.preview.linkedAdvances.length > 0 && (
                    <div className="pl-3 space-y-1 border-l-2 border-red-100">
                      {closeModal.preview.preview.linkedAdvances.map((adv) => (
                        <div key={adv.advanceId} className="flex justify-between text-xs text-gray-500">
                          <span>{adv.type === 'advance' ? 'Adiantamento' : adv.type === 'bonus' ? 'Bonificação' : 'Ajuste'} · {new Date(adv.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                          <span>{formatCurrency(adv.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Saldo a pagar</span>
                    <span className="text-lg font-bold text-emerald-700">{formatCurrency(closeModal.preview.preview.balance)}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-4">
                  Ao fechar, esse valor é congelado como snapshot e os adiantamentos listados ficam vinculados a este fechamento — não entram de novo em outro mês.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCloseModal({ open: false, loading: false, confirming: false, preview: null })}
                    disabled={closeModal.confirming}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmClose}
                    disabled={closeModal.confirming || !closeModal.preview.canClose}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {closeModal.confirming
                      ? 'Fechando...'
                      : closeModal.preview.hasFinancialIssues
                        ? (<><AlertTriangle className="w-4 h-4" /> Fechar mesmo assim</>)
                        : (<><CheckCircle2 className="w-4 h-4" /> Confirmar Fechamento</>)}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Box>
  );
};

export default ProfessionalResultsPage;
