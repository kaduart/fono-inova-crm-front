import { Box, Grid, Typography, useTheme } from '@mui/material';
import { CheckCircle2, Clock, DollarSign } from 'lucide-react';
import React from 'react';

interface FinancialSummaryCardProps {
  data: {
    totalReceived: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
    particularReceived?: number;
    particularPending?: number;
    particularCountReceived?: number;
    particularCountPending?: number;
  };
  periodLabel?: string;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ data, periodLabel }) => {
  const theme = useTheme();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: 'grey.900',
            letterSpacing: '-0.02em'
          }}
        >
          Pagamentos
        </Typography>
        <Typography variant="caption" sx={{ color: 'grey.500' }}>
          {periodLabel || new Date().toLocaleDateString('pt-BR')}
        </Typography>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={2} sx={{ flex: 1 }}>
        {/* Recebido */}
        <Grid item xs={12} sm={6}>
          <Box
            sx={{
              backgroundColor: '#ECFDF5',
              borderRadius: 2,
              p: 2.5,
              border: '1px solid #059669',
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DollarSign size={20} color="#059669" />
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                Recebido
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669', fontSize: '1.5rem' }}>
              {formatCurrency(data.particularReceived || data.totalReceived || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {data.particularCountReceived || data.countReceived || 0} pagamentos
            </Typography>
          </Box>
        </Grid>

        {/* Pendente */}
        <Grid item xs={14} sm={6}>
          <Box
            sx={{
              backgroundColor: '#FFFBEB',
              borderRadius: 2,
              p: 2.5,
              border: '1px solid #D97706',
              height: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Clock size={20} color="#D97706" />
              <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 600 }}>
                Pendente
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#D97706', fontSize: '1.5rem' }}>
              {formatCurrency(data.particularPending || data.totalPending || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {data.particularCountPending || data.countPending || 0} pagamentos
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Total */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
          Total do Período
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'grey.800' }}>
          {formatCurrency(
            (data.particularReceived || data.totalReceived || 0) + 
            (data.particularPending || data.totalPending || 0)
          )}
        </Typography>
      </Box>
    </Box>
  );
};

export default FinancialSummaryCard;
