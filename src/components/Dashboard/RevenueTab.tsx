/**
 * 💰 RevenueTab - Dashboard de Atribuição de Receita
 * 
 * Mostra revenue por origem, campanha, e analytics do GMB
 */

import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useTheme } from '@mui/material/styles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import revenueAnalyticsService, {
  RevenueDashboard,
  RevenueBySource,
  RevenueByCampaign,
  ConversionFunnel
} from '../../services/revenueAnalyticsService';

const COLORS = ['#00B57A', '#8B5CF6', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

interface RevenueTabProps {
  startDate?: string;
  endDate?: string;
}

const RevenueTab: React.FC<RevenueTabProps> = ({ startDate, endDate }) => {
  const theme = useTheme();
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null);
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');

  useEffect(() => {
    loadData();
  }, [period, startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calcular datas baseado no período
      const end = endDate || new Date().toISOString().split('T')[0];
      let start = startDate;
      
      if (!start) {
        const d = new Date();
        switch (period) {
          case '7d': d.setDate(d.getDate() - 7); break;
          case '30d': d.setDate(d.getDate() - 30); break;
          case '90d': d.setDate(d.getDate() - 90); break;
        }
        start = d.toISOString().split('T')[0];
      }

      const [dashboardData, funnelData] = await Promise.all([
        revenueAnalyticsService.getRevenueDashboard(start, end),
        revenueAnalyticsService.getConversionFunnel(start, end)
      ]);

      setDashboard(dashboardData);
      setFunnel(funnelData);
    } catch (err) {
      console.error('Error loading revenue data:', err);
      setError('Erro ao carregar dados de receita. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Carregando analytics de receita...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Nenhum dado disponível para o período selecionado.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header com Filtros */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold">
          💰 Atribuição de Receita
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={period}
            label="Período"
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <MenuItem value="7d">Últimos 7 dias</MenuItem>
            <MenuItem value="30d">Últimos 30 dias</MenuItem>
            <MenuItem value="90d">Últimos 90 dias</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* KPIs Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <DollarSign size={20} color="#00B57A" />
                <Typography variant="body2" color="text.secondary">
                  Receita Total
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(dashboard.summary.totalRevenue)}
              </Typography>
              <Chip
                size="small"
                label={`${dashboard.summary.totalAppointments} atendimentos`}
                sx={{ mt: 1, bgcolor: 'success.light', color: 'success.dark' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <BarChart3 size={20} color="#8B5CF6" />
                <Typography variant="body2" color="text.secondary">
                  Ticket Médio
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(dashboard.summary.avgTicket)}
              </Typography>
              <Chip
                size="small"
                label={`${dashboard.summary.sourcesCount} origens`}
                sx={{ mt: 1, bgcolor: 'primary.light', color: 'primary.dark' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Target size={20} color="#F59E0B" />
                <Typography variant="body2" color="text.secondary">
                  Melhor Origem
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" textTransform="capitalize">
                {dashboard.bestSource?.source || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dashboard.bestSource 
                  ? formatCurrency(dashboard.bestSource.totalRevenue)
                  : 'Nenhum dado'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUp size={20} color="#3B82F6" />
                <Typography variant="body2" color="text.secondary">
                  Melhor Campanha
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold" noWrap>
                {dashboard.topCampaign?.campaign || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {dashboard.topCampaign
                  ? formatCurrency(dashboard.topCampaign.totalRevenue)
                  : 'Nenhum dado'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Revenue por Origem */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              📊 Receita por Origem
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={dashboard.bySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="source" 
                  tickFormatter={(value) => value?.toUpperCase() || '-'} 
                />
                <YAxis 
                  tickFormatter={(value) => `R$${value/1000}k`}
                />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="totalRevenue" fill="#00B57A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Revenue por Campanha (Top 5) */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              🎯 Top 5 Campanhas
            </Typography>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart 
                data={dashboard.byCampaign.slice(0, 5)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `R$${v/1000}k`} />
                <YAxis 
                  type="category" 
                  dataKey="campaign" 
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="totalRevenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* GMB Específico */}
        {dashboard.gmb.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🔍 Desempenho do GMB (Google Meu Negócio)
              </Typography>
              <Grid container spacing={2}>
                {dashboard.gmb.map((campaign, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          {campaign.campaign}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          {formatCurrency(campaign.totalRevenue)}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          <Chip 
                            size="small" 
                            label={`${campaign.appointments} atend.`}
                            variant="outlined"
                          />
                          <Chip 
                            size="small" 
                            label={`Ticket: ${formatCurrency(campaign.avgTicket)}`}
                            variant="outlined"
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Funnel de Conversão */}
        {funnel && (
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🔄 Funnel de Conversão
              </Typography>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Leads */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                        <Users size={24} />
                        <Typography variant="h4" fontWeight="bold">
                          {funnel.leads}
                        </Typography>
                        <Typography variant="caption">Leads</Typography>
                      </Paper>
                    </Box>
                    
                    <ArrowRight />
                    
                    {/* Appointments */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                        <Calendar size={24} />
                        <Typography variant="h4" fontWeight="bold">
                          {funnel.appointments}
                        </Typography>
                        <Typography variant="caption">
                          Agend. ({funnel.conversionRates.leadToAppointment}%)
                        </Typography>
                      </Paper>
                    </Box>
                    
                    <ArrowRight />
                    
                    {/* Paid */}
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                        <DollarSign size={24} />
                        <Typography variant="h4" fontWeight="bold">
                          {funnel.paid}
                        </Typography>
                        <Typography variant="caption">
                          Pagos ({funnel.conversionRates.appointmentToPaid}%)
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary">
                        Taxa Lead → Cliente
                      </Typography>
                      <Typography variant="h3" fontWeight="bold" color="success.main">
                        {funnel.conversionRates.leadToPaid}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(funnel.revenue)} em receita
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

// Helper component
const ArrowRight = () => (
  <Box sx={{ color: 'text.secondary' }}>
    <TrendingUp size={20} />
  </Box>
);

export default RevenueTab;
