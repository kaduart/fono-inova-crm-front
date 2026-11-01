// Indicadores do painel do terapeuta no padrão do Dashboard admin: números animados
// (NumberFlow), barra de comparecimento e "Meu mês" recolhido com BarList.
// Todos os números vêm do back (/doctors/appointments/stats e insights); nada é calculado aqui.
import { BarChart3, ChevronRight } from 'lucide-react';
import AnimatedValue from '../../ui/insight/AnimatedValue';
import BarList from '../../ui/insight/BarList';
import { FoldSection } from '../../patients/PatientInsights';
import type { DoctorInsights } from '../../../hooks/useDoctorInsights';

interface Props {
    stats: any;
    loading: boolean;
    insights: DoctorInsights | null;
    nextLabel?: { value: string | number; hint?: string };
    onOpenPatients: () => void;
    onOpenInsights: () => void;
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export default function DoctorOverviewInsights({ stats, loading, insights, nextLabel, onOpenPatients, onOpenInsights }: Props) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-[92px] animate-pulse rounded-xl bg-gray-100" />)}
            </div>
        );
    }
    const st = stats || {};
    const active = num(st.activePatients);
    const month = num(st.monthlyAppointments);
    const completed = num(st.monthlyCompleted);
    const missed = num(st.monthlyMissed);
    const canceled = num(st.monthlyCanceled);
    const rate = num(st.attendanceRate);
    const rateTone = rate === null ? 'text-gray-900' : rate < 75 ? 'text-red-700 dark:text-red-400' : rate < 90 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400';
    const rateBar = rate === null ? 'bg-gray-300' : rate < 75 ? 'bg-red-500' : rate < 90 ? 'bg-amber-500' : 'bg-emerald-600';

    const tile = 'flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white px-4 py-3 text-left dark:border-gray-700';
    const monthItems = [
        { key: 'done', label: 'Concluídas', value: completed ?? 0, display: completed != null ? String(completed) : '—' },
        { key: 'sched', label: 'Agendadas', value: month ?? 0, display: month != null ? String(month) : '—' },
        { key: 'missed', label: 'Faltas', value: missed ?? 0, display: missed != null ? String(missed) : '—' },
        { key: 'canc', label: 'Canceladas', value: canceled ?? 0, display: canceled != null ? String(canceled) : '—' },
    ];
    const freqItems = (insights?.frequencyDistribution ?? [])
        .filter(b => b.count > 0)
        .map(b => ({ key: b.label, label: b.label, value: b.count, display: String(b.count) }));
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });

    return (
        <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <button type="button" onClick={onOpenPatients} className={`${tile} hover:border-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}>
                    <span className="text-xs font-medium text-gray-600">Pacientes ativos</span>
                    <span className="text-2xl font-bold leading-tight tabular-nums text-gray-900">{active === null ? '—' : <AnimatedValue value={active} />}</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 dark:text-emerald-400">atendidos neste mês <ChevronRight size={12} aria-hidden /></span>
                </button>
                <div className={tile}>
                    <span className="text-xs font-medium text-gray-600">Sessões no mês</span>
                    <span className="text-2xl font-bold leading-tight tabular-nums text-gray-900">{month === null ? '—' : <AnimatedValue value={month} />}</span>
                    {completed !== null && <span className="text-xs text-gray-600">{completed} concluídas</span>}
                </div>
                <div className={tile}>
                    <span className="text-xs font-medium text-gray-600">Comparecimento</span>
                    <span className={`text-2xl font-bold leading-tight tabular-nums ${rateTone}`}>{rate === null ? '—' : <AnimatedValue value={`${rate}%`} />}</span>
                    <span className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rate ?? 0} aria-label="Comparecimento">
                        <span className={`block h-full rounded-full transition-[width] duration-700 ${rateBar}`} style={{ width: `${rate ?? 0}%` }} />
                    </span>
                    <span className="mt-1 text-xs text-gray-600">concluídas ÷ previstas até hoje</span>
                </div>
                <div className={tile}>
                    <span className="text-xs font-medium text-gray-600">Próxima consulta</span>
                    <span className="text-2xl font-bold leading-tight tabular-nums text-gray-900">{nextLabel?.value ?? '—'}</span>
                    {nextLabel?.hint && <span className="text-xs text-gray-600">{nextLabel.hint}</span>}
                </div>
            </div>

            <FoldSection title="Meu mês" icon={<BarChart3 size={16} />}
                meta={`${monthName} · ${completed ?? '—'} concluídas · ${missed ?? '—'} faltas · ${canceled ?? '—'} canceladas`}>
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Sessões do mês</h3>
                        <BarList items={monthItems} />
                    </div>
                    <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Frequência dos pacientes</h3>
                        {freqItems.length ? <BarList items={freqItems} /> : <p className="text-sm text-gray-600">Sem dados de frequência no período.</p>}
                    </div>
                </div>
                <button type="button" onClick={onOpenInsights} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                    Ver inteligência completa <ChevronRight size={14} aria-hidden />
                </button>
            </FoldSection>
        </>
    );
}
