import { Box, Grid, Typography, useTheme } from '@mui/material';
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
  const theme = useTheme();

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const cards = [
    {
      title: 'Total Recebido',
      value: formatCurrency(data.totalReceived),
      count: data.countReceived,
      icon: CircleDollarSign,
      color: '#16A34A',
      bgColor: '#F0FDF4',
      iconBg: '#DCFCE7',
      description: 'pagamentos confirmados'
    },
    {
      title: 'Total Pendente',
      value: formatCurrency(data.totalPending),
      count: data.countPending,
      icon: Clock,
      color: '#D97706',
      bgColor: '#FFFBEB',
      iconBg: '#FEF3C7',
      description: 'aguardando confirmação'
    },
    {
      title: 'Recebidos',
      value: data.countReceived.toString(),
      count: data.countReceived,
      icon: CreditCard,
      color: '#2563EB',
      bgColor: '#EFF6FF',
      iconBg: '#DBEAFE',
      description: 'transações concluídas'
    },
    {
      title: 'Pendentes',
      value: data.countPending.toString(),
      count: data.countPending,
      icon: AlertCircle,
      color: '#DC2626',
      bgColor: '#FEF2F2',
      iconBg: '#FEE2E2',
      description: 'transações pendentes'
    }
  ];

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 700, 
            color: 'grey.800',
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Resumo Financeiro
        </Typography>
        <Box display="flex" alignItems="center" sx={{ bgcolor: 'grey.50', px: 2, py: 1, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: 'grey.600', mr: 1 }}>
            Atualizado em:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'grey.700' }}>
            {new Date().toLocaleDateString('pt-BR')}
          </Typography>
        </Box>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={3}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Box
              sx={{
                backgroundColor: card.bgColor,
                borderLeft: `4px solid ${card.color}`,
                borderRadius: '0 12px 12px 0',
                p: 3,
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px ${card.color}20`,
                }
              }}
            >
              {/* Icon and Title */}
              <Box display="flex" alignItems="center" mb={2.5}>
                <Box
                  sx={{
                    backgroundColor: card.iconBg,
                    p: 1.5,
                    borderRadius: '12px',
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <card.icon size={24} color={card.color} />
                </Box>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'grey.800',
                    fontSize: '0.95rem'
                  }}
                >
                  {card.title}
                </Typography>
              </Box>

              {/* Value */}
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: card.color, 
                  mb: 1,
                  fontSize: '1.75rem',
                  lineHeight: 1.2
                }}
              >
                {card.value}
              </Typography>

              {/* Description */}
              <Box display="flex" alignItems="center" mt={2}>
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    p: 1,
                    borderRadius: '8px',
                    mr: 1.5,
                    display: 'flex'
                  }}
                >
                  {index < 2 ? (
                    <CreditCard size={16} color={card.color} />
                  ) : (
                    <CheckCircle size={16} color={card.color} />
                  )}
                </Box>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'grey.600',
                    fontWeight: 500,
                    fontSize: '0.8rem'
                  }}
                >
                  {card.count} {card.description}
                </Typography>
              </Box>

              {/* Progress Bar for received/pending ratio */}
              {index < 2 && (
                <Box sx={{ mt: 2, width: '100%', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, height: 4 }}>
                  <Box 
                    sx={{ 
                      width: index === 0 ? '100%' : `${(data.totalPending / (data.totalReceived + data.totalPending)) * 100}%`,
                      height: '100%',
                      bgcolor: card.color,
                      borderRadius: 2,
                      transition: 'width 0.5s ease'
                    }} 
                  />
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Total Summary */}
      <Box 
        sx={{ 
          mt: 4, 
          p: 3, 
          bgcolor: 'grey.50', 
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="body2" sx={{ color: 'grey.600', mb: 1 }}>
              Saldo Total
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {formatCurrency(data.totalReceived + data.totalPending)}
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Box display="flex" alignItems="center">
                <Box sx={{ width: 12, height: 12, bgcolor: '#16A34A', borderRadius: '50%', mr: 1 }} />
                <Typography variant="caption" sx={{ color: 'grey.600' }}>
                  Recebido: {formatCurrency(data.totalReceived)}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <Box sx={{ width: 12, height: 12, bgcolor: '#D97706', borderRadius: '50%', mr: 1 }} />
                <Typography variant="caption" sx={{ color: 'grey.600' }}>
                  Pendente: {formatCurrency(data.totalPending)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default FinancialSummaryCard;