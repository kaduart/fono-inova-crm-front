import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
} from '@mui/material';
import { AlertTriangle, MessageCircle, RotateCcw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useRetentionSlots, RetentionSlot, SlotType } from '../../hooks/useRetentionSlots';
import { IDoctor } from '../../utils/types/types';

const SLOT_CFG: Record<SlotType, {
  label: string;
  color: string; bg: string; border: string; leftBar: string;
  badgeBg: string;
}> = {
  fixo:      { label: 'Fixo',      color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', leftBar: '#16a34a', badgeBg: '#dcfce7' },
  semi_fixo: { label: 'Semi-fixo', color: '#b45309', bg: '#fffbeb', border: '#fde68a', leftBar: '#d97706', badgeBg: '#fef3c7' },
  novo:      { label: 'Novo',      color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', leftBar: '#3b82f6', badgeBg: '#dbeafe' },
  buraco:    { label: 'Buraco',    color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', leftBar: '#ef4444', badgeBg: '#f3f4f6' },
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

const GRID_COLS = '44px repeat(5, 1fr)';
const TOTAL_DAILY_SLOTS = 16; // slots de 40min de 8h às 18h

// Retorna a data (Date) do dia da semana atual para o weekday no formato mongo (2=seg…6=sex)
function getWeekDate(mongoWeekday: number): Date {
  const today = new Date();
  const jsDay = today.getDay(); // 0=dom, 1=seg…
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const targetJsDay = mongoWeekday - 1; // mongo 2→js 1 (seg)
  const result = new Date(monday);
  result.setDate(monday.getDate() + (targetJsDay - 1));
  return result;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const TODAY_MONGO_WEEKDAY = (() => {
  const js = new Date().getDay(); // 0=dom
  return js === 0 ? 1 : js + 1;  // converte para mongo (dom=1, seg=2…)
})();

// WhatsApp helper (mantido igual)
function openWhatsApp(phone: string, name: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return;
  const number = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  const msg = encodeURIComponent(
    `Olá, ${name.split(' ')[0]}! Gostaríamos de agendar sua próxima sessão na Fono Inova.`
  );
  window.open(`https://wa.me/${number}?text=${msg}`, '_blank', 'noopener');
}

function ActiveCell({ slot }: { slot: RetentionSlot }) {
  const cfg = SLOT_CFG[slot.type];
  const pct = Math.round(slot.attendanceRate * 100);
  const barColor = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
  const displayName = slot.currentPatientName
    ? slot.currentPatientName.split(' ').slice(0, 2).join(' ')
    : '—';
  const totalAtend = slot.recurrenceCount <= 1 ? '1ª consulta' : `${slot.recurrenceCount} atend.`;
  const lastLabel = slot.daysSinceLastSession !== null
    ? slot.daysSinceLastSession === 0 ? 'ult. hoje' : `ult. há ${slot.daysSinceLastSession}d`
    : null;

  return (
    <div
      className="h-full rounded-lg overflow-hidden transition-all hover:shadow-md hover:-translate-y-px cursor-default"
      style={{
        borderLeft: `3px solid ${cfg.leftBar}`,
        border: `1px solid ${cfg.border}`,
        borderLeftWidth: 3,
        backgroundColor: cfg.bg,
      }}
    >
      <div className="px-4 py-4 flex flex-col gap-3 h-full">

        {/* Linha 1: Nome + WhatsApp */}
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="text-[14px] font-bold text-gray-800 truncate leading-tight">
            {displayName}
          </span>
          {slot.currentPatientPhone && (
            <button
              onClick={() => openWhatsApp(slot.currentPatientPhone, slot.currentPatientName || '')}
              className="p-1 rounded-full hover:bg-green-100 transition-colors flex-shrink-0"
              title="Enviar WhatsApp"
            >
              <MessageCircle size={14} className="text-green-500" />
            </button>
          )}
        </div>

        {/* Linha 2: rótulo "presença" + total atendimentos */}
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-gray-400 font-medium uppercase tracking-wide">presença</span>
          <span className="text-[14px] text-gray-400 tabular-nums">{totalAtend}</span>
        </div>

        {/* Linha 3: barra + % */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div style={{ width: `${pct}%`, backgroundColor: barColor, height: '100%', borderRadius: 9999 }} />
            {/* 5 divisões de 20% */}
            {[20, 40, 60, 80].map(tick => (
              <div key={tick} className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: `${tick}%` }} />
            ))}
          </div>
          <span className="text-[14px] font-extrabold tabular-nums w-8 text-right leading-none" style={{ color: barColor }}>
            {pct}%
          </span>
        </div>

        {/* Linha 4: tipo de vínculo + alertas + última visita */}
        <div className="flex items-center gap-1 flex-wrap mt-auto">
          <span
            className="text-[14px] font-bold px-1.5 py-0.5 rounded-full leading-none"
            style={{ color: cfg.color, backgroundColor: cfg.badgeBg }}
          >
            {cfg.label}
          </span>

          {slot.packageRemaining > 0 && (
            <span
              className={`text-[14px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                slot.packageRemaining <= 2
                  ? 'text-orange-700 bg-orange-100'
                  : 'text-gray-500 bg-gray-100'
              }`}
              title="Sessões restantes no pacote"
            >
              {slot.packageRemaining} restantes
            </span>
          )}

          {!slot.nextSessionAt && (
            <span className="text-[14px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full leading-none">
              sem próx. sessão
            </span>
          )}

          {lastLabel && (
            <span className="text-[14px] text-gray-400 ml-auto tabular-nums" title="Última sessão realizada">
              {lastLabel}
            </span>
          )}
        </div>

      </div>
    </div>
  );
}

function VacantCell({ slot }: { slot: RetentionSlot }) {
  return (
    <div
      className="h-full rounded-lg overflow-hidden"
      style={{
        borderLeft: '3px solid #ef4444',
        border: '1px dashed #fca5a5',
        borderLeftWidth: 3,
        backgroundColor: '#fff5f5',
      }}
    >
      <div className="px-4 py-4 flex flex-col gap-3 h-full justify-center">
        <span className="text-[14px] font-bold text-red-600 uppercase tracking-widest">Vago</span>
        {slot.lastPatientName && (
          <span className="text-[14px] text-gray-500 truncate">
            ↳ {slot.lastPatientName.split(' ')[0]}
          </span>
        )}
        {slot.avgSessionValue > 0 && (
          <span className="text-[14px] font-semibold text-red-500">
            ≈ R${slot.avgSessionValue.toLocaleString('pt-BR')}
          </span>
        )}
        {slot.daysSinceVacant !== null && (
          <span className="text-[15px] text-red-400 tabular-nums font-medium">{slot.daysSinceVacant}d</span>
        )}
      </div>
    </div>
  );
}

// Componente principal (mantidas todas as variáveis, hooks, lógica de datas, tudo)
export default function CarteiraWeeklyView({ doctors }: CarteiraWeeklyViewProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [days, setDays] = useState<number>(30);

  const { data, loading, error } = useRetentionSlots(selectedDoctorId, days);

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

  // (mantenha todo o resto exatamente igual até o return)

  return (
    <div className="p-3">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <RotateCcw size={18} color="#00C087" />
          <span className="text-lg font-bold text-gray-800">Recorrência Semanal</span>
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

      {/* Banner buracos */}
      {totalVacant > 0 && !loading && (
        <div className="mb-2 p-1.5 rounded-lg border border-red-200 bg-red-50 flex items-center gap-1.5">
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
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: GRID_COLS, gap: 8 }}>
          <div />
          {WEEKDAY_ORDER.map(d => <Skeleton key={d} variant="text" width="80%" height={28} />)}
          {Array.from({ length: 8 }).flatMap((_, row) => [
            <Skeleton key={`t${row}`} variant="text" width={36} height={20} style={{ justifySelf: 'end' }} />,
            ...WEEKDAY_ORDER.map(d => (
              <Skeleton key={`${d}_${row}`} variant="rounded" height={80} />
            )),
          ])}
        </div>
      )}

      {/* Erro */}
      {error && !loading && (
        <Alert severity="error">Erro ao carregar grade: {error}</Alert>
      )}

      {/* Estado vazio */}
      {!loading && !error && !data && (
        <div className="text-center py-8 text-gray-500">
          <RotateCcw size={40} strokeWidth={1} />
          <p className="mt-2">Selecione um profissional para ver a grade semanal</p>
        </div>
      )}

      {/* Grade principal */}
      {!loading && !error && data && (
        <div
          className="border border-gray-200 rounded-xl shadow-sm"
          style={{ overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}
        >
          <div style={{ minWidth: 640 }}>
            {/* Cabeçalho dos dias — sticky */}
            <div
              className="px-4 py-3 border-b-2 border-gray-200 bg-white rounded-t-xl"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: 8,
                position: 'sticky',
                top: 0,
                zIndex: 20,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div />
              {WEEKDAY_ORDER.map((wd) => {
                const occ        = data.occupancyByDay[String(wd)] || { active: 0, vacant: 0, total: 0, rate: 0 };
                // Taxa real: slots com paciente (ativo + vago) ÷ 16 slots possíveis (8h–18h)
                const filled     = occ.total;
                const rate       = Math.min(100, Math.round((filled / TOTAL_DAILY_SLOTS) * 100));
                const isToday = wd === TODAY_MONGO_WEEKDAY;
                const isGood  = rate >= 80;
                const isMid   = rate >= 60 && rate < 80;
                const barColor   = isGood ? '#16a34a' : isMid ? '#d97706' : '#ef4444';
                const cardBg     = isToday ? '#eff6ff' : isGood ? '#f0fdf4' : isMid ? '#fffbeb' : '#f9fafb';
                const cardBorder = isToday ? '#93c5fd' : isGood ? '#bbf7d0' : isMid ? '#fde68a' : '#e5e7eb';
                const rateColor  = isGood ? '#15803d' : isMid ? '#b45309' : '#dc2626';
                const weekDate   = getWeekDate(wd);
                const dateLabel  = formatShortDate(weekDate);
                return (
                  <div
                    key={wd}
                    className="rounded-xl px-3 py-2.5 flex flex-col gap-2"
                    style={{
                      backgroundColor: cardBg,
                      border: `1.5px solid ${cardBorder}`,
                      boxShadow: isToday ? '0 0 0 3px #bfdbfe44' : undefined,
                    }}
                  >
                    {/* Linha 1: nome do dia + data + "hoje" */}
                    <div className="flex items-center justify-between gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[14px] font-extrabold text-gray-700 uppercase tracking-wide leading-none">
                          {WEEKDAY_LABELS[wd].slice(0, 3)}
                        </span>
                        <span className="text-[15px] text-gray-400 font-medium">{dateLabel}</span>
                        {isToday && (
                          <span className="text-[14px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded leading-none">
                            hoje
                          </span>
                        )}
                      </div>
                      {occ.vacant > 0 && (
                        <Tooltip title={`${occ.vacant} horário${occ.vacant > 1 ? 's' : ''} sem paciente`}>
                          <span className="text-[15px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full cursor-default leading-none flex-shrink-0">
                            {occ.vacant} vago{occ.vacant > 1 ? 's' : ''}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {/* Linha 2: % slots preenchidos + contagem */}
                    <div className="flex items-end justify-between gap-1">
                      <div className="flex flex-col leading-none">
                        <span className="text-[14px] text-gray-400 font-medium mb-0.5">horários preenchidos</span>
                        <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: rateColor }}>
                          {rate}%
                        </span>
                      </div>
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-[15px] text-gray-400 font-medium mb-0.5">horários</span>
                        <span className="text-sm font-bold text-gray-700 tabular-nums">
                          {filled}<span className="text-gray-400 font-normal">/{TOTAL_DAILY_SLOTS}</span>
                        </span>
                      </div>
                    </div>

                    {/* Barra de ocupação */}
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${rate}%`, backgroundColor: barColor }}
                        className="h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linhas por horário */}
            <div className="flex flex-col divide-y divide-gray-100">
              {allTimes.map((time, idx) => (
                <div
                  key={time}
                  className="px-4 py-2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    gap: 10,
                    minHeight: 140,
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}
                >
                  {/* Horário */}
                  <div className="flex items-center justify-end pr-2">
                    <span className="text-xs font-mono font-semibold text-gray-400">{time}</span>
                  </div>
                  {/* Células */}
                  {WEEKDAY_ORDER.map((wd, colIdx) => {
                    const slot = slotAt(wd, time);
                    const notLast = colIdx < WEEKDAY_ORDER.length - 1;
                    return (
                      <div
                        key={wd}
                        style={{
                          minHeight: 130,
                          borderRight: notLast ? '2px dashed #cbd5e1' : undefined,
                          paddingRight: notLast ? 8 : undefined,
                        }}
                      >
                        {slot ? (
                          slot.isVacant
                            ? <VacantCell slot={slot} />
                            : <ActiveCell slot={slot} />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}