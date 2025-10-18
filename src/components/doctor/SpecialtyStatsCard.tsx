import { Box, Card, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import { Stethoscope } from 'lucide-react';
import SpecialtyCard from '../../pages/SpecialtyCard';

export default function SpecialtyStatsCard({
  doctorData,
  stats
}: {
  doctorData: any;
  stats: any;
}) {
  const theme = useTheme();
  const hasStats = doctorData?.specialty && stats.specialty;

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        background: 'white',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[4],
        }
      }}
    >
      <CardHeader
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`
        }}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Stethoscope size={20} color={theme.palette.primary.main} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
              Estatísticas da Especialidade
            </Typography>
          </Box>
        }
      />
      <CardContent sx={{ p: 3 }}>
        {hasStats ? (
          <SpecialtyCard
            specialty={{
              id: doctorData.specialty,
              name: doctorData.specialty,
              icon: doctorData.specialty === 'Fonoaudiologia' ? 'hearing' : 'brain',
              color: doctorData.specialty === 'Fonoaudiologia' ? '#FF9800' : '#3B82F6',
              sessionDuration: 40
            }}
            stats={{
              scheduled: stats.specialties[doctorData.specialty].scheduled,
              completed: stats.specialties[doctorData.specialty].completed,
              canceled: stats.specialties[doctorData.specialty].canceled
            }}
          />
        ) : (
          <Box sx={{
            textAlign: 'center',
            py: 4,
            color: 'grey.500'
          }}>
            <Stethoscope size={48} color={theme.palette.grey[400]} style={{ marginBottom: '16px' }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              Nenhuma estatística disponível
            </Typography>
            <Typography variant="body2">
              Para sua especialidade
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}