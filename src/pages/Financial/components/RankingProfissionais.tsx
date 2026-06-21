// frontend/src/pages/Financial/components/RankingProfissionais.tsx
import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Avatar, LinearProgress, Chip
} from '@mui/material';
import { useDoctorsAnalytics } from '../../../hooks/useSpecialtiesAnalytics';
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

export const RankingProfissionais: React.FC<RankingProfissionaisProps> = ({
  data,
  loading,
  onRowClick,
  title = 'Ranking de Profissionais'
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
    return <LoadingSpinner centered size="medium" color="border-emerald-600" className="min-h-[200px]" />;
  }

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

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>

      {/* Resumo global da clínica */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {[
            {
              label: 'Pacientes no mês',
              sublabel: 'pacientes únicos atendidos',
              value: String(totals.patients),
              color: '#3b82f6',
            },
            {
              label: 'Atendimentos no mês',
              sublabel: 'sessões concluídas (1 paciente pode ter várias)',
              value: String(totals.sessions),
              color: '#06b6d4',
            },
            {
              label: 'Produção total',
              sublabel: 'soma das produções dos profissionais',
              value: formatCurrency(totals.production),
              color: '#10b981',
            },
            {
              label: 'Recebido total',
              sublabel: 'caixa efetivamente recebido no período',
              value: formatCurrency(totals.received),
              color: '#6366f1',
            },
            {
              label: 'Comissão total',
              sublabel: 'soma das comissões de todos os profissionais',
              value: formatCurrency(totals.commission),
              color: '#8b5cf6',
            },
            {
              label: 'Adiantamentos',
              sublabel: 'valores antecipados aos profissionais',
              value: formatCurrency(totals.advances),
              color: '#ef4444',
            },
            {
              label: 'A receber',
              sublabel: 'produção ainda não paga pelos pacientes',
              value: formatCurrency(totals.receivables),
              color: '#f59e0b',
            },
          ].map(item => (
            <div key={item.label} className="text-center group relative">
              <div className="text-[10px] text-gray-500 leading-tight mb-0.5 font-medium">{item.label}</div>
              <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[9px] text-gray-400 leading-tight mt-0.5">{item.sublabel}</div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {rows.map((doc) => {
          const performance = maxProduction > 0 ? Math.round((doc.productionTotal / maxProduction) * 100) : 0;
          const initials = doc.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

          return (
            <div
              key={doc.doctorId}
              onClick={() => onRowClick?.(doc.doctorId)}
              className="bg-white rounded-lg border border-gray-200 p-3 transition-all hover:border-gray-300"
              style={{ backgroundColor: getRankBg(doc.rank!) }}
            >
              {/* Linha 1: Rank + Avatar + Nome + Botão */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: getRankColor(doc.rank!), color: doc.rank! <= 3 ? '#1F2937' : '#FFFFFF' }}
                >
                  {doc.rank}
                </div>
                <Avatar className="w-8 h-8 text-xs font-semibold flex-shrink-0" sx={{ bgcolor: '#E0E7FF', color: '#4F46E5' }}>
                  {initials}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{doc.doctorName}</div>
                  <div className="text-xs text-gray-500 capitalize">{doc.specialty}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdvanceModal({ doctorId: doc.doctorId, doctorName: doc.doctorName });
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-gray-200 bg-white text-xs font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  <WalletCards className="w-3 h-3" />
                  <span>Adiantamento</span>
                </button>
              </div>

              {/* Linha 2: Métricas - grid responsivo */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 py-1.5 px-1 mb-2 bg-gray-50 rounded-md">
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">Produção</div>
                  <div className="text-xs font-semibold text-emerald-600">{formatCurrency(doc.productionTotal)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">Recebido</div>
                  <div className="text-xs font-medium text-gray-700">{formatCurrency(doc.receivedTotal)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">Comissão</div>
                  <div className="text-xs font-medium text-gray-700">{formatCurrency(doc.commission)}</div>
                  {doc.commissionRates.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                      {doc.commissionRates.map((r, i) => {
                        const label = r.billingType === 'all' ? 'Geral' : r.billingType === 'particular' ? 'Part.' : r.billingType === 'convenio' ? 'Conv.' : r.billingType === 'liminar' ? 'Lim.' : r.billingType === 'package' ? 'Pac.' : r.billingType;
                        const rate = r.commissionType === 'percentage' ? `${r.value}%` : formatCurrency(r.value);
                        return (
                          <span key={i} className="text-[8px] bg-purple-50 text-purple-600 px-1 rounded font-medium leading-tight">
                            {label} {rate}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">Adiantamento</div>
                  <div className={`text-xs font-medium ${doc.advances > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {doc.advances > 0 ? `- ${formatCurrency(doc.advances)}` : '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">Saldo</div>
                  <div className={`text-xs font-semibold ${doc.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(doc.balance)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-gray-400 uppercase leading-tight">A Receber</div>
                  <div className="text-xs font-medium text-amber-600">{formatCurrency(doc.receivablesTotal)}</div>
                </div>
              </div>

              {/* Linha 3: Desempenho + Pacientes */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" style={{ color: performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444' }} />
                      <span className="text-[9px] text-gray-500">Desempenho</span>
                    </div>
                    <span className="text-[9px] font-medium text-gray-600">{performance}%</span>
                  </div>
                  <LinearProgress
                    variant="determinate"
                    value={performance}
                    className="h-1 rounded-full"
                    sx={{
                      bgcolor: '#E5E7EB',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: performance >= 80 ? '#10B981' : performance >= 50 ? '#F59E0B' : '#EF4444',
                        borderRadius: '9999px'
                      }
                    }}
                  />
                </div>
                <Chip
                  icon={<Users className="w-3 h-3" />}
                  label={doc.patientsTotal}
                  size="small"
                  className="bg-gray-100 text-gray-600 text-[10px]"
                  sx={{ height: 22, fontSize: '0.65rem', '& .MuiChip-icon': { marginLeft: '4px' } }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {advanceModal && (
        <ProfessionalAdvanceModal
          open={!!advanceModal}
          doctorId={advanceModal.doctorId}
          doctorName={advanceModal.doctorName}
          onClose={() => setAdvanceModal(null)}
          onSuccess={refreshDoctors}
        />
      )}
    </div>
  );
};