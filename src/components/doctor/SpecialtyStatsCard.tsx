import { Box, Card, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import { Stethoscope, Brain, Activity, Heart, Music, Baby, BookOpen } from 'lucide-react';
import SpecialtyCard from '../../pages/SpecialtyCard';

// Mapeamento de especialidades para ícones e cores
const SPECIALTY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  'fonoaudiologia': { icon: 'hearing', color: '#FF9800', label: 'Fonoaudiologia' },
  'psicologia': { icon: 'brain', color: '#9C27B0', label: 'Psicologia' },
  'terapia_ocupacional': { icon: 'activity', color: '#2196F3', label: 'Terapia Ocupacional' },
  'fisioterapia': { icon: 'heart', color: '#4CAF50', label: 'Fisioterapia' },
  'neuropsicologia': { icon: 'brain', color: '#673AB7', label: 'Neuropsicologia' },
  'musicoterapia': { icon: 'music', color: '#E91E63', label: 'Musicoterapia' },
  'psicomotricidade': { icon: 'baby', color: '#00BCD4', label: 'Psicomotricidade' },
  'psicopedagogia': { icon: 'bookOpen', color: '#795548', label: 'Psicopedagogia' },
  'Fonoaudiologia': { icon: 'hearing', color: '#FF9800', label: 'Fonoaudiologia' },
  'Psicologia': { icon: 'brain', color: '#9C27B0', label: 'Psicologia' },
  'Terapia Ocupacional': { icon: 'activity', color: '#2196F3', label: 'Terapia Ocupacional' },
  'Fisioterapia': { icon: 'heart', color: '#4CAF50', label: 'Fisioterapia' },
};

// Função para obter configuração da especialidade (case insensitive)
const getSpecialtyConfig = (specialty: string) => {
  // Tenta encontrar exatamente como está
  if (SPECIALTY_CONFIG[specialty]) {
    return SPECIALTY_CONFIG[specialty];
  }
  // Tenta em lowercase
  const lower = specialty.toLowerCase();
  if (SPECIALTY_CONFIG[lower]) {
    return SPECIALTY_CONFIG[lower];
  }
  // Tenta capitalizar primeira letra
  const capitalized = specialty.charAt(0).toUpperCase() + specialty.slice(1).toLowerCase();
  if (SPECIALTY_CONFIG[capitalized]) {
    return SPECIALTY_CONFIG[capitalized];
  }
  // Padrão genérico
  return { icon: 'brain', color: '#3B82F6', label: specialty };
};

export default function SpecialtyStatsCard({
  doctorData,
  stats
}: {
  doctorData: any;
  stats: any;
}) {
  const theme = useTheme();
  const hasStats = doctorData?.specialty && stats?.specialties?.[doctorData.specialty];

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
          (() => {
            const config = getSpecialtyConfig(doctorData.specialty);
            const specialtyStats = stats.specialties[doctorData.specialty];
            return (
              <SpecialtyCard
                specialty={{
                  id: doctorData.specialty,
                  name: config.label,
                  icon: config.icon,
                  color: config.color,
                  sessionDuration: 40
                }}
                stats={{
                  scheduled: specialtyStats.scheduled || 0,
                  completed: specialtyStats.completed || 0,
                  canceled: specialtyStats.canceled || 0
                }}
              />
            );
          })()
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
              {doctorData?.specialty 
                ? `Para ${doctorData.specialty}` 
                : 'Para sua especialidade'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}