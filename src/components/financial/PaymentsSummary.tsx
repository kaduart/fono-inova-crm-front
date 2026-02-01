import { Box, Divider, Grid, Stack, Typography, useTheme } from '@mui/material';
import { AlertCircle, Building2, CheckCircle, CircleDollarSign, Clock, CreditCard } from 'lucide-react';
import React from 'react';

interface FinancialSummaryCardProps {
  data: {
    totalReceived: number;
    totalPending: number;
    countReceived: number;
    countPending: number;
    // Produção de Convênios
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

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const hasInsuranceData = data.totalInsuranceProduction && data.totalInsuranceProduction > 0;

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
    },
    // Cards de Convênios (só aparecem se houver dados)
    ...(hasInsuranceData ? [
      {
        title: 'Produção Convênios',
        value: formatCurrency(data.totalInsuranceProduction || 0),
        count: data.countInsuranceTotal || 0,
        icon: Building2,
        color: '#0891B2',
        bgColor: '#ECFEFF',
        iconBg: '#CFFAFE',
        description: 'atendimentos realizados'
      },
      {
        title: 'Convênios a Receber',
        value: formatCurrency(data.totalInsurancePending || 0),
        count: data.countInsurancePending || 0,
        icon: Clock,
        color: '#7C3AED',
        bgColor: '#F5F3FF',
        iconBg: '#EDE9FE',
        description: 'pendentes de pagamento'
      }
    ] : [])
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
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: 'grey.900',
              mb: 0.5,
              letterSpacing: '-0.02em'
            }}
          >
            Resumo Financeiro
          </Typography>
          <Typography variant="body1" sx={{ color: 'grey.600', maxWidth: '600px' }}>
            Visão consolidada das receitas, incluindo valores recebidos, pendentes e produção de convênios
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: 'grey.50',
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            minWidth: '180px'
          }}
        >
          <Box display="flex" alignItems="center">
            <Box sx={{
              width: 8,
              height: 8,
              bgcolor: '#10B981',
              borderRadius: '50%',
              mr: 1.5,
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }} />
            <Box>
              <Typography variant="caption" sx={{ color: 'grey.600', display: 'block', lineHeight: 1.2 }}>
                Última atualização
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.800', lineHeight: 1.2 }}>
                {new Date().toLocaleDateString('pt-BR')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: 2,
                p: 3,
                height: '100%',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 24px ${card.color}15`,
                  borderColor: card.color,
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: card.color,
                }
              }}
            >
              {/* Icon and Title */}
              <Box display="flex" alignItems="center" mb={2}>
                <Box
                  sx={{
                    backgroundColor: `${card.color}15`,
                    p: 1.5,
                    borderRadius: '12px',
                    mr: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <card.icon size={22} color={card.color} />
                </Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: 'grey.700',
                    fontSize: '0.9rem'
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
                  color: 'grey.900',
                  mb: 1,
                  fontSize: { xs: '1.5rem', sm: '1.75rem' },
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em'
                }}
              >
                {card.value}
              </Typography>

              {/* Description and Count */}
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2.5}>
                <Box display="flex" alignItems="center">
                  <Box
                    sx={{
                      backgroundColor: `${card.color}10`,
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
                      fontSize: '0.78rem'
                    }}
                  >
                    {card.count} {card.description}
                  </Typography>
                </Box>

                {/* Percentage or Indicator */}
                {index < 2 && (
                  <Box sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '12px',
                    backgroundColor: index === 0 ? '#10B98115' : '#F59E0B15'
                  }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: index === 0 ? '#10B981' : '#F59E0B',
                        fontSize: '0.75rem'
                      }}
                    >
                      {index === 0 ? '100%' : `${((data.totalPending / (data.totalReceived + data.totalPending)) * 100).toFixed(1)}%`}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Progress Bar */}
              {index < 2 && (
                <Box sx={{ mt: 2.5 }}>
                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mb: 0.5
                  }}>
                    <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500 }}>
                      Recebido
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500 }}>
                      Pendente
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: '100%',
                    height: 6,
                    bgcolor: 'grey.200',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <Box
                      sx={{
                        width: index === 0 ? '100%' : `${(data.totalPending / (data.totalReceived + data.totalPending)) * 100}%`,
                        height: '100%',
                        bgcolor: card.color,
                        borderRadius: 3,
                        transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    />
                  </Box>
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
          p: 4,
          bgcolor: 'grey.50',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3
          }
        }}
      >
        {/* Título do Card */}
        <Typography
          variant="h6"
          sx={{
            mb: 3,
            fontWeight: 600,
            color: 'grey.700',
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 1.5,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Box component="span" sx={{
            width: 4,
            height: 20,
            bgcolor: theme.palette.primary.main,
            mr: 2,
            borderRadius: 2
          }} />
          Consolidação Financeira
        </Typography>

        {/* Grid de Valores Principais */}
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={hasInsuranceData ? 4 : 6}>
            <Box sx={{
              p: 3,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <Box>
                <Box display="flex" alignItems="center" mb={1.5}>
                  <Box sx={{
                    width: 12,
                    height: 12,
                    bgcolor: '#16A34A',
                    borderRadius: '50%',
                    mr: 1.5
                  }} />
                  <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                    Caixa (Recebido)
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#16A34A',
                    fontSize: '1.75rem'
                  }}
                >
                  {formatCurrency(data.totalReceived)}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 2 }}>
                Valores já creditados
              </Typography>
            </Box>
          </Grid>

          {hasInsuranceData && (
            <Grid item xs={12} md={4}>
              <Box sx={{
                p: 3,
                bgcolor: 'white',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <Box sx={{
                      width: 12,
                      height: 12,
                      bgcolor: '#0891B2',
                      borderRadius: '50%',
                      mr: 1.5
                    }} />
                    <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                      Produção Convênios
                    </Typography>
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: '#0891B2',
                      fontSize: '1.75rem'
                    }}
                  >
                    {formatCurrency(data.totalInsuranceProduction || 0)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 2 }}>
                  Realizados neste período
                </Typography>
              </Box>
            </Grid>
          )}

          <Grid item xs={12} md={hasInsuranceData ? 4 : 6}>
            <Box sx={{
              p: 3,
              bgcolor: 'white',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              border: `2px solid ${theme.palette.primary.light}`,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}10)`
            }}>
              <Box>
                <Box display="flex" alignItems="center" mb={1.5}>
                  <Box sx={{
                    width: 12,
                    height: 12,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    borderRadius: '50%',
                    mr: 1.5
                  }} />
                  <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                    {hasInsuranceData ? 'Total Combinado' : 'Saldo Total'}
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '1.9rem'
                  }}
                >
                  {formatCurrency(data.totalCombined || (data.totalReceived + data.totalPending))}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'grey.600', fontWeight: 500, display: 'block', mt: 2 }}>
                {hasInsuranceData ? 'Soma de todas as fontes' : 'Total geral'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Divisor */}
        <Divider sx={{ my: 3 }} />

        {/* Legenda Detalhada */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: 'grey.600', mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <Box component="span" sx={{ mr: 1.5 }}>📊</Box>
            Detalhamento por Categoria
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.5}>
                <Box sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  '&:hover': { borderColor: '#16A34A' }
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 10, height: 10, bgcolor: '#16A34A', borderRadius: '50%', mr: 1.5 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                          Caixa Recebido
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                          Valores já creditados
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      {formatCurrency(data.totalReceived)}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{
                  p: 2,
                  bgcolor: 'white',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  '&:hover': { borderColor: '#D97706' }
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 10, height: 10, bgcolor: '#D97706', borderRadius: '50%', mr: 1.5 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                          Particular Pendente
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                          Aguardando recebimento
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      {formatCurrency(data.totalPending)}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Grid>

            {hasInsuranceData && (
              <Grid item xs={12} md={6}>
                <Stack spacing={1.5}>
                  <Box sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    '&:hover': { borderColor: '#0891B2' }
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 10, height: 10, bgcolor: '#0891B2', borderRadius: '50%', mr: 1.5 }} />
                        <Box>
                          <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                            Convênios Realizados
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                            Produção executada
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                        {formatCurrency(data.totalInsuranceProduction || 0)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    '&:hover': { borderColor: '#7C3AED' }
                  }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center">
                        <Box sx={{ width: 10, height: 10, bgcolor: '#7C3AED', borderRadius: '50%', mr: 1.5 }} />
                        <Box>
                          <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                            Convênios a Receber
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                            Aguardando repasse
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                        {formatCurrency(data.totalInsurancePending || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default FinancialSummaryCard;