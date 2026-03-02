import { Box, Divider, Grid, Stack, Typography, useTheme } from '@mui/material';
import { AlertCircle, CheckCircle, CheckCircle2, CircleDollarSign, Clock, CreditCard, DollarSign } from 'lucide-react';
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

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const hasInsuranceData = data.totalInsuranceProduction && data.totalInsuranceProduction > 0;
  
  // Calcula total a receber (particular + convênios)
  const totalAReceber = (data.particularPending || 0) + (data.totalInsurancePending || 0);
  const countAReceber = (data.particularCountPending || 0) + (data.countInsurancePending || 0);

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

      {/* Cards Grid - 4 colunas distribuídas ocupando toda largura */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* CARD 1: Particular Recebido */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              width: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #059669',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.12)',
              }
            }}
          >
            <Box sx={{ backgroundColor: '#ECFDF5', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <DollarSign size={24} color="#059669" />
            </Box>
            <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500, fontSize: '0.8rem' }}>
              Particular Recebido
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#059669', my: 0.5, fontSize: '1.5rem' }}>
              {formatCurrency(data.particularReceived || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.75rem' }}>
              {data.particularCountReceived || 0} pagamentos confirmados
            </Typography>
          </Box>
        </Grid>

        {/* CARD 2: Convênios Recebidos */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              width: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #0891B2',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(8, 145, 178, 0.12)',
              }
            }}
          >
            <Box sx={{ backgroundColor: '#ECFEFF', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <CheckCircle2 size={24} color="#0891B2" />
            </Box>
            <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500, fontSize: '0.8rem' }}>
              Convênios Recebidos
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#0891B2', my: 0.5, fontSize: '1.5rem' }}>
              {formatCurrency(data.totalInsuranceReceived || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.75rem' }}>
              {data.countInsuranceReceived || 0} repasses confirmados
            </Typography>
          </Box>
        </Grid>

        {/* CARD 3: Particular Pendente */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              width: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #D97706',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(217, 119, 6, 0.12)',
              }
            }}
          >
            <Box sx={{ backgroundColor: '#FFFBEB', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <Clock size={24} color="#D97706" />
            </Box>
            <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500, fontSize: '0.8rem' }}>
              Particular Pendente
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#D97706', my: 0.5, fontSize: '1.5rem' }}>
              {formatCurrency(data.particularPending || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.75rem' }}>
              {data.particularCountPending || 0} aguardando pagamento
            </Typography>
          </Box>
        </Grid>

        {/* CARD 4: Convênios Pendentes */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 2,
              p: 3,
              height: '100%',
              width: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderTop: '3px solid #7C3AED',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(124, 58, 237, 0.12)',
              }
            }}
          >
            <Box sx={{ backgroundColor: '#F5F3FF', p: 1.5, borderRadius: '10px', width: 'fit-content', mb: 2 }}>
              <Clock size={24} color="#7C3AED" />
            </Box>
            <Typography variant="caption" sx={{ color: 'grey.500', fontWeight: 500, fontSize: '0.8rem' }}>
              Convênios Pendentes
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#7C3AED', my: 0.5, fontSize: '1.5rem' }}>
              {formatCurrency(data.totalInsurancePending || 0)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.400', fontSize: '0.75rem' }}>
              {data.countInsurancePending || 0} aguardando repasse
            </Typography>
          </Box>
        </Grid>
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
          {/* Particular Recebido */}
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
                    bgcolor: '#059669',
                    borderRadius: '50%',
                    mr: 1.5
                  }} />
                  <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                    Particular Recebido
                  </Typography>
                </Box>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: '#059669',
                    fontSize: '1.75rem'
                  }}
                >
                  {formatCurrency(data.particularReceived || 0)}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 2 }}>
                Pagamentos confirmados
              </Typography>
            </Box>
          </Grid>

          {/* Convênios Recebidos (já no caixa) */}
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
                      Convênios Recebidos
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
                    {formatCurrency(data.totalInsuranceReceived || 0)}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'grey.500', display: 'block', mt: 2 }}>
                  Repasses já creditados
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Total Esperado (Caixa + Pendentes) */}
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
                    {hasInsuranceData ? 'Total Esperado' : 'Saldo Total'}
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
                {hasInsuranceData ? 'Caixa + Pendentes' : 'Total geral'}
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
                  '&:hover': { borderColor: '#059669' }
                }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box sx={{ width: 10, height: 10, bgcolor: '#059669', borderRadius: '50%', mr: 1.5 }} />
                      <Box>
                        <Typography variant="body2" sx={{ color: 'grey.700', fontWeight: 500 }}>
                          Particular Recebido
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                          Pagamentos confirmados
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      {formatCurrency(data.particularReceived || 0)}
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
                          Aguardando pagamento
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                      {formatCurrency(data.particularPending || 0)}
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
                            Convênios Recebidos
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'grey.500', display: 'block' }}>
                            Repasses confirmados
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'grey.800' }}>
                        {formatCurrency(data.totalInsuranceReceived || 0)}
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