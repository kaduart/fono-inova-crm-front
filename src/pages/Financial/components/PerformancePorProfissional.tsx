import React from 'react';
import { Box, Avatar } from '@mui/material';
import { TrendingUp, Users, Activity } from 'lucide-react';
import { DashboardSection } from '../../../components/dashboard/DashboardSection';
import { DataCard } from '../../../components/dashboard/DataCard';
import { MetricBadge } from '../../../components/dashboard/MetricBadge';
import { EmptyState } from '../../../components/dashboard/EmptyState';
import { CardSkeleton } from '../../../components/dashboard/CardSkeleton';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

interface ProfessionalPerformance {
  id: string;
  nome: string;
  especialidade: string;
  resumo: {
    receita: number;
    atendimentos: number;
    ticketMedio: number;
  };
  mix: {
    particular: number;
  };
  comissao?: {
    total: number;
  };
  diagnostico: {
    status: 'top' | 'regular' | 'atencao';
    label?: string;
  };
}

interface PerformancePorProfissionalProps {
  professionals?: ProfessionalPerformance[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const avatarColors = [
  { bg: '#E0E7FF', text: '#4F46E5' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#047857' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#E0F2FE', text: '#0369A1' },
  { bg: '#F3E8FF', text: '#7C3AED' },
];

const getAvatarColor = (name: string) => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'top':
      return { label: 'TOP', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' as const };
    case 'regular':
      return { label: 'REGULAR', color: 'bg-amber-100 text-amber-700 border-amber-200' as const };
    default:
      return { label: 'ATENÇÃO', color: 'bg-rose-100 text-rose-700 border-rose-200' as const };
  }
};

export const PerformancePorProfissional: React.FC<PerformancePorProfissionalProps> = ({
  professionals = [],
  loading = false,
  title = 'Performance por Profissional',
  subtitle = 'Ranking de desempenho baseado em receita, atendimentos e mix particular',
}) => {
  if (loading) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={TrendingUp} />
        <CardSkeleton count={4} />
      </Box>
    );
  }

  if (professionals.length === 0) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={TrendingUp} />
        <EmptyState
          title="Nenhum dado de performance"
          description="Não encontramos profissionais com produção no período selecionado."
          icon={Activity}
          iconColor="#9CA3AF"
        />
      </Box>
    );
  }

  const sortedProfessionals = [...professionals].sort((a, b) => b.resumo.receita - a.resumo.receita);

  return (
    <Box>
      <DashboardSection title={title} subtitle={subtitle} icon={TrendingUp} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {sortedProfessionals.map((prof, index) => {
          const avatarColor = getAvatarColor(prof.nome);
          const status = getStatusBadge(prof.diagnostico.status);
          const rank = index + 1;

          return (
            <DataCard key={prof.id} highlight={rank <= 3} highlightColor={rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'}>
              <div className="flex items-start gap-4">
                {/* Avatar + Rank */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    sx={{
                      bgcolor: avatarColor.bg,
                      color: avatarColor.text,
                      width: 52,
                      height: 52,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                    }}
                  >
                    {getInitials(prof.nome)}
                  </Avatar>
                  {rank <= 3 && (
                    <div
                      className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-3xs font-bold shadow-sm"
                      style={{
                        backgroundColor: rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32',
                        color: rank === 1 ? '#92400E' : '#FFFFFF',
                      }}
                    >
                      {rank}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-900 truncate">{prof.nome}</h3>
                      <p className="text-xs text-gray-500 capitalize">{prof.especialidade}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-3xs font-bold uppercase tracking-wide border ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Métricas */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <MetricBadge
                      label="Receita"
                      value={formatCurrency(prof.resumo.receita)}
                      color="emerald"
                      size="sm"
                    />
                    <MetricBadge
                      label="Atendimentos"
                      value={prof.resumo.atendimentos}
                      color="blue"
                      size="sm"
                    />
                    <MetricBadge
                      label="Ticket Médio"
                      value={formatCurrency(prof.resumo.ticketMedio)}
                      color="indigo"
                      size="sm"
                    />
                    <MetricBadge
                      label="Mix Particular"
                      value={`${prof.mix.particular.toFixed(0)}%`}
                      color="purple"
                      size="sm"
                    />
                    <MetricBadge
                      label="Comissão"
                      value={formatCurrency(prof.comissao?.total || 0)}
                      color="gray"
                      size="sm"
                    />
                  </div>

                  {/* Barra de progresso visual */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Users size={12} /> Mix particular
                      </span>
                      <span className="font-semibold text-gray-700">{prof.mix.particular.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(prof.mix.particular, 100)}%`,
                          backgroundColor: prof.mix.particular >= 60 ? '#10B981' : prof.mix.particular >= 30 ? '#F59E0B' : '#6366F1',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </DataCard>
          );
        })}
      </div>
    </Box>
  );
};
