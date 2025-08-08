import { Box, Grid, Typography } from '@mui/material';
import { AlertCircle, CheckCircle, CircleDollarSign, Clock, CreditCard } from 'lucide-react';
import React from 'react';

interface FinancialSummaryCardProps {
  data: {
    totalReceived: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
  };
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ data }) => {
  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value); // Dividindo por 100 para converter centavos em reais
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        p: 3,
        mb: 3,
        width: '100%'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
          Resumo Financeiro
        </Typography>
        <Box display="flex" alignItems="center">
          <Typography variant="caption" sx={{ color: '#64748B', mr: 1 }}>
            Atualizado em:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {new Date().toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {/* Total Recebido */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: '#F0FDF4',
              borderLeft: '4px solid #16A34A',
              borderRadius: '0 8px 8px 0',
              p: 2,
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={1.5}>
              <Box
                sx={{
                  backgroundColor: '#DCFCE7',
                  p: 1,
                  borderRadius: '50%',
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircleDollarSign size={20} color="#16A34A" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                Total Recebido
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, color: '#16A34A', mb: 1 }}>
              {formatCurrency(data.totalReceived)}
            </Typography>

            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  backgroundColor: '#E2E8F0',
                  p: 0.5,
                  borderRadius: '4px',
                  mr: 1,
                  display: 'flex'
                }}
              >
                <CreditCard size={14} color="#475569" />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                {data.countReceived} {data.countReceived === 1 ? 'pagamento' : 'pagamentos'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Total Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: '#FFFBEB',
              borderLeft: '4px solid #F59E0B',
              borderRadius: '0 8px 8px 0',
              p: 2,
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={1.5}>
              <Box
                sx={{
                  backgroundColor: '#FEF3C7',
                  p: 1,
                  borderRadius: '50%',
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Clock size={20} color="#D97706" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                Total Pendente
              </Typography>
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, color: '#D97706', mb: 1 }}>
              {formatCurrency(data.totalPending)}
            </Typography>

            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  backgroundColor: '#E2E8F0',
                  p: 0.5,
                  borderRadius: '4px',
                  mr: 1,
                  display: 'flex'
                }}
              >
                <Clock size={14} color="#475569" />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                {data.countPending} {data.countPending === 1 ? 'pagamento' : 'pagamentos'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Pagamentos Recebidos */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: '#EFF6FF',
              borderLeft: '4px solid #3B82F6',
              borderRadius: '0 8px 8px 0',
              p: 2,
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={1.5}>
              <Box
                sx={{
                  backgroundColor: '#DBEAFE',
                  p: 1,
                  borderRadius: '50%',
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CreditCard size={20} color="#2563EB" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                Recebidos
              </Typography>
            </Box>

            <Box display="flex" alignItems="flex-end" mb={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#2563EB', mr: 1 }}>
                {data.countReceived}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5 }}>
                transações
              </Typography>
            </Box>

            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  backgroundColor: '#E2E8F0',
                  p: 0.5,
                  borderRadius: '4px',
                  mr: 1,
                  display: 'flex'
                }}
              >
                <CheckCircle size={14} color="#475569" />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Concluídos
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Pagamentos Pendentes */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: '#FEF2F2',
              borderLeft: '4px solid #EF4444',
              borderRadius: '0 8px 8px 0',
              p: 2,
              height: '100%',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
              }
            }}
          >
            <Box display="flex" alignItems="center" mb={1.5}>
              <Box
                sx={{
                  backgroundColor: '#FEE2E2',
                  p: 1,
                  borderRadius: '50%',
                  mr: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <AlertCircle size={20} color="#DC2626" />
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                Pendentes
              </Typography>
            </Box>

            <Box display="flex" alignItems="flex-end" mb={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#DC2626', mr: 1 }}>
                {data.countPending}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', mb: 0.5 }}>
                transações
              </Typography>
            </Box>

            <Box display="flex" alignItems="center">
              <Box
                sx={{
                  backgroundColor: '#E2E8F0',
                  p: 0.5,
                  borderRadius: '4px',
                  mr: 1,
                  display: 'flex'
                }}
              >
                <Clock size={14} color="#475569" />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Aguardando confirmação
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinancialSummaryCard;