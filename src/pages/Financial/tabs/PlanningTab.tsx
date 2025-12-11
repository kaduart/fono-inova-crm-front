import { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import { usePlanning } from '../../../hooks/usePlanning';

const PlanningTab = () => {
  const { plannings, fetchPlannings, createWeekly, createMonthly } = usePlanning();
  const [currentYear] = useState(new Date().getFullYear());
  const [currentMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchPlannings({});
  }, [fetchPlannings]);

  const handleCreateWeekly = async () => {
    const today = new Date().toISOString().slice(0, 10);
    await createWeekly(today);
    fetchPlannings({});
  };

  const handleCreateMonthly = async () => {
    await createMonthly(currentMonth, currentYear);
    fetchPlannings({});
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={handleCreateWeekly}>
          Criar planejamento semanal rápido
        </Button>
        <Button variant="contained" onClick={handleCreateMonthly}>
          Criar planejamento mensal rápido
        </Button>
      </Box>

      <Grid container spacing={3}>
        {plannings.map((p) => (
          <Grid item xs={12} md={4} key={p._id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {p.type === 'monthly'
                      ? 'Planejamento Mensal'
                      : p.type === 'weekly'
                      ? 'Planejamento Semanal'
                      : 'Planejamento Diário'}
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
                  {p.period.start} até {p.period.end}
                </Typography>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Sessões planejadas: {p.targets.totalSessions} / realizadas: {p.actual.completedSessions}
                  </Typography>
                  <Typography variant="body2">
                    Horas: {p.targets.workHours} / {p.actual.workedHours.toFixed(1)}
                  </Typography>
                  <Typography variant="body2">
                    Receita esperada: R$ {p.targets.expectedRevenue.toLocaleString('pt-BR')} / Real: R${' '}
                    {p.actual.actualRevenue.toLocaleString('pt-BR')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {plannings.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Nenhum planejamento cadastrado ainda. Use os botões acima para criar um planejamento rápido semanal ou
              mensal.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default PlanningTab;
