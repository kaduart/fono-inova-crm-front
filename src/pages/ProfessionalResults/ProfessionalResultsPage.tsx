// src/pages/ProfessionalResults/ProfessionalResultsPage.tsx
import React, { useMemo } from 'react';
import { Box, Paper, Typography, FormControl, Select, MenuItem, Button } from '@mui/material';
import {
  Trophy,
  UserCircle,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useProfessionalResults, TabValue } from '../../hooks/useProfessionalResults';
import { RankingProfissionais } from '../Financial/components/RankingProfissionais';
import { ListaPacientesVIP } from '../Financial/components/ListaPacientesVIP';
import AlertsPanel from '../../components/doctor/AlertsPanel';
import { ReceivablesCard } from './components/ReceivablesCard';
import { ProfessionalResultsTable, Column } from './components/ProfessionalResultsTable';
import { SettlementItem } from '../../services/professionalResultsService';

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
}> = ({ title, value, icon, color, subtitle, trend }) => {
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
      className="rounded-2xl border p-5 shadow-sm"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
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

export const ProfessionalResultsPage: React.FC = () => {
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

  const handleMonthChange = (month: number) => {
    const year = currentMonth.year;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    setPeriod({ startDate: start, endDate: end });
  };

  const handleYearChange = (year: number) => {
    const month = currentMonth.month;
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().split('T')[0];
    setPeriod({ startDate: start, endDate: end });
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
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, md: 4 },
          borderRadius: 3,
          background: 'linear-gradient(135deg, #37ab8720, #6366f110)',
          border: '1px solid',
          borderColor: 'divider',
          mb: 2,
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'rgba(55, 171, 135, 0.15)' }}>
              <DollarSign size={28} style={{ color: '#00B57A' }} />
            </div>
            <div>
              <Typography variant="h4" fontWeight="bold" color="grey.800" gutterBottom>
                Centro de Resultado dos Profissionais
              </Typography>
              <Typography variant="body1" color="grey.600" sx={{ opacity: 0.8 }}>
                Produção, recebimento, comissão e saldo por profissional
              </Typography>
            </div>
          </div>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Calendar size={18} color="#666" />
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
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={16} />}
              onClick={refresh}
              sx={{ borderRadius: 2 }}
            >
              Atualizar
            </Button>
          </Box>
        </div>
      </Paper>

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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <KPICard
                      title="Pacientes Ativos"
                      value={String(summary.patients.active)}
                      icon={<Users size={20} />}
                      color="#3b82f6"
                      trend={previousSummary ? { current: summary.patients.active, previous: previousSummary.patients.active } : undefined}
                    />
                    <KPICard
                      title="Produção"
                      value={formatCurrency(summary.production.total)}
                      icon={<DollarSign size={20} />}
                      color="#10b981"
                      trend={previousSummary ? { current: summary.production.total, previous: previousSummary.production.total } : undefined}
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
                        />
                      );
                    })()}
                    <KPICard
                      title="Comissão"
                      value={formatCurrency(summary.commission)}
                      icon={<DollarSign size={20} />}
                      color="#8b5cf6"
                      trend={previousSummary ? { current: summary.commission, previous: previousSummary.commission } : undefined}
                    />
                    <KPICard
                      title="Adiantamentos"
                      value={formatCurrency(summary.advances)}
                      icon={<DollarSign size={20} />}
                      color="#ef4444"
                      trend={previousSummary ? { current: summary.advances, previous: previousSummary.advances } : undefined}
                    />
                    <KPICard
                      title="Saldo"
                      value={formatCurrency(summary.balance)}
                      icon={<DollarSign size={20} />}
                      color={summary.balance >= 0 ? '#10b981' : '#ef4444'}
                      trend={previousSummary ? { current: summary.balance, previous: previousSummary.balance } : undefined}
                    />
                    <KPICard
                      title="Sessões Realizadas"
                      value={String(summary.sessions.completed)}
                      icon={<Calendar size={20} />}
                      color="#06b6d4"
                      trend={previousSummary ? { current: summary.sessions.completed, previous: previousSummary.sessions.completed } : undefined}
                    />
                  </div>

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
                  <Typography variant="h5" fontWeight="bold" color="grey.800" sx={{ mb: 3 }}>
                    Fechamentos — {selectedDoctor?.doctorName}
                  </Typography>
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
    </Box>
  );
};

export default ProfessionalResultsPage;
