import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Typography,
} from '@mui/material';
import { AlertTriangle, Calendar, Ghost, MessageCircle, Sparkles, TrendingUp, UserCheck, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useRetention, RetentionLifecycle, RetentionPatient } from '../../hooks/useRetention';
import { useDoctorsContext } from '../../contexts/DoctorsContext';
import { IDoctor } from '../../utils/types/types';

// ─── Configuração visual de cada lifecycle ────────────────────────────────────

const LIFECYCLE_CONFIG: Record<RetentionLifecycle, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  emoji: string;
}> = {
  em_risco: {
    label: 'Em risco',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fca5a5',
    dot: 'bg-red-500',
    emoji: '🔴',
  },
  perdido: {
    label: 'Perdido',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#d1d5db',
    dot: 'bg-gray-400',
    emoji: '👻',
  },
  oscilando: {
    label: 'Oscilando',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fcd34d',
    dot: 'bg-yellow-500',
    emoji: '🟡',
  },
  novo: {
    label: 'Novo',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#93c5fd',
    dot: 'bg-blue-400',
    emoji: '🆕',
  },
  engajado: {
    label: 'Engajado',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#86efac',
    dot: 'bg-green-500',
    emoji: '🟢',
  },
};

// ─── Sub-componente: card de resumo do profissional ───────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  active?: boolean;
  onClick?: () => void;
}

function SummaryCard({ icon, label, value, color, bg, active, onClick }: SummaryCardProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        border: active ? `2px solid ${color}` : '2px solid transparent',
        bgcolor: active ? bg : 'grey.50',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        minWidth: 70,
        '&:hover': onClick ? { bgcolor: bg, borderColor: color } : {},
      }}
    >
      <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      <Typography variant="h6" fontWeight="bold" sx={{ color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── Sub-componente: barra de presença ───────────────────────────────────────

function AttendanceBar({ rate, sessions }: { rate: number; sessions: number }) {
  const pct = Math.round(rate * 100);
  const filled = Math.min(10, Math.round(rate * 10));
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-px">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2 rounded-sm ${i < filled ? 'bg-green-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {pct}% · {sessions} sessão{sessions !== 1 ? 'ões' : ''}
      </span>
    </div>
  );
}

// ─── Helper: formata número para link WhatsApp ────────────────────────────────

function formatWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function openWhatsApp(phone: string, name: string) {
  const number = formatWhatsApp(phone);
  if (!number) return;
  const msg = encodeURIComponent(`Olá, ${name.split(' ')[0]}! Tudo bem? Gostaríamos de agendar sua próxima sessão na Fono Inova.`);
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank', 'noopener');
}

// ─── Sub-componente: card do paciente ────────────────────────────────────────

function PatientCard({ patient }: { patient: RetentionPatient }) {
  const cfg = LIFECYCLE_CONFIG[patient.lifecycle];

  const nextLabel = patient.nextSessionAt
    ? new Date(patient.nextSessionAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
    : null;

  const lastLabel = patient.daysSinceLastSession !== null
    ? patient.daysSinceLastSession === 0
      ? 'hoje'
      : `${patient.daysSinceLastSession}d atrás`
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 2,
        bgcolor: cfg.bg,
        overflow: 'hidden',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: 2 },
      }}
    >
      {/* Coluna principal */}
      <Box sx={{ flex: 1, p: 1.5 }}>
        <div className="flex items-center justify-between mb-1">
          <Typography variant="body2" fontWeight="bold" color="text.primary" noWrap sx={{ maxWidth: 200 }}>
            {patient.patientName}
          </Typography>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
          >
            {cfg.emoji} {cfg.label}
          </span>
        </div>

        <AttendanceBar rate={patient.attendanceRate} sessions={patient.sessionsMonth} />

        {/* Linha de detalhes */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {patient.absencesMonth > 0 && (
            <span className="text-xs text-red-600 font-medium">
              ⚠️ {patient.absencesMonth} falta{patient.absencesMonth > 1 ? 's' : ''}
            </span>
          )}
          {lastLabel && (
            <span className="text-xs text-gray-500">🕐 {lastLabel}</span>
          )}
          {patient.packageRemaining > 0 && (
            <span className={`text-xs font-medium ${patient.packageRemaining <= 1 ? 'text-orange-600' : 'text-gray-600'}`}>
              📦 {patient.packageRemaining} restante{patient.packageRemaining !== 1 ? 's' : ''}
            </span>
          )}
          {nextLabel && (
            <span className="text-xs text-blue-600">📅 próx: {nextLabel}</span>
          )}
          {!nextLabel && patient.lifecycle !== 'novo' && (
            <span className="text-xs text-orange-500 font-medium">⚡ sem próxima sessão</span>
          )}
        </div>
      </Box>

      {/* Botão WhatsApp */}
      {patient.phone && (
        <button
          onClick={() => openWhatsApp(patient.phone, patient.patientName)}
          title={`WhatsApp: ${patient.patientName}`}
          className="flex-shrink-0 flex items-center justify-center w-10 bg-green-50 hover:bg-green-100 border-l border-green-200 transition-colors rounded-r-lg"
        >
          <MessageCircle size={18} className="text-green-600" />
        </button>
      )}
    </Box>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface CarteiraViewProps {
  doctors?: IDoctor[];
  currentMonth?: string;
}

type LifecycleFilter = 'todos' | RetentionLifecycle | 'orphan';

export default function CarteiraView({ doctors: doctorsProp, currentMonth: currentMonthProp }: CarteiraViewProps) {
  const { doctors: doctorsCtx } = useDoctorsContext();
  const doctors = doctorsProp ?? (doctorsCtx as unknown as IDoctor[]);
  const currentMonth = currentMonthProp ?? new Date().toISOString().slice(0, 7);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('todos');

  const { data, loading, error } = useRetention(selectedDoctorId, currentMonth);

  const orphanPatients = useMemo(() =>
    (data?.patients ?? []).filter(p => !p.nextSessionAt && p.lifecycle !== 'novo' && p.totalSessions > 0),
    [data?.patients]
  );

  const filteredPatients = useMemo(() => {
    if (!data?.patients) return [];
    if (lifecycleFilter === 'orphan') return orphanPatients;
    if (lifecycleFilter === 'todos') return data.patients;
    return data.patients.filter(p => p.lifecycle === lifecycleFilter);
  }, [data?.patients, lifecycleFilter, orphanPatients]);

  const attentionCount = data?.patients.filter(p => p.needsAttention).length ?? 0;

  const monthLabel = currentMonth
    ? new Date(`${currentMonth}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Controles ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} color="#00C087" />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Acompanhamento de Pacientes
          </Typography>
          {monthLabel && (
            <Typography variant="body2" color="text.secondary">
              · {monthLabel}
            </Typography>
          )}
          {attentionCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {attentionCount} requer atenção
            </span>
          )}
        </div>

        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Profissional</InputLabel>
          <Select
            value={selectedDoctorId}
            label="Profissional"
            onChange={e => {
              setSelectedDoctorId(e.target.value);
              setLifecycleFilter('todos');
            }}
          >
            <MenuItem value="">Todos os profissionais</MenuItem>
            {doctors.map(doc => (
              <MenuItem key={doc._id} value={doc._id}>
                {doc.fullName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <Box>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </div>
        </Box>
      )}

      {/* ── Erro ─────────────────────────────────────────────── */}
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar dados de retenção: {error}
        </Alert>
      )}

      {/* ── Estado vazio ─────────────────────────────────────── */}
      {!loading && !error && !data && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Users size={48} strokeWidth={1} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Selecione um profissional para ver a carteira de pacientes
          </Typography>
        </Box>
      )}

      {!loading && !error && data && (
        <>
          {/* ── Cards de resumo ─────────────────────────────── */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, p: 2, mb: 3 }}>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <SummaryCard
                icon={<Users size={18} />}
                label="Pacientes"
                value={data.summary.patients}
                color="#475569"
                bg="#f8fafc"
              />
              <SummaryCard
                icon={<UserCheck size={18} />}
                label="Engajados"
                value={data.summary.engajado}
                color="#16a34a"
                bg="#f0fdf4"
                active={lifecycleFilter === 'engajado'}
                onClick={() => setLifecycleFilter(lifecycleFilter === 'engajado' ? 'todos' : 'engajado')}
              />
              <SummaryCard
                icon={<AlertTriangle size={18} />}
                label="Oscilando"
                value={data.summary.oscilando}
                color="#d97706"
                bg="#fffbeb"
                active={lifecycleFilter === 'oscilando'}
                onClick={() => setLifecycleFilter(lifecycleFilter === 'oscilando' ? 'todos' : 'oscilando')}
              />
              <SummaryCard
                icon={<AlertTriangle size={18} />}
                label="Em risco"
                value={data.summary.em_risco}
                color="#dc2626"
                bg="#fef2f2"
                active={lifecycleFilter === 'em_risco'}
                onClick={() => setLifecycleFilter(lifecycleFilter === 'em_risco' ? 'todos' : 'em_risco')}
              />
              <SummaryCard
                icon={<Ghost size={18} />}
                label="Perdidos"
                value={data.summary.perdido}
                color="#6b7280"
                bg="#f9fafb"
                active={lifecycleFilter === 'perdido'}
                onClick={() => setLifecycleFilter(lifecycleFilter === 'perdido' ? 'todos' : 'perdido')}
              />
              <SummaryCard
                icon={<Sparkles size={18} />}
                label="Novos"
                value={data.summary.novo}
                color="#2563eb"
                bg="#eff6ff"
                active={lifecycleFilter === 'novo'}
                onClick={() => setLifecycleFilter(lifecycleFilter === 'novo' ? 'todos' : 'novo')}
              />
              <SummaryCard
                icon={<TrendingUp size={18} />}
                label="Retenção"
                value={`${data.summary.retentionRate}%`}
                color="#00C087"
                bg="#f0fdf4"
              />
              {orphanPatients.length > 0 && (
                <SummaryCard
                  icon={<AlertTriangle size={18} />}
                  label="Sem agenda"
                  value={orphanPatients.length}
                  color="#ea580c"
                  bg="#fff7ed"
                  active={lifecycleFilter === 'orphan'}
                  onClick={() => setLifecycleFilter(lifecycleFilter === 'orphan' ? 'todos' : 'orphan')}
                />
              )}
            </div>
          </Paper>

          {/* ── Banner pacientes órfãos ──────────────────────── */}
          {orphanPatients.length > 0 && lifecycleFilter !== 'orphan' && (
            <Box
              onClick={() => setLifecycleFilter('orphan')}
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid #fed7aa',
                bgcolor: '#fff7ed',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                '&:hover': { bgcolor: '#ffedd5' },
              }}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500 flex-shrink-0" />
                <div>
                  <span className="text-sm font-bold text-orange-800">
                    ⚡ {orphanPatients.length} paciente{orphanPatients.length > 1 ? 's' : ''} sem próxima sessão
                  </span>
                  <p className="text-xs text-orange-600 mt-0.5">
                    Têm histórico mas nenhuma consulta agendada · clique para ver
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-lg flex-shrink-0">
                Ver todos
              </span>
            </Box>
          )}

          {/* ── Lista de pacientes ───────────────────────────── */}
          {filteredPatients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Calendar size={36} strokeWidth={1} />
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                Nenhum paciente nesta categoria no período
              </Typography>
            </Box>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredPatients.map(patient => (
                <PatientCard key={patient.patientId} patient={patient} />
              ))}
            </div>
          )}
        </>
      )}
    </Box>
  );
}
