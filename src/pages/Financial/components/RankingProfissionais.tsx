// frontend/src/pages/Financial/components/RankingProfissionais.tsx
import React, { useMemo, useState } from 'react';
import { Box, Typography, Avatar, LinearProgress, Chip } from '@mui/material';
import { useDoctorsAnalytics } from '../../../hooks/useSpecialtiesAnalytics';
import { Trophy, Users, TrendingUp, WalletCards } from 'lucide-react';
import { ProfessionalRankingItem } from '../../../services/professionalResultsService';
import { ProfessionalAdvanceModal } from '../../../components/financial/ProfessionalAdvanceModal';
import { DashboardSection } from '../../../components/dashboard/DashboardSection';
import { DataCard } from '../../../components/dashboard/DataCard';
import { MetricBadge } from '../../../components/dashboard/MetricBadge';
import { EmptyState } from '../../../components/dashboard/EmptyState';
import { CardSkeleton } from '../../../components/dashboard/CardSkeleton';

const formatCurrency = (value: number) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface RankingProfissionaisProps {
  data?: ProfessionalRankingItem[];
  loading?: boolean;
  onRowClick?: (doctorId: string) => void;
  title?: string;
  subtitle?: string;
}

interface CommissionRate {
  billingType: string;
  commissionType: string;
  value: number;
}

