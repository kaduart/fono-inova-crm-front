// Aba Acompanhamento da Agenda (mock aprovado em 30/10): aviso de "sem próxima sessão" no topo,
// números como chips que filtram, retenção em destaque e pacientes em tabela. Sem emojis.
import { AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useRetention, RetentionLifecycle, RetentionPatient } from '../../hooks/useRetention';
import { useDoctorsContext } from '../../contexts/DoctorsContext';
import { IDoctor } from '../../utils/types/types';
import { Chip } from './agenda/AgendaParts';
import { WA_TAB } from '../commercial/commercialCopy';

const LIFECYCLE: Record<RetentionLifecycle, { label: string; plural: string; dot: string }> = {
  engajado: { label: 'Engajado', plural: 'Engajados', dot: '#1baf7a' },
  oscilando: { label: 'Oscilando', plural: 'Oscilando', dot: '#eda100' },
  em_risco: { label: 'Em risco', plural: 'Em risco', dot: '#e5484d' },
  perdido: { label: 'Perdido', plural: 'Perdidos', dot: '#94a3b8' },
  novo: { label: 'Novo', plural: 'Novos', dot: '#2a78d6' },
};

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
  window.open(`https://wa.me/${number}?text=${msg}`, WA_TAB);
}

const fmtDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '') : '';

function AttendanceBar({ rate }: { rate: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(rate) || 0) * 100)));
  const color = pct >= 80 ? '#1baf7a' : pct >= 60 ? '#eda100' : '#e5484d';
  return (
    <div className="flex items-center gap-2" title={`Presença ${pct}%`}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-9 text-xs tabular-nums text-gray-700">{pct}%</span>
    </div>
  );
}

function PatientRow({ p }: { p: RetentionPatient }) {
  const cfg = LIFECYCLE[p.lifecycle] || LIFECYCLE.novo;
  const orphan = !p.nextSessionAt && p.lifecycle !== 'novo' && p.totalSessions > 0;
  const last = p.daysSinceLastSession === null ? '—' : p.daysSinceLastSession === 0 ? 'hoje' : `há ${p.daysSinceLastSession} d`;
  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <td className="py-2 pl-3 pr-2">
        <span className="block text-sm font-semibold text-gray-900">{p.patientName}</span>
        <span className="text-xs text-gray-500">{p.sessionsMonth} {p.sessionsMonth === 1 ? 'sessão' : 'sessões'} no mês</span>
      </td>
      <td className="px-2 py-2">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-gray-700">
          <span className="h-2 w-2 rounded-full" style={{ background: cfg.dot }} aria-hidden />{cfg.label}
        </span>
      </td>
      <td className="px-2 py-2"><AttendanceBar rate={p.attendanceRate} /></td>
      <td className={`px-2 py-2 text-sm tabular-nums ${p.absencesMonth > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{p.absencesMonth || '—'}</td>
      <td className="whitespace-nowrap px-2 py-2 text-sm text-gray-700">{last}</td>
      <td className="whitespace-nowrap px-2 py-2 text-sm">
        {p.nextSessionAt
          ? <span className="text-gray-700">{fmtDay(p.nextSessionAt)}</span>
          : orphan ? <span className="font-semibold text-amber-700">sem próxima</span> : <span className="text-gray-500">—</span>}
      </td>
      <td className={`whitespace-nowrap px-2 py-2 text-sm tabular-nums ${p.packageRemaining > 0 && p.packageRemaining <= 1 ? 'font-semibold text-amber-700' : 'text-gray-700'}`}>
        {p.packageRemaining > 0 ? `${p.packageRemaining} ${p.packageRemaining === 1 ? 'restante' : 'restantes'}` : '—'}
      </td>
      <td className="py-2 pl-2 pr-3 text-right">
        {p.phone ? (
          <button type="button" onClick={() => openWhatsApp(p.phone, p.patientName)} title={`WhatsApp: ${p.patientName}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <MessageCircle size={14} aria-hidden /> WhatsApp
          </button>
        ) : <span className="text-xs text-gray-500">sem telefone</span>}
      </td>
    </tr>
  );
}

interface CarteiraViewProps {
  doctors?: IDoctor[];
  currentMonth?: string;
}

type LifecycleFilter = 'todos' | RetentionLifecycle | 'orphan';

