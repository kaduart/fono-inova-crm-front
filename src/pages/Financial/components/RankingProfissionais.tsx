// frontend/src/pages/Financial/components/RankingProfissionais.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Avatar, LinearProgress, Chip
} from '@mui/material';
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { Trophy, Users, TrendingUp, WalletCards } from 'lucide-react';
import { ProfessionalRankingItem } from '../../../services/professionalResultsService';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { ProfessionalAdvanceModal } from '../../../components/financial/ProfessionalAdvanceModal';

const formatCurrency = (value: number) => {
  return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface RankingProfissionaisProps {
  data?: ProfessionalRankingItem[];
  loading?: boolean;
  onRowClick?: (doctorId: string) => void;
  title?: string;
}

interface NormalizedRow {
  doctorId: string;
  doctorName: string;
  specialty: string;
  patientsTotal: number;
  productionTotal: number;
  receivedTotal: number;
  commission: number;
  advances: number;
  balance: number;
  receivablesTotal: number;
  rank?: number;
}

export const RankingProfissionais: React.FC<RankingProfissionaisProps> = ({
  data,
  loading,
  onRowClick,
  title = 'Ranking de Profissionais'
}) => {
  const { doctors, loadingDoctors, fetchDoctors } = useFinancialAnalytics();
  const [advanceModal, setAdvanceModal] = useState<{ doctorId: string; doctorName: string } | null>(null);

  const refreshDoctors = () => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    fetchDoctors({ from, to });
  };

  useEffect(() => {
    if (data) return;
    refreshDoctors();
  }, [fetchDoctors, data]);

  const rows: NormalizedRow[] = useMemo(() => {
    const source = data ?? doctors.map((doc) => ({
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
      advances: doc.advances ?? 0,
      balance: doc.balance ?? 0,
      receivablesTotal: doc.receivables?.total ?? 0,
      rank: doc.rank ?? index + 1
    }));
  }, [data, doctors]);

  const isLoading = loading ?? (loadingDoctors && doctors.length === 0);

  const maxProduction = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.max(...rows.map(r => r.productionTotal));
  }, [rows]);

  if (isLoading) {
    return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return '#9CA3AF';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return '#FFFBE6';
    if (rank === 2) return '#F9FAFB';
    if (rank === 3) return '#FFF7ED';
    return '#FFFFFF';
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Trophy color="#FFD700" size={28} />
        <Typography variant="h5" fontWeight="bold" color="grey.800">
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((doc) => {
          const performance = maxProduction > 0 ? Math.round((doc.productionTotal / maxProduction) * 100) : 0;
          const initials = doc.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

          return (
            <Box
              key={doc.doctorId}
              onClick={() => onRowClick?.(doc.doctorId)}
              sx={{
                p: 2,
                bgcolor: getRankBg(doc.rank!),
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                '&:hover': onRowClick ? { boxShadow: 2, borderColor: 'primary.main' } : {}
              }}
            >
              {/* Linha 1: Rank + Avatar + Nome + Botão */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box sx={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: getRankColor(doc.rank!),
                  color: doc.rank! <= 3 ? '#1F2937' : '#FFFFFF',
                  fontWeight: 'bold', fontSize: '0.78rem'
                }}>
                  #{doc.rank}
                </Box>
                <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.light', fontSize: '0.82rem', fontWeight: 600, flexShrink: 0 }}>
                  {initials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight="600" color="grey.900" sx={{ fontSize: '0.88rem', lineHeight: 1.2 }}>
                    {doc.doctorName}
                  </Typography>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
                    {doc.specialty}
                  </Typography>
                </Box>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdvanceModal({ doctorId: doc.doctorId, doctorName: doc.doctorName });
                  }}
                  title="Registrar adiantamento"
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '5px 10px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#4B5563',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366F1'; (e.currentTarget as HTMLButtonElement).style.color = '#6366F1'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLButtonElement).style.color = '#4B5563'; }}
                >
                  <WalletCards size={13} />
                  <span>Adiantamento</span>
                </button>
              </Box>

              {/* Linha 2: Métricas — 3 colunas no mobile, 6 no desktop */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' },
                gap: { xs: 1, sm: 1.5 },
                mb: 1.5,
                py: 1.5,
                px: 1,
                bgcolor: 'rgba(0,0,0,0.02)',
                borderRadius: 1.5,
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Produção</Typography>
                  <Typography fontWeight="bold" color="success.main" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {formatCurrency(doc.productionTotal)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Recebido</Typography>
                  <Typography fontWeight="500" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {formatCurrency(doc.receivedTotal)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Comissão</Typography>
                  <Typography fontWeight="500" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {formatCurrency(doc.commission)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Adiantamentos</Typography>
                  <Typography fontWeight="500" color={doc.advances > 0 ? 'error.main' : 'text.secondary'} sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {doc.advances > 0 ? `- ${formatCurrency(doc.advances)}` : '—'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>Saldo</Typography>
                  <Typography fontWeight="600" color={doc.balance >= 0 ? 'success.main' : 'error.main'} sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {formatCurrency(doc.balance)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>A Receber</Typography>
                  <Typography fontWeight="500" color="warning.main" sx={{ fontSize: { xs: '0.75rem', sm: '0.82rem' } }}>
                    {formatCurrency(doc.receivablesTotal)}
                  </Typography>
                </Box>
              </Box>

              {/* Linha 3: Desempenho + Pacientes */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <TrendingUp size={13} color={performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444'} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>Desempenho</Typography>
                    <Typography variant="caption" fontWeight="bold" sx={{ ml: 'auto', fontSize: '0.68rem' }}>
                      {performance}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={performance}
                    sx={{
                      height: 5, borderRadius: 3, bgcolor: 'grey.100',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444'
                      }
                    }}
                  />
                </Box>
                <Chip
                  icon={<Users size={12} />}
                  label={doc.patientsTotal}
                  size="small"
                  sx={{ minWidth: 64, justifyContent: 'flex-start', flexShrink: 0 }}
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      {advanceModal && (
        <ProfessionalAdvanceModal
          open={!!advanceModal}
          doctorId={advanceModal.doctorId}
          doctorName={advanceModal.doctorName}
          onClose={() => setAdvanceModal(null)}
          onSuccess={refreshDoctors}
        />
      )}
    </Box>
  );
};
