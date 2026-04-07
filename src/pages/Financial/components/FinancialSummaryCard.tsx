import { Box, Divider, Grid, Stack, Typography, useTheme } from '@mui/material';
import { CheckCircle2, Clock, DollarSign } from 'lucide-react';
import React from 'react';

interface FinancialSummaryCardProps {
  data: {
    totalReceived: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
    // Particular
    particularReceived?: number;
    particularPending?: number;
    particularCountReceived?: number;
    particularCountPending?: number;
    // Convênios
    totalInsuranceProduction?: number;
    totalInsuranceReceived?: number;
    totalInsurancePending?: number;
    countInsuranceTotal?: number;
    countInsuranceReceived?: number;
    countInsurancePending?: number;
    // Total combinado
    totalCombined?: number;
  };
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ data }) => {
  const theme = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const hasInsuranceData = data.totalInsuranceProduction && data.totalInsuranceProduction > 0;

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="grey.900" mb={0.5}>
            Resumo Financeiro
          </Typography>
          <Typography variant="body1" color="grey.600">
            Visão consolidada das receitas
          </Typography>
        </Box>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Particular Recebido */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #059669',
            }}
          >
            <Box sx={{ backgroundColor: '#ECFDF5', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <DollarSign size={24} color="#059669" />
            </Box>
            <Typography variant="caption" color="grey.500" fontWeight={500}>
              Particular Recebido
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#059669" my={0.5}>
              {formatCurrency(data.particularReceived || 0)}
            </Typography>
            <Typography variant="caption" color="grey.400">
              {data.particularCountReceived || 0} pagamentos
            </Typography>
          </Box>
        </Grid>

        {/* Convênios Recebidos */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #0891B2',
            }}
          >
            <Box sx={{ backgroundColor: '#ECFEFF', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <CheckCircle2 size={24} color="#0891B2" />
            </Box>
            <Typography variant="caption" color="grey.500" fontWeight={500}>
              Convênios Recebidos
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#0891B2" my={0.5}>
              {formatCurrency(data.totalInsuranceReceived || 0)}
            </Typography>
            <Typography variant="caption" color="grey.400">
              {data.countInsuranceReceived || 0} repasses
            </Typography>
          </Box>
        </Grid>

        {/* Particular Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #D97706',
            }}
          >
            <Box sx={{ backgroundColor: '#FFFBEB', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <Clock size={24} color="#D97706" />
            </Box>
            <Typography variant="caption" color="grey.500" fontWeight={500}>
              Particular Pendente
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#D97706" my={0.5}>
              {formatCurrency(data.particularPending || 0)}
            </Typography>
            <Typography variant="caption" color="grey.400">
              {data.particularCountPending || 0} aguardando
            </Typography>
          </Box>
        </Grid>

        {/* Convênios Pendentes */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #7C3AED',
            }}
          >
            <Box sx={{ backgroundColor: '#F5F3FF', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <Clock size={24} color="#7C3AED" />
            </Box>
            <Typography variant="caption" color="grey.500" fontWeight={500}>
              Convênios Pendentes
            </Typography>
            <Typography variant="h5" fontWeight={700} color="#7C3AED" my={0.5}>
              {formatCurrency(data.totalInsurancePending || 0)}
            </Typography>
            <Typography variant="caption" color="grey.400">
              {data.countInsurancePending || 0} aguardando
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Total em Caixa */}
      <Box sx={{
        p: 3,
        bgcolor: '#F0FDF4',
        borderRadius: 2,
        border: '1.5px solid #16A34A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box>
          <Typography variant="body1" fontWeight={600} color="grey.700">
            Total Recebido (Particular + Convênios)
          </Typography>
          <Typography variant="caption" color="grey.500">
            Valor efetivamente em caixa
          </Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} color="#16A34A">
          {formatCurrency((data.particularReceived || 0) + (data.totalInsuranceReceived || 0))}
        </Typography>
      </Box>
    </Box>
  );
};

export default FinancialSummaryCard;
