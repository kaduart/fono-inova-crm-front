// src/pages/Financial/tabs/GoalsTab.tsx

import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { FinancialLoading } from '../components/FinancialLoading';
import {
  TrendingUp,
  TrendingDown,
  CalendarToday,
  Schedule,
  Timeline,
  AttachMoney,
  EventSeat,
  AccessTime,
  Warning,
  CheckCircle,
  Info,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  Assessment,
  AccountBalance,
  LocalHospital,
  FilterList
} from '@mui/icons-material';
import { usePlanning } from '../../../hooks/usePlanning';
import { format, getMonth, getYear, isWeekend, addDays, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração de status
const STATUS_CONFIG = {
  achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
  on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
  at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
  behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: TrendingDown }
};

const GoalsTab = () => {
  const { plannings, fetchPlannings, refreshAllPlannings, createMonthly, loading } = usePlanning();
  
  // Inicializa com o mês atual (março = 3)
  const currentMonth = getMonth(new Date()) + 1; // getMonth retorna 0-11
  const currentYear = getYear(new Date());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Carrega metas mensais filtradas pelo mês/ano selecionado
    fetchPlannings({ 
      type: 'monthly',
      month: selectedMonth,
      year: selectedYear 
    });
  }, [fetchPlannings, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  // Calcula dias úteis restantes (seg-sex) até o final do mês
  const getWorkingDaysRemaining = (endDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    let workingDays = 0;
    let current = new Date(today);
    
    // Se hoje for dia útil, conta hoje também
    while (current <= endDate) {
      if (!isWeekend(current)) {
        workingDays++;
      }
      current = addDays(current, 1);
    }
    
    return workingDays;
  };

  // Calcula dias úteis já trabalhados no mês (desde o início até hoje)
  const getWorkingDaysElapsed = (startDate: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    let workingDays = 0;
    let current = new Date(startDate);
    
    while (current < today) {
      if (!isWeekend(current)) {
        workingDays++;
      }
      current = addDays(current, 1);
    }
    
    return workingDays;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.behind;
  };

  // Calcula o status real considerando dias úteis decorridos vs meta
  const calculateRealStatus = (
    revenuePct: number,
    sessionsPct: number,
    hoursPct: number,
    workingDaysElapsed: number,
    totalWorkingDays: number
  ): string => {
    if (totalWorkingDays === 0) return 'on_track';
    
    // Porcentagem esperada baseada no tempo decorrido (dias úteis)
    const expectedProgress = (workingDaysElapsed / totalWorkingDays) * 100;
    
    // Média dos progressos reais
    const avgProgress = (revenuePct + sessionsPct + hoursPct) / 3;
    
    // Comparação: se estamos acima do esperado = on_track, abaixo = at_risk/behind
    const diff = avgProgress - expectedProgress;
    
    if (avgProgress >= 100) return 'achieved';
    if (diff >= -5) return 'on_track';      // Até 5% abaixo do esperado = ok
    if (diff >= -15) return 'at_risk';      // 5-15% abaixo = em risco
    return 'behind';                         // >15% abaixo = atrasado
  };

  // Meses disponíveis para o select
  const months = useMemo(() => [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ], []);

  // Anos disponíveis (ano atual +/- 2)
  const years = useMemo(() => {
    const currentY = getYear(new Date());
    return [currentY - 2, currentY - 1, currentY, currentY + 1, currentY + 2];
  }, []);

  // Agrupar metas por mês/ano para evitar duplicatas
  const groupedPlannings = plannings.reduce((acc: any, p: any) => {
    const key = `${p.period.start.substring(0, 7)}`; // YYYY-MM
    if (!acc[key]) {
      acc[key] = {
        ...p,
        targets: { ...p.targets },
        actual: { ...p.actual },
        progress: { ...p.progress }
      };
    }
    return acc;
  }, {});

  const uniquePlannings = Object.values(groupedPlannings);

  const handleMonthChange = (event: SelectChangeEvent<number>) => {
    setSelectedMonth(Number(event.target.value));
  };

  const handleYearChange = (event: SelectChangeEvent<number>) => {
    setSelectedYear(Number(event.target.value));
  };

  if (loading) {
    return <FinancialLoading cardCount={2} gridSize={{ xs: 12, md: 6 }} />;
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
              <Assessment className="w-6 h-6 text-white" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                🎯 Metas & Provisão
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Acompanhamento de metas mensais de receita e sessões
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* Filtro de Mês */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="month-select-label">Mês</InputLabel>
              <Select
                labelId="month-select-label"
                value={selectedMonth}
                label="Mês"
                onChange={handleMonthChange}
                startAdornment={<CalendarToday sx={{ fontSize: 16, mr: 0.5, color: '#8B5CF6' }} />}
              >
                {months.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Filtro de Ano */}
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel id="year-select-label">Ano</InputLabel>
              <Select
                labelId="year-select-label"
                value={selectedYear}
                label="Ano"
                onChange={handleYearChange}
              >
                {years.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Atualizar dados reais (sessões e pagamentos)">
              <IconButton 
                onClick={async () => {
                  await refreshAllPlannings();
                }}
                sx={{ 
                  bgcolor: '#8B5CF620', 
                  color: '#8B5CF6',
                  '&:hover': { bgcolor: '#8B5CF630' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Cards de Metas */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
        {uniquePlannings.length > 0 ? (
          uniquePlannings.map((plan: any) => {
            // Calcular dias úteis
            const today = new Date();
            const startDate = new Date(plan.period.start);
            const endDate = new Date(plan.period.end);
            const workingDaysRemaining = getWorkingDaysRemaining(endDate);
            const workingDaysElapsed = getWorkingDaysElapsed(startDate);
            const totalWorkingDays = workingDaysElapsed + workingDaysRemaining;
            
            // Calcular status real considerando tempo decorrido
            const realStatus = calculateRealStatus(
              plan.progress.revenuePercentage,
              plan.progress.sessionsPercentage,
              plan.progress.hoursPercentage,
              workingDaysElapsed,
              totalWorkingDays
            );
            
            const statusConfig = getStatusConfig(realStatus);
            const StatusIcon = statusConfig.icon;
            
            // Meta de receita por dia ÚTIL para atingir a meta
            const dailyTarget = workingDaysRemaining > 0 
              ? (plan.targets.expectedRevenue - plan.actual.actualRevenue) / workingDaysRemaining 
              : 0;
            
            // Ritmo atual (média por dia útil já trabalhado)
            const currentDailyRevenue = workingDaysElapsed > 0 
              ? plan.actual.actualRevenue / workingDaysElapsed 
              : 0;
            const currentDailySessions = workingDaysElapsed > 0
              ? plan.actual.completedSessions / workingDaysElapsed
              : 0;

            return (
              <Grid item xs={12} sm={6} md={6} key={plan._id}>
                <Card elevation={0} sx={{ width: "100%", 
                  border: '1px solid', 
                  borderColor: 'grey.200', 
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: `0 4px 12px ${statusConfig.color}20`,
                    borderColor: statusConfig.color
                  }
                }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                    {/* Header do Card */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, width: 40, height: 40 }}>
                          <StatusIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="600">
                            Meta Mensal
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(plan.period.start)} - {formatDate(plan.period.end)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        icon={<StatusIcon sx={{ fontSize: 14 }} />}
                        label={statusConfig.label}
                        sx={{ 
                          bgcolor: statusConfig.bgColor,
                          color: statusConfig.color,
                          borderColor: statusConfig.color,
                          fontWeight: 500
                        }}
                        variant="outlined"
                      />
                    </Box>

                    {/* Cálculos de Gap */}
                    {(() => {
                      // Calcular receita total realizada (Particular + Convênio Recebido + Convênio a Receber)
                      const particular = plan.actual.actualRevenueParticular || 0;
                      const convenioRecebido = plan.actual.actualRevenueConvenio || 0;
                      const convenioAReceber = plan.actual.actualRevenueConvenioAReceber || 0;
                      const receitaTotalRealizada = particular + convenioRecebido + convenioAReceber;
                      
                      // Usar gapRevenue do backend ou calcular baseado na receita total
                      const gapRevenue = Math.max(0, plan.targets.expectedRevenue - receitaTotalRealizada);
                      const gapSessions = Math.max(0, plan.targets.totalSessions - plan.actual.completedSessions);
                      const gapHours = Math.max(0, (plan.targets.workHours || 0) - (plan.actual.workedHours || 0));
                      const gapSlots = Math.max(0, (plan.targets.availableSlots || 0) - (plan.actual.usedSlots || 0));
                      // Calcular metas diárias baseadas em DIAS ÚTEIS (seg-sex)
                      const dailyRevenueNeeded = workingDaysRemaining > 0 ? gapRevenue / workingDaysRemaining : 0;
                      const dailySessionsNeeded = workingDaysRemaining > 0 ? gapSessions / workingDaysRemaining : 0;
                      
                      return (
                        <>
                          {/* Métricas Principais */}
                          <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }} sx={{ mt: 1 }}>
                            {/* Meta de Receita */}
                            <Grid item xs={6}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Meta de Receita
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="#059669">
                                  {formatCurrency(plan.targets.expectedRevenue)}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AttachMoney sx={{ fontSize: 14, color: '#10B981' }} />
                                    <Typography variant="caption" color="#10B981" fontWeight={500}>
                                      Realizado: {formatCurrency(receitaTotalRealizada)}
                                    </Typography>
                                  </Box>
                                  {gapRevenue > 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Warning sx={{ fontSize: 14, color: '#EF4444' }} />
                                      <Typography variant="caption" color="#EF4444" fontWeight={600}>
                                        Falta: {formatCurrency(gapRevenue)}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <CheckCircle sx={{ fontSize: 14, color: '#10B981' }} />
                                      <Typography variant="caption" color="#10B981" fontWeight={600}>
                                        Meta Atingida! 🎉
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </Paper>
                            </Grid>

                            {/* Detalhamento por Tipo de Receita */}
                            <Grid item xs={12}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#FFFFFF', borderColor: '#E0E7FF' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight={600}>
                                  💰 Detalhamento da Receita
                                </Typography>
                                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                  {/* Particular */}
                                  <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#ECFDF5', borderRadius: 1 }}>
                                      <AttachMoney sx={{ fontSize: 16, color: '#059669' }} />
                                      <Typography variant="caption" display="block" color="text.secondary">
                                        Particular
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color="#059669">
                                        {formatCurrency(plan.actual.actualRevenueParticular || 0)}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  {/* Convênio Recebido */}
                                  <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#DBEAFE', borderRadius: 1 }}>
                                      <LocalHospital sx={{ fontSize: 16, color: '#2563EB' }} />
                                      <Typography variant="caption" display="block" color="text.secondary">
                                        Convênio (Rec.)
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color="#2563EB">
                                        {formatCurrency(plan.actual.actualRevenueConvenio || 0)}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                  {/* Convênio a Receber */}
                                  <Grid item xs={4}>
                                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: '#FEF3C7', borderRadius: 1 }}>
                                      <AccountBalance sx={{ fontSize: 16, color: '#D97706' }} />
                                      <Typography variant="caption" display="block" color="text.secondary">
                                        Convênio (A Rec.)
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold" color="#D97706">
                                        {formatCurrency(plan.actual.actualRevenueConvenioAReceber || 0)}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>

                            {/* Meta de Sessões */}
                            <Grid item xs={6}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Meta de Sessões
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="#0284C7">
                                  {plan.targets.totalSessions}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <EventSeat sx={{ fontSize: 14, color: '#3B82F6' }} />
                                    <Typography variant="caption" color="#3B82F6" fontWeight={500}>
                                      Realizadas: {plan.actual.completedSessions}
                                    </Typography>
                                  </Box>
                                  {gapSessions > 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Warning sx={{ fontSize: 14, color: '#F59E0B' }} />
                                      <Typography variant="caption" color="#F59E0B" fontWeight={600}>
                                        Falta: {gapSessions} sessões
                                      </Typography>
                                    </Box>
                                  ) : plan.actual.completedSessions > 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <CheckCircle sx={{ fontSize: 14, color: '#10B981' }} />
                                      <Typography variant="caption" color="#10B981" fontWeight={600}>
                                        Meta Atingida! 🎉
                                      </Typography>
                                    </Box>
                                  ) : null}
                                </Box>
                              </Paper>
                            </Grid>

                            {/* Horas de Trabalho */}
                            <Grid item xs={6}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Horas Previstas
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="#8B5CF6">
                                  {plan.targets.workHours}h
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <AccessTime sx={{ fontSize: 14, color: '#8B5CF6' }} />
                                    <Typography variant="caption" color="#8B5CF6" fontWeight={500}>
                                      Trabalhadas: {plan.actual.workedHours}h
                                    </Typography>
                                  </Box>
                                  {gapHours > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      Falta: {gapHours.toFixed(1)}h
                                    </Typography>
                                  )}
                                </Box>
                              </Paper>
                            </Grid>

                            {/* Slots Disponíveis */}
                            <Grid item xs={6}>
                              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                  Slots Disponíveis
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="#F59E0B">
                                  {plan.targets.availableSlots || 0}
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <EventSeat sx={{ fontSize: 14, color: '#F59E0B' }} />
                                    <Typography variant="caption" color="#F59E0B" fontWeight={500}>
                                      Utilizados: {plan.actual.usedSlots || 0}
                                    </Typography>
                                  </Box>
                                  {gapSlots > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      Falta: {gapSlots} slots
                                    </Typography>
                                  )}
                                </Box>
                              </Paper>
                            </Grid>
                          </Grid>

                          {/* Meta Diária Necessária */}
                          {(gapRevenue > 0 || gapSessions > 0) && workingDaysRemaining > 0 && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#FEF3C7', borderRadius: 2, border: '1px solid #FCD34D' }}>
                              <Typography variant="subtitle2" fontWeight="600" color="#92400E" gutterBottom>
                                📊 Meta Diária Necessária (faltam {workingDaysRemaining} dias úteis)
                              </Typography>
                              <Grid container spacing={2}>
                                {gapRevenue > 0 && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="#92400E">
                                      💰 Precisa: <strong>R$ {dailyRevenueNeeded.toFixed(0)}/dia</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Ritmo atual: R$ {currentDailyRevenue.toFixed(0)}/dia
                                      {currentDailyRevenue >= dailyRevenueNeeded ? ' ✅' : ' ⚠️'}
                                    </Typography>
                                  </Grid>
                                )}
                                {gapSessions > 0 && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="#92400E">
                                      🎯 Precisa: <strong>{Math.ceil(dailySessionsNeeded)} sessões/dia</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Ritmo atual: {currentDailySessions.toFixed(1)} sessões/dia
                                      {currentDailySessions >= dailySessionsNeeded ? ' ✅' : ' ⚠️'}
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          )}

                          {/* Análise de Projeção */}
                          <Box sx={{ mt: 2, p: 2, bgcolor: '#ECFDF5', borderRadius: 2, border: '1px solid #10B981' }}>
                            <Typography variant="subtitle2" fontWeight="600" color="#065F46" gutterBottom>
                              📈 Análise de Projeção (baseada em {totalWorkingDays} dias úteis no mês)
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="#065F46">
                                  💵 Projeção Final: <strong>{formatCurrency(currentDailyRevenue * totalWorkingDays)}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Meta: {formatCurrency(plan.targets.expectedRevenue)}
                                  {currentDailyRevenue * totalWorkingDays >= plan.targets.expectedRevenue 
                                    ? ' 🎯 Superará!' 
                                    : ' ⚠️ Abaixo'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="body2" color="#065F46">
                                  📊 Ritmo vs Meta: <strong>
                                    {((currentDailyRevenue / (plan.targets.expectedRevenue / totalWorkingDays)) * 100).toFixed(0)}%
                                  </strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Você está {currentDailyRevenue >= (plan.targets.expectedRevenue / totalWorkingDays) ? 'acima' : 'abaixo'} do ritmo ideal
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Análise:</strong> Com ritmo de R$ {currentDailyRevenue.toFixed(0)}/dia em {workingDaysElapsed} dias úteis, 
                                  você precisa manter R$ {dailyRevenueNeeded.toFixed(0)}/dia nos {workingDaysRemaining} dias restantes.
                                  {currentDailyRevenue >= dailyRevenueNeeded 
                                    ? ' Seu ritmo atual é suficiente! ✅' 
                                    : ' Precisa acelerar o ritmo! ⚠️'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </>
                      );
                    })()}

                    {/* Barras de Progresso */}
                    <Box sx={{ mt: 3 }}>
                      {/* Progresso Receita */}
                      <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Progresso Receita
                          </Typography>
                          <Typography variant="body2" fontWeight="600" color={plan.progress.revenuePercentage > 0 ? '#059669' : '#EF4444'}>
                            {plan.progress.revenuePercentage}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={plan.progress.revenuePercentage}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#E5E7EB',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: plan.progress.revenuePercentage >= 100 ? '#10B981' : 
                                     plan.progress.revenuePercentage >= 70 ? '#3B82F6' : 
                                     plan.progress.revenuePercentage >= 40 ? '#F59E0B' : '#EF4444'
                            }
                          }}
                        />
                      </Box>

                      {/* Progresso Sessões */}
                      <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            Progresso Sessões
                          </Typography>
                          <Typography variant="body2" fontWeight="600" color={plan.progress.sessionsPercentage > 0 ? '#0284C7' : '#EF4444'}>
                            {plan.progress.sessionsPercentage}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={plan.progress.sessionsPercentage}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: '#E5E7EB',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: plan.progress.sessionsPercentage >= 100 ? '#10B981' : 
                                     plan.progress.sessionsPercentage >= 70 ? '#3B82F6' : 
                                     plan.progress.sessionsPercentage >= 40 ? '#F59E0B' : '#EF4444'
                            }
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Insights e Projeções */}
                    <Box sx={{ mt: 3 }}>
                      {realStatus === 'behind' && (
                        <Alert 
                          severity="error" 
                          icon={<Warning />}
                          sx={{ 
                            borderRadius: 2,
                            bgcolor: '#EF444410',
                            '& .MuiAlert-icon': { color: '#EF4444' }
                          }}
                        >
                          <Typography variant="body2" fontWeight="500">
                            Meta atrasada
                          </Typography>
                          <Typography variant="caption">
                            {workingDaysRemaining > 0 
                              ? `Faltam ${workingDaysRemaining} dias úteis. Necessário R$ ${dailyTarget.toFixed(0)}/dia útil para atingir a meta.`
                              : 'Período encerrado sem atingir a meta.'}
                          </Typography>
                        </Alert>
                      )}

                      {realStatus === 'at_risk' && (
                        <Alert 
                          severity="warning"
                          icon={<Warning />}
                          sx={{ 
                            borderRadius: 2,
                            bgcolor: '#F59E0B10',
                            '& .MuiAlert-icon': { color: '#F59E0B' }
                          }}
                        >
                          <Typography variant="body2" fontWeight="500">
                            Meta em risco
                          </Typography>
                          <Typography variant="caption">
                            Precisa de R$ {dailyTarget.toFixed(0)}/dia útil. Acompanhamento próximo necessário.
                          </Typography>
                        </Alert>
                      )}

                      {realStatus === 'on_track' && (
                        <Alert 
                          severity="info"
                          icon={<Info />}
                          sx={{ 
                            borderRadius: 2,
                            bgcolor: '#3B82F610',
                            '& .MuiAlert-icon': { color: '#3B82F6' }
                          }}
                        >
                          <Typography variant="body2" fontWeight="500">
                            No caminho certo
                          </Typography>
                          <Typography variant="caption">
                            Meta diária: R$ {dailyTarget.toFixed(0)}/dia útil. Mantenha o ritmo!
                          </Typography>
                        </Alert>
                      )}
                    </Box>

                    {/* Detalhes Adicionais */}
                    {plan.notes && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          <strong>Observações:</strong> {plan.notes}
                        </Typography>
                      </Box>
                    )}

                    {/* Footer com datas */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        Criado em: {format(new Date(plan.createdAt), 'dd/MM/yyyy')}
                      </Typography>
                      {plan.targets.expectedRevenue > 0 && (
                        <Chip
                          size="small"
                          label={`Meta R$ ${(plan.targets.expectedRevenue / 1000).toFixed(0)}k`}
                          sx={{ bgcolor: '#F3F4F6' }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: { xs: 1.5, sm: 2 } }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma meta encontrada para {months.find(m => m.value === selectedMonth)?.label}/{selectedYear}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 2, sm: 3 } }}>
                Não existe um planejamento mensal criado para este período. Crie um agora para começar a acompanhar suas metas.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={creating ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full" /> : <TrendingUp />}
                  disabled={creating}
                  onClick={async () => {
                    setCreating(true);
                    try {
                      await createMonthly(selectedMonth, selectedYear);
                      await fetchPlannings({ 
                        type: 'monthly',
                        month: selectedMonth,
                        year: selectedYear 
                      });
                    } catch (err) {
                      console.error('Erro ao criar planejamento:', err);
                    } finally {
                      setCreating(false);
                    }
                  }}
                >
                  {creating ? 'Criando...' : 'Criar Meta Mensal'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CalendarToday />}
                  onClick={() => {
                    // Navegar para a aba de Planejamento
                    const planningTab = document.querySelector('[role="tablist"] button:last-child');
                    if (planningTab) {
                      (planningTab as HTMLElement).click();
                    }
                  }}
                >
                  Ir para Planejamento
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Resumo de Metas */}
      {uniquePlannings.length > 0 && (
        <Paper elevation={0} sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total de metas: {uniquePlannings.length}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                size="small"
                label={`Meta total: ${formatCurrency(uniquePlannings.reduce((acc: number, p: any) => acc + p.targets.expectedRevenue, 0))}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`Sessões totais: ${uniquePlannings.reduce((acc: number, p: any) => acc + p.targets.totalSessions, 0)}`}
                variant="outlined"
              />
            </Box>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default GoalsTab;