export default function CarteiraView({ doctors: doctorsProp, currentMonth: currentMonthProp }: CarteiraViewProps) {
  const { doctors: doctorsCtx } = useDoctorsContext();
  const doctors = doctorsProp ?? (doctorsCtx as unknown as IDoctor[]) ?? [];
  const currentMonth = currentMonthProp ?? new Date().toISOString().slice(0, 7);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('todos');

  const { data, loading, error, reload } = useRetention(selectedDoctorId, currentMonth);
  const patients = data?.patients ?? [];

  const orphanPatients = useMemo(
    () => patients.filter(p => !p.nextSessionAt && p.lifecycle !== 'novo' && p.totalSessions > 0),
    [patients]
  );

  const filteredPatients = useMemo(() => {
    const list = lifecycleFilter === 'orphan' ? orphanPatients
      : lifecycleFilter === 'todos' ? patients
        : patients.filter(p => p.lifecycle === lifecycleFilter);
    // Quem pede atenção primeiro, depois por nome
    return [...list].sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || a.patientName.localeCompare(b.patientName));
  }, [patients, lifecycleFilter, orphanPatients]);

  const monthLabel = currentMonth
    ? new Date(`${currentMonth}-15`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="p-4 text-left sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Acompanhamento de pacientes</h2>
          <p className="text-sm text-gray-500">{monthLabel}{data && ` · ${data.summary.patients} pacientes`}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Profissional
          <select value={selectedDoctorId}
            onChange={e => { setSelectedDoctorId(e.target.value); setLifecycleFilter('todos'); }}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Todos os profissionais</option>
            {doctors.map(doc => <option key={doc._id} value={doc._id}>{doc.fullName}</option>)}
          </select>
        </label>
      </div>

      {loading && (
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-9 w-2/3 animate-pulse rounded-full bg-gray-100" />
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-50" />)}
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 px-4 py-10 text-center">
          <p className="text-sm font-semibold text-gray-900">Não foi possível carregar o acompanhamento</p>
          <p className="max-w-md text-xs text-gray-500">{error}</p>
          <button type="button" onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} aria-hidden /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {orphanPatients.length > 0 && lifecycleFilter !== 'orphan' && (
            <div className="mb-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm text-amber-900">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                <span><strong>{orphanPatients.length} {orphanPatients.length === 1 ? 'paciente sem próxima sessão' : 'pacientes sem próxima sessão'}</strong> {orphanPatients.length === 1 ? 'tem' : 'têm'} histórico, mas nada agendado.</span>
              </p>
              <button type="button" onClick={() => setLifecycleFilter('orphan')}
                className="self-start rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 sm:self-auto">
                Ver {orphanPatients.length === 1 ? 'o paciente' : `os ${orphanPatients.length}`}
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="-my-1 flex gap-1.5 overflow-x-auto py-1">
              <Chip active={lifecycleFilter === 'todos'} count={data.summary.patients} onClick={() => setLifecycleFilter('todos')}>Todos</Chip>
              {(['engajado', 'oscilando', 'em_risco', 'perdido', 'novo'] as RetentionLifecycle[]).map(l => (
                <Chip key={l} active={lifecycleFilter === l} count={data.summary[l]} dot={LIFECYCLE[l].dot}
                  onClick={() => setLifecycleFilter(lifecycleFilter === l ? 'todos' : l)}>{LIFECYCLE[l].plural}</Chip>
              ))}
              {orphanPatients.length > 0 && (
                <Chip active={lifecycleFilter === 'orphan'} count={orphanPatients.length} dot="#eda100"
                  onClick={() => setLifecycleFilter(lifecycleFilter === 'orphan' ? 'todos' : 'orphan')}>Sem próxima sessão</Chip>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-2xl font-bold tabular-nums text-gray-900">{data.summary.retentionRate}%</span>
              <span className="ml-1.5 text-xs text-gray-500">retenção do mês</span>
            </div>
          </div>

          {filteredPatients.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nenhum paciente nesta categoria no período.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th scope="col" className="py-2 pl-3 pr-2">Paciente</th>
                    <th scope="col" className="px-2 py-2">Situação</th>
                    <th scope="col" className="px-2 py-2">Presença</th>
                    <th scope="col" className="px-2 py-2">Faltas</th>
                    <th scope="col" className="px-2 py-2">Última</th>
                    <th scope="col" className="px-2 py-2">Próxima</th>
                    <th scope="col" className="px-2 py-2">Pacote</th>
                    <th scope="col" className="py-2 pl-2 pr-3 text-right"><span className="sr-only">Contato</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => <PatientRow key={p.patientId} p={p} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