interface NormalizedRow {
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientsTotal: number;
  productionTotal: number;
  receivedTotal: number;
  commission: number;
  commissionRates: CommissionRate[];
  advances: number;
  balance: number;
  receivablesTotal: number;
  rank?: number;
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

const getRankColor = (rank: number) => {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#9CA3AF';
};

const getRankBg = (rank: number) => {
  if (rank === 1) return '#FFFBEB';
  if (rank === 2) return '#F9FAFB';
  if (rank === 3) return '#FFF7ED';
  return '#FFFFFF';
};

export const RankingProfissionais: React.FC<RankingProfissionaisProps> = ({
  data,
  loading,
  onRowClick,
  title = 'Ranking de Profissionais',
  subtitle = 'Produção, recebimento, comissão e saldo por profissional',
}) => {
  const now = new Date();
  const dateRange = {
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  };
  const { data: doctors = [], isLoading: loadingDoctors } = useDoctorsAnalytics(dateRange, undefined, !data);
  const [advanceModal, setAdvanceModal] = useState<{ doctorId: string; doctorName: string } | null>(null);

  const rows: NormalizedRow[] = useMemo(() => {
    const source = data ?? (doctors || []).map((doc) => ({
      doctorId: doc.doctorId,
      doctorName: doc.doctorName,
      specialty: doc.specialty,
      patients: { active: 0, new: 0, inactive: 0, total: doc.uniquePatients ?? 0 },
      production: { total: doc.totalRevenue ?? 0, particular: 0, pacote: 0, convenio: 0, liminar: 0 },
      received: { total: doc.totalReceived ?? 0, particular: 0, convenio: 0, liminar: 0, packageSales: 0, sessionCash: 0 },
      commission: 0,
      advances: 0,
      balance: 0,
      receivables: { total: 0, particular: 0, insurance: 0, liminar: 0, packageConsumed: 0 }
    } as ProfessionalRankingItem));

    return source.map((doc, index) => ({
      doctorId: doc.doctorId,
      doctorName: doc.doctorName,
      specialty: doc.specialty || '-',
      patientsTotal: doc.patients?.total ?? 0,
      productionTotal: typeof doc.production === 'number' ? doc.production : (doc.production?.total ?? 0),
      receivedTotal: typeof doc.received === 'number' ? doc.received : (doc.received?.total ?? 0),
      commission: doc.commission ?? 0,
      commissionRates: doc.commissionRates ?? [],
      advances: doc.advances ?? 0,
      balance: doc.balance ?? 0,
      receivablesTotal: doc.receivables?.total ?? 0,
      rank: doc.rank ?? index + 1
    }));
  }, [data, doctors]);

  const isLoading = loading ?? (!data && loadingDoctors);

  const maxProduction = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.max(...rows.map(r => r.productionTotal));
  }, [rows]);

  const totals = useMemo(() => {
    const source = data ?? [];
    const clinicPatients = source[0]?.clinicPatientsThisPeriod ?? rows.reduce((s, r) => s + r.patientsTotal, 0);
    const clinicSessions = source[0]?.clinicSessionsThisPeriod ?? 0;
    return {
      patients: clinicPatients,
      sessions: clinicSessions,
      production: rows.reduce((s, r) => s + r.productionTotal, 0),
      received: rows.reduce((s, r) => s + r.receivedTotal, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      advances: rows.reduce((s, r) => s + r.advances, 0),
      receivables: rows.reduce((s, r) => s + r.receivablesTotal, 0),
    };
  }, [rows, data]);

  if (isLoading) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={Trophy} iconColor="#F59E0B" />
        <CardSkeleton count={5} />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Box>
        <DashboardSection title={title} subtitle={subtitle} icon={Trophy} iconColor="#F59E0B" />
        <EmptyState
          title="Nenhum profissional encontrado"
          description="Não há dados de produção no período selecionado."
          icon={Users}
          iconColor="#9CA3AF"
        />
      </Box>
    );
  }

  const summaryItems = [
    { label: 'Pacientes no mês', sublabel: 'únicos atendidos', value: String(totals.patients), color: '#3b82f6' },
    { label: 'Atendimentos no mês', sublabel: 'sessões concluídas', value: String(totals.sessions), color: '#06b6d4' },
    { label: 'Produção total', sublabel: 'soma das produções', value: formatCurrency(totals.production), color: '#10b981' },
    { label: 'Recebido total', sublabel: 'caixa recebido', value: formatCurrency(totals.received), color: '#6366f1' },
    { label: 'Comissão total', sublabel: 'soma de comissões', value: formatCurrency(totals.commission), color: '#8b5cf6' },
    { label: 'Adiantamentos', sublabel: 'valores antecipados', value: formatCurrency(totals.advances), color: '#ef4444' },
    { label: 'A receber', sublabel: 'produção não paga', value: formatCurrency(totals.receivables), color: '#f59e0b' },
  ];

  return (
    <Box>
      <DashboardSection
        title={title}
        subtitle={subtitle}
        icon={Trophy}
        iconColor="#F59E0B"
      />

      {/* Resumo global */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          {summaryItems.map(item => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{item.label}</div>
              <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{item.sublabel}</div>
            </div>
          ))}
        </div>
      )}

      {/* Cards de profissionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((doc) => {
          const performance = maxProduction > 0 ? Math.round((doc.productionTotal / maxProduction) * 100) : 0;
          const initials = getInitials(doc.doctorName);
          const avatarColor = getAvatarColor(doc.doctorName);
          const rankColor = getRankColor(doc.rank!);

          return (
            <DataCard
              key={doc.doctorId}
              onClick={() => onRowClick?.(doc.doctorId)}
              highlight={doc.rank! <= 3}
              highlightColor={rankColor}
              className="!p-0 overflow-hidden h-full flex flex-col"
            >
              <div className="p-3 sm:p-4 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: rankColor, color: doc.rank! <= 3 ? '#1F2937' : '#FFFFFF' }}
                  >
                    {doc.rank}
                  </div>

                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 border-white shadow-sm"
                    style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
                  >
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Typography fontWeight={700} className="text-gray-900 truncate" fontSize="1rem">
                      {doc.doctorName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" className="capitalize block">
                      {doc.specialty}
                    </Typography>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdvanceModal({ doctorId: doc.doctorId, doctorName: doc.doctorName });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0"
                  >
                    <WalletCards className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adiantamento</span>
                  </button>
                </div>

                {/* Métricas + desempenho em linha minimalista */}
                <div className="flex flex-col gap-3 mt-auto">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <MetricBadge label="Produção" value={formatCurrency(doc.productionTotal)} color="emerald" size="sm" />
                    <MetricBadge label="Recebido" value={formatCurrency(doc.receivedTotal)} color="indigo" size="sm" />
                    <MetricBadge label="Comissão" value={formatCurrency(doc.commission)} color="purple" size="sm" />
                    <MetricBadge label="Saldo" value={formatCurrency(doc.balance)} color={doc.balance >= 0 ? 'emerald' : 'red'} size="sm" />
                    <MetricBadge label="A Receber" value={formatCurrency(doc.receivablesTotal)} color="amber" size="sm" />
                    {doc.advances > 0 && (
                      <MetricBadge label="Adiantamento" value={`-${formatCurrency(doc.advances)}`} color="red" size="sm" />
                    )}
                  </div>

                  {/* Desempenho compacto */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <TrendingUp
                          className="w-3 h-3"
                          style={{ color: performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444' }}
                        />
                        <span className="text-[10px] font-semibold text-gray-600">{performance}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-[4px] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${performance}%`,
                            backgroundColor: performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                      <Users className="w-3 h-3" />
                      {doc.patientsTotal}
                    </span>
                  </div>
                </div>

                {/* Taxas de comissão */}
                {doc.commissionRates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {doc.commissionRates.map((r, i) => {
                      const label = r.billingType === 'all' ? 'Geral' :
                        r.billingType === 'particular' ? 'Part.' :
                        r.billingType === 'convenio' ? 'Conv.' :
                        r.billingType === 'liminar' ? 'Lim.' :
                        r.billingType === 'package' ? 'Pac.' : r.billingType;
                      const rate = r.commissionType === 'percentage' ? `${r.value}%` : formatCurrency(r.value);
                      return (
                        <span key={i} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                          {label} {rate}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </DataCard>
          );
        })}
      </div>

      {advanceModal && (
        <ProfessionalAdvanceModal
          doctorId={advanceModal.doctorId}
          doctorName={advanceModal.doctorName}
          open={!!advanceModal}
          onClose={() => setAdvanceModal(null)}
        />
      )}
    </Box>
  );
};
