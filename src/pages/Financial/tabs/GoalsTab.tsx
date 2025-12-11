import { useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip } from '@mui/material';
import { usePlanning } from '../../../hooks/usePlanning';

const GoalsTab = () => {
  const { plannings, fetchPlannings } = usePlanning();

  useEffect(() => {
    // Carrega metas mensais como padrão
    fetchPlannings({ type: 'monthly' });
  }, [fetchPlannings]);

  const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Metas mensais de receita e sessões
      </Typography>

      <Grid container spacing={3}>
        {plannings.map((p) => (
          <Grid item xs={12} md={4} key={p._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {p.type === 'monthly' ? 'Meta Mensal' : p.type === 'weekly' ? 'Meta Semanal' : 'Meta Diária'}
                  </Typography>
                  <Chip
                    size="small"
                    label={p.progress.overallStatus}
                    color={
                      p.progress.overallStatus === 'achieved'
                        ? 'success'
                        : p.progress.overallStatus === 'on_track'
                        ? 'primary'
                        : p.progress.overallStatus === 'at_risk'
                        ? 'warning'
                        : 'error'
                    }
                  />
                </Box>

                <Typography variant="body2" color="text.secondary">
                  Período: {p.period.start} até {p.period.end}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">Meta de receita:</Typography>
                  <Typography variant="h6">
                    {formatCurrency(p.targets.expectedRevenue)}{' '}
                    <Typography component="span" variant="body2" color="text.secondary">
                      (Realizado: {formatCurrency(p.actual.actualRevenue)})
                    </Typography>
                  </Typography>

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Progresso: {p.progress.revenuePercentage}%
                  </Typography>
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Sessões: {p.actual.completedSessions}/{p.targets.totalSessions} (
                    {p.progress.sessionsPercentage}%)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {plannings.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Nenhuma meta encontrada. Crie um planejamento mensal na aba Planejamento para começar a acompanhar metas.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default GoalsTab;
