import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar } from '@mui/material';

import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { Crown, Eye, Phone, Users, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { Patient360Modal } from './Patient360Modal';
import { DashboardSection } from '../../../components/dashboard/DashboardSection';
import { DataCard } from '../../../components/dashboard/DataCard';
import { MetricBadge } from '../../../components/dashboard/MetricBadge';
import { EmptyState } from '../../../components/dashboard/EmptyState';
import { CardSkeleton } from '../../../components/dashboard/CardSkeleton';

interface PatientBreakdownItem {
  patientId?: string;
  patientName?: string;
  name?: string;
  phone?: string;
  sessionsCompleted?: number;
  paymentsCount?: number;
  totalSpent?: number;
  production?: number;
  received?: number;
  pending?: number;
  averageTicket?: number;
  lastPayment?: string;
  lastSession?: string | null;
  nextSession?: string | null;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '-';

const getInitials = (name?: string) => {
  if (!name) return '?';
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

const getAvatarColor = (name?: string) => {
  if (!name) return avatarColors[0];
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

interface ListaPacientesVIPProps {
  data?: PatientBreakdownItem[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

export const ListaPacientesVIP: React.FC<ListaPacientesVIPProps> = ({
  data,
  loading,
  title = 'Pacientes VIP (Top 10 LTV)',
  subtitle = 'Pacientes com maior lifetime value do período',
}) => {
  const { patientsList, loadingPatients, fetchPatientsList } = useFinancialAnalytics();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (data) return;
    fetchPatientsList({ page: 1, limit: 10, sortBy: 'totalSpent', order: 'desc' });
  }, [fetchPatientsList, data]);

  const handleOpen360 = (id: string) => {
    setSelectedPatientId(id);
    setIsModalOpen(true);
  };

  const isLoading = loading ?? (loadingPatients && patientsList.data.length === 0);
  const rows = data ?? patientsList.data;

  if (isLoading) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={Crown} iconColor="#FFD700" />
        <CardSkeleton count={5} />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={Crown} iconColor="#FFD700" />
        <EmptyState
          title="Nenhum paciente VIP encontrado"
          description="No momento não há pacientes com produção no período selecionado."
          icon={Users}
          iconColor="#9CA3AF"
        />
      </Box>
    );
  }

  return (
    <Box>
      <DashboardSection title={title} subtitle={subtitle} icon={Crown} iconColor="#FFD700" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {rows.map((patient: PatientBreakdownItem, index: number) => {
          const id = patient.patientId || '';
          const name = patient.patientName || patient.name || 'Sem nome';
          const phone = patient.phone;
          const sessions = patient.sessionsCompleted ?? patient.paymentsCount ?? 0;
          const production = patient.production ?? patient.totalSpent ?? 0;
          const received = patient.received ?? 0;
          const pending = patient.pending ?? 0;
          const lastSession = patient.lastSession || patient.lastPayment;
          const nextSession = patient.nextSession;
          const avatarColor = getAvatarColor(name);
          const rank = index + 1;

          return (
            <DataCard key={id || name} highlight={rank <= 3} highlightColor={rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'}>
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
                    {getInitials(name)}
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
                      <Typography fontWeight={700} className="text-gray-900 truncate" fontSize="1rem">
                        {name}
                      </Typography>
                      {phone && (
                        <Typography variant="caption" color="textSecondary" className="block">
                          {phone}
                        </Typography>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {id && (
                        <button
                          onClick={() => handleOpen360(id)}
                          title="Ver Visão 360°"
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {phone && (
                        <a
                          href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir WhatsApp"
                          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <Phone size={18} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <MetricBadge
                      label="Sessões"
                      value={sessions}
                      color="blue"
                      size="sm"
                    />
                    <MetricBadge
                      label="Produção"
                      value={formatCurrency(production)}
                      color="emerald"
                      size="sm"
                    />
                    <MetricBadge
                      label="Recebido"
                      value={formatCurrency(received)}
                      color="indigo"
                      size="sm"
                    />
                    {pending > 0 && (
                      <MetricBadge
                        label="Pendente"
                        value={formatCurrency(pending)}
                        color="amber"
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Datas */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>Última: <span className="font-medium text-gray-700">{formatDate(lastSession)}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={12} />
                      <span>Próxima: <span className="font-medium text-gray-700">{formatDate(nextSession)}</span></span>
                    </div>
                    {patient.averageTicket !== undefined && patient.averageTicket > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Wallet size={12} />
                        <span>Ticket médio: <span className="font-medium text-gray-700">{formatCurrency(patient.averageTicket)}</span></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DataCard>
          );
        })}
      </div>

      {selectedPatientId && (
        <Patient360Modal
          patientId={selectedPatientId}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </Box>
  );
};
