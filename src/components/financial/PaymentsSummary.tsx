import { Box, Grid, Typography } from '@mui/material';
import { CreditCard, DollarSign, CircleDollarSign, Clock } from 'lucide-react';
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
        borderRadius: 2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#333' }}>
        Resumo Financeiro
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Recebido */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              borderLeft: '4px solid #66BB6A',
              pl: 2,
              py: 1,
              height: '100%',
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ color: '#66BB6A', mr: 1.5 }}>
                <CircleDollarSign size={24} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Total Recebido
              </Typography>
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatCurrency(data.totalReceived)}
            </Typography>
            
            <Box display="flex" alignItems="center" mt={1}>
              <CreditCard size={16} />
              <Typography variant="body2" sx={{ ml: 1, color: '#666' }}>
                {data.countReceived} pagamentos
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Total Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              borderLeft: '4px solid #FFA726',
              pl: 2,
              py: 1,
              height: '100%',
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ color: '#FFA726', mr: 1.5 }}>
                <Clock size={24} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Total Pendente
              </Typography>
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {formatCurrency(data.totalPending)}
            </Typography>
            
            <Box display="flex" alignItems="center" mt={1}>
              <CreditCard size={16} />
              <Typography variant="body2" sx={{ ml: 1, color: '#666' }}>
                {data.countPending} pagamentos
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        {/* Quantidade Recebida */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              borderLeft: '4px solid #42A5F5',
              pl: 2,
              py: 1,
              height: '100%',
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ color: '#42A5F5', mr: 1.5 }}>
                <CreditCard size={24} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Pagamentos Recebidos
              </Typography>
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {data.countReceived}
            </Typography>
            
            <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
              Transações concluídas
            </Typography>
          </Box>
        </Grid>
        
        {/* Quantidade Pendente */}
        <Grid item xs={12} sm={6} md={3}>
          <Box
            sx={{
              borderLeft: '4px solid #EF5350',
              pl: 2,
              py: 1,
              height: '100%',
            }}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <Box sx={{ color: '#EF5350', mr: 1.5 }}>
                <Clock size={24} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Pagamentos Pendentes
              </Typography>
            </Box>
            
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {data.countPending}
            </Typography>
            
            <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
              Aguardando confirmação
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinancialSummaryCard;