// src/pages/Financial/tabs/GoalsTab.tsx

import { useEffect, useState } from 'react';
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
  Button
} from '@mui/material';
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
  Assessment
} from '@mui/icons-material';
import { usePlanning } from '../../../hooks/usePlanning';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configuração de status
const STATUS_CONFIG = {
  achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
  on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
  at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
  behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: TrendingDown }
};

const GoalsTab = () => {
  const { plannings, fetchPlannings, refreshAllPlannings, loading } = usePlanning();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('fev_2026');

  useEffect(() => {
    // Carrega metas mensais como padrão
    fetchPlannings({ type: 'monthly' });
  }, [fetchPlannings]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.behind;
  };

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

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
              <Assessment className="w-6 h-6 text-white" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Metas Financeiras
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Acompanhamento de metas mensais de receita e sessões
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
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
      <Grid container spacing={2.5}>
        {uniquePlannings.length > 0 ? (
          uniquePlannings.map((plan: any) => {
            const statusConfig = getStatusConfig(plan.progress.overallStatus);
            const StatusIcon = statusConfig.icon;
            
            // Calcular dias restantes no mês
            const today = new Date();
            const endDate = new Date(plan.period.end);
            const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
            
            // Meta de receita por dia para atingir a meta
            const dailyTarget = daysRemaining > 0 
              ? (plan.targets.expectedRevenue - plan.actual.actualRevenue) / daysRemaining 
              : 0;

            return (
              <Grid item xs={12} md={6} key={plan._id}>
                <Card elevation={0} sx={{ 
                  border: '1px solid', 
                  borderColor: 'grey.200', 
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: `0 4px 12px ${statusConfig.color}20`,
                    borderColor: statusConfig.color
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    {/* Header do Card */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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
                      // Usar gapRevenue do backend ou calcular
                      const gapRevenue = plan.progress?.gapRevenue ?? Math.max(0, plan.targets.expectedRevenue - plan.actual.actualRevenue);
                      const gapSessions = Math.max(0, plan.targets.totalSessions - plan.actual.completedSessions);
                      const gapHours = Math.max(0, (plan.targets.workHours || 0) - (plan.actual.workedHours || 0));
                      const gapSlots = Math.max(0, (plan.targets.availableSlots || 0) - (plan.actual.usedSlots || 0));
                      const dailyRevenueNeeded = daysRemaining > 0 ? gapRevenue / daysRemaining : 0;
                      const dailySessionsNeeded = daysRemaining > 0 ? gapSessions / daysRemaining : 0;
                      
                      return (
                        <>
                          {/* Métricas Principais */}
                          <Grid container spacing={2} sx={{ mt: 1 }}>
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
                                      Realizado: {formatCurrency(plan.actual.actualRevenue)}
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
                          {(gapRevenue > 0 || gapSessions > 0) && daysRemaining > 0 && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: '#FEF3C7', borderRadius: 2, border: '1px solid #FCD34D' }}>
                              <Typography variant="subtitle2" fontWeight="600" color="#92400E" gutterBottom>
                                📊 Meta Diária Necessária (faltam {daysRemaining} dias)
                              </Typography>
                              <Grid container spacing={2}>
                                {gapRevenue > 0 && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="#92400E">
                                      💰 Receita: <strong>R$ {dailyRevenueNeeded.toFixed(0)}/dia</strong>
                                    </Typography>
                                  </Grid>
                                )}
                                {gapSessions > 0 && (
                                  <Grid item xs={6}>
                                    <Typography variant="body2" color="#92400E">
                                      🎯 Sessões: <strong>{Math.ceil(dailySessionsNeeded)} por dia</strong>
                                    </Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          )}
                        </>
                      );
                    })()}

                    {/* Barras de Progresso */}
                    <Box sx={{ mt: 3 }}>
                      {/* Progresso Receita */}
                      <Box sx={{ mb: 2 }}>
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
                      <Box sx={{ mb: 2 }}>
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
                      {plan.progress.overallStatus === 'behind' && (
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
                            {daysRemaining > 0 
                              ? `Faltam ${daysRemaining} dias. Necessário R$ ${dailyTarget.toFixed(2)}/dia para atingir a meta.`
                              : 'Período encerrado sem atingir a meta.'}
                          </Typography>
                        </Alert>
                      )}

                      {plan.progress.overallStatus === 'at_risk' && (
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
                            Acompanhamento próximo necessário para atingir a meta.
                          </Typography>
                        </Alert>
                      )}

                      {plan.progress.overallStatus === 'on_track' && (
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
                            Mantenha o ritmo para atingir a meta.
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
              <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhuma meta encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crie um planejamento mensal na aba Planejamento para começar a acompanhar metas.
              </Typography>
              <Button
                variant="contained"
                startIcon={<TrendingUp />}
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