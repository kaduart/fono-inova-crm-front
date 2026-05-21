import {
  Alert,
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import { AlertTriangle, MessageCircle, RotateCcw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useRetentionSlots, RetentionSlot, SlotType } from '../../hooks/useRetentionSlots';
import { IDoctor } from '../../utils/types/types';

// ─── Config visual por tipo de slot ──────────────────────────────────────────

const SLOT_CFG: Record<SlotType, {
  label: string;
  color: string; bg: string; border: string; leftBar: string;
}> = {
  fixo:      { label: 'Fixo',      color: '#16a34a', bg: '#f0fdf4', border: '#86efac', leftBar: '#16a34a' },
  semi_fixo: { label: 'Semi-fixo', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', leftBar: '#d97706' },
  novo:      { label: 'Novo',      color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', leftBar: '#2563eb' },
  buraco:    { label: 'Buraco',    color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', leftBar: '#ef4444' },
};

const WEEKDAY_LABELS: Record<number, string> = {
  2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta',
};
const WEEKDAY_ORDER = [2, 3, 4, 5, 6];

const SPECIALTY_LABELS: Record<string, string> = {
  fonoaudiologia:      'Fonoaudiologia',
  terapia_ocupacional: 'Terapia Ocupacional',
  psicologia:          'Psicologia',
  fisioterapia:        'Fisioterapia',
  pediatria:           'Pediatria',
  neuroped:            'Neuropediatria',
  psicomotricidade:    'Psicomotricidade',
  musicoterapia:       'Musicoterapia',
  psicopedagogia:      'Psicopedagogia',
};

const GRID_COLS = '56px repeat(5, 1fr)';

// ─── WhatsApp helper ─────────────────────────────────────────────────────────

function openWhatsApp(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  const number = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá, ${name.split(' ')[0]}! Gostaríamos de agendar sua próxima sessão na Fono Inova.`
  );
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank', 'noopener');
}

// ─── Célula ativa ─────────────────────────────────────────────────────────────

function ActiveCell({ slot }: { slot: RetentionSlot }) {
  const cfg = SLOT_CFG[slot.type];
  const pct = Math.round(slot.attendanceRate * 100);
  const barColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
  const displayName = slot.currentPatientName
    ? slot.currentPatientName.split(' ').slice(0, 2).join(' ')
    : '—';
  const sessLabel = slot.recurrenceCount <= 1 ? '1ª vez' : `${slot.recurrenceCount} sess.`;
  const lastLabel = slot.daysSinceLastSession !== null
    ? slot.daysSinceLastSession === 0 ? 'hoje' : `${slot.daysSinceLastSession}d`
    : null;

  return (
    <Box sx={{
      height: '100%',
      borderLeft: `3px solid ${cfg.leftBar}`,
      border: `1px solid ${cfg.border}`,
      borderRadius: 1.5,
      bgcolor: cfg.bg,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
      '&:hover': { boxShadow: 2 },
    }}>
      <div className="px-1.5 py-1.5 flex flex-col gap-1.5 h-full">
        {/* Nome + WA */}
        <div className="flex items-start gap-1">
          <span className="text-[11px] font-semibold text-gray-800 truncate flex-1 leading-tight">
            {displayName}
          </span>
          {slot.currentPatientPhone && (
            <button
              onClick={() => openWhatsApp(slot.currentPatientPhone, slot.currentPatientName || '')}
              className="p-0.5 rounded hover:bg-green-100 transition-colors flex-shrink-0"
              title="WhatsApp"
            >
              <MessageCircle size={11} className="text-green-500" />
            </button>
          )}
        </div>

        {/* Presença + nº sessões */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', borderRadius: 9999 }} />
          </div>
          <span className="text-[9px] font-semibold tabular-nums" style={{ color: barColor }}>{pct}%</span>
          <span className="text-[9px] text-gray-400 tabular-nums">{sessLabel}</span>
        </div>

        {/* Badge + alertas + última visita */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[9px] font-semibold px-1 py-px rounded-full leading-tight"
            style={{ color: cfg.color, background: `${cfg.color}18` }}>
            {cfg.label}
          </span>
          {slot.packageRemaining > 0 && (
            <span className={`text-[9px] font-medium ${slot.packageRemaining <= 2 ? 'text-orange-600' : 'text-gray-400'}`}>
              📦 {slot.packageRemaining}
            </span>
          )}
          {!slot.nextSessionAt && (
            <span className="text-[9px] text-orange-500 font-semibold">⚡ sem agenda</span>
          )}
          {lastLabel && (
            <span className="text-[9px] text-gray-400 ml-auto">{lastLabel}</span>
          )}
        </div>
      </div>
    </Box>
  );
}

// ─── Célula vaga ──────────────────────────────────────────────────────────────

function VacantCell({ slot }: { slot: RetentionSlot }) {
  return (
    <Box sx={{
      height: '100%',
      borderLeft: '3px solid #ef4444',
      border: '1px dashed #fca5a5',
      borderRadius: 1.5,
      bgcolor: '#fff5f5',
      overflow: 'hidden',
    }}>
      <div className="px-1.5 py-1.5 flex flex-col gap-0.5 h-full justify-center">
        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Vago</span>
        {slot.lastPatientName && (
          <span className="text-[9px] text-gray-400 truncate">
            ↳ {slot.lastPatientName.split(' ')[0]}
          </span>
        )}
        {slot.avgSessionValue > 0 && (
          <span className="text-[9px] text-red-500 font-semibold">
            ≈ R${slot.avgSessionValue.toLocaleString('pt-BR')}
          </span>
        )}
        {slot.daysSinceVacant !== null && (
          <span className="text-[9px] text-red-400 tabular-nums">{slot.daysSinceVacant}d</span>
        )}
      </div>
    </Box>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface CarteiraWeeklyViewProps {
  doctors: IDoctor[];
}

export default function CarteiraWeeklyView({ doctors }: CarteiraWeeklyViewProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [days, setDays] = useState<number>(30);

  const { data, loading, error } = useRetentionSlots(selectedDoctorId, days);

  // Horários únicos ordenados (eixo Y da grade)
  const allTimes = useMemo(() => {
    if (!data) return [];
    const times = new Set<string>();
    for (const wd of WEEKDAY_ORDER) {
      for (const slot of data.weekdays[String(wd)] || []) {
        times.add(slot.time);
      }
    }
    return [...times].sort();
  }, [data]);

  const slotAt = (weekday: number, time: string): RetentionSlot | null => {
    if (!data) return null;
    return (data.weekdays[String(weekday)] || []).find(s => s.time === time) ?? null;
  };

  const allSlots = data ? Object.values(data.weekdays).flat() : [];
  const totalVacant = data?.summary.vacantSlots ?? 0;
  const totalAtRisk = allSlots.filter(s => s.needsAttention && !s.isVacant).length;
  const avgVacantValue = (() => {
    const vs = allSlots.filter(s => s.isVacant && s.avgSessionValue > 0);
    return vs.length > 0 ? vs.reduce((sum, s) => sum + s.avgSessionValue, 0) / vs.length : 0;
  })();

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Controles ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <RotateCcw size={18} color="#00C087" />
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Recorrência Semanal
          </Typography>
          {data?.doctor?.specialty && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
              {SPECIALTY_LABELS[data.doctor.specialty] ?? data.doctor.specialty}
            </span>
          )}
          {totalVacant > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {totalVacant} buraco{totalVacant > 1 ? 's' : ''}
            </span>
          )}
          {totalAtRisk > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
              {totalAtRisk} em atenção
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-[#00C087] text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#00C087] hover:text-[#00C087]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Profissional</InputLabel>
            <Select
              value={selectedDoctorId}
              label="Profissional"
              onChange={e => setSelectedDoctorId(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {doctors.map(doc => (
                <MenuItem key={doc._id} value={doc._id}>{doc.fullName}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      {/* ── Banner buracos ────────────────────────────────── */}
      {totalVacant > 0 && !loading && (
        <Box sx={{
          mb: 2, p: 1.5, borderRadius: 2,
          border: '1px solid #fca5a5', bgcolor: '#fef2f2',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <div>
            <span className="text-sm font-bold text-red-800">
              {totalVacant} horário{totalVacant > 1 ? 's' : ''} recorrente{totalVacant > 1 ? 's' : ''} perdido{totalVacant > 1 ? 's' : ''}
            </span>
            {avgVacantValue > 0 && (
              <p className="text-xs text-red-600 mt-0.5">
                Receita potencial: ≈ R$ {Math.round(totalVacant * avgVacantValue).toLocaleString('pt-BR')}/mês
              </p>
            )}
          </div>
        </Box>
      )}

      {/* ── Loading ───────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8 }}>
          <div />
          {WEEKDAY_ORDER.map(d => <Skeleton key={d} variant="text" width="80%" height={28} />)}
          {Array.from({ length: 8 }).flatMap((_, row) => [
            <Skeleton key={`t${row}`} variant="text" width={36} height={20} sx={{ justifySelf: 'end' }} />,
            ...WEEKDAY_ORDER.map(d => (
              <Skeleton key={`${d}_${row}`} variant="rounded" height={80} />
            )),
          ])}
        </div>
      )}

      {/* ── Erro ─────────────────────────────────────────── */}
      {error && !loading && (
        <Alert severity="error">Erro ao carregar grade: {error}</Alert>
      )}

      {/* ── Estado vazio ─────────────────────────────────── */}
      {!loading && !error && !data && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <RotateCcw size={40} strokeWidth={1} />
          <Typography variant="body1" sx={{ mt: 2 }}>
            Selecione um profissional para ver a grade semanal
          </Typography>
        </Box>
      )}

      {/* ── Grade timetable ───────────────────────────────── */}
      {!loading && !error && data && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, overflowX: 'auto' }}>
          <div style={{ minWidth: 600 }}>

            {/* Cabeçalho com dias + barras de ocupação */}
            <div
              className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl"
              style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8 }}
            >
              <div /> {/* coluna de horário */}
              {WEEKDAY_ORDER.map((wd, i) => {
                const occ = data.occupancyByDay[String(wd)] || { active: 0, vacant: 0, total: 0, rate: 0 };
                const barColor = occ.rate >= 80 ? '#16a34a' : occ.rate >= 60 ? '#d97706' : '#ef4444';
                const notLast = i < WEEKDAY_ORDER.length - 1;
                return (
                  <div key={wd} className="flex flex-col gap-1"
                    style={notLast ? { borderRight: '1px dashed #94a3b8', paddingRight: 8 } : {}}
                  >
                    <div className="flex items-center justify-between">
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        color="text.secondary"
                        sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 10 }}
                      >
                        {WEEKDAY_LABELS[wd]}
                      </Typography>
                      {occ.vacant > 0 && (
                        <Tooltip title={`${occ.vacant} buraco${occ.vacant > 1 ? 's' : ''}`}>
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1 rounded-full cursor-default">
                            {occ.vacant}⚫
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${occ.rate}%`, backgroundColor: barColor }}
                          className="h-full rounded-full"
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 tabular-nums whitespace-nowrap">
                        {occ.active}/{occ.total}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas por horário */}
            <div className="flex flex-col">
              {allTimes.map((time, idx) => (
                <div
                  key={time}
                  style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8, minHeight: 84, background: idx % 2 === 0 ? '#ffffff' : '#dde3ed' }}
                  className="px-3 py-2"
                >
                  {/* Label do horário */}
                  <div className="flex items-start justify-end pr-2 pt-2">
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      color="text.disabled"
                      sx={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1 }}
                    >
                      {time}
                    </Typography>
                  </div>

                  {/* Célula por dia */}
                  {WEEKDAY_ORDER.map((wd, colIdx) => {
                    const slot = slotAt(wd, time);
                    const notLast = colIdx < WEEKDAY_ORDER.length - 1;
                    return (
                      <div key={wd} style={{ minHeight: 80, ...(notLast ? { borderRight: '1px dashed #94a3b8', paddingRight: 6 } : {}) }}>
                        {slot ? (
                          slot.isVacant
                            ? <VacantCell slot={slot} />
                            : <ActiveCell slot={slot} />
                        ) : (
                          <div className="min-h-[80px]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

          </div>
        </Paper>
      )}
    </Box>
  );
}
