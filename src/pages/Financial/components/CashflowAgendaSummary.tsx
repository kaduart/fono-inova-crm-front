import { CashflowV2Data } from '../../../services/cashflowService';
import { AppointmentsByTypeData } from '../../../hooks/useAppointmentsByType';
interface Props {
    data: CashflowV2Data;
    analytics: AppointmentsByTypeData | null;
    loading: boolean;
    error: boolean;
    createdTotal?: number;
    createdLoading: boolean;
    createdError: boolean;
    startDate: string;
    endDate: string;
    /** Abre a aba Agenda do dia; com status, já filtrada (completed, scheduled, canceled…). */
    onAgenda: (status?: string) => void;
    onNewSpecialty: () => void;
    /** Abre a lista com nome, horário e profissional de um grupo do perfil. */
    onProfile?: (title: string, items: any[]) => void;
}
const link = 'min-h-10 rounded-md px-2 text-left text-sm text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950';
export default function CashflowAgendaSummary(p: Props) {
    const period = p.startDate === p.endDate ? 'do dia' : 'do período';
    // A API de perfil também inclui registros criados no intervalo para datas futuras.
    // Aqui o perfil operacional considera somente a data marcada para o atendimento.
    const onDate = (items: { date?: unknown }[] | undefined) => (items || []).filter(item => {
        const date = String(item.date || '').slice(0, 10);
        return date >= p.startDate && date <= p.endDate;
    });
    // Pré-agendado (ainda não confirmado) e primeira consulta (confirmada) são os dois lados
    // do paciente novo: ficam juntos num número só, com a divisão logo abaixo.
    const leads = onDate(p.analytics?.leads);
    const novos = onDate(p.analytics?.novos);
    const list = (title: string, items: any[]) => (p.onProfile ? () => p.onProfile!(title, items) : undefined);
    const profile: { label: string; count: number; detail?: string; action?: () => void }[] = [
        { label: 'Pacientes novos', count: leads.length + novos.length, detail: `${leads.length} pré-agendado${leads.length !== 1 ? 's' : ''} · ${novos.length} 1ª consulta`, action: list('Pacientes novos', [...leads, ...novos]) },
        { label: 'Nova especialidade', count: onDate(p.analytics?.novosEspecialidade).length, action: p.onNewSpecialty },
        { label: 'Retornos após 45 dias', count: onDate(p.analytics?.retornos45).length, action: list('Retornos após 45 dias', onDate(p.analytics?.retornos45)) },
        { label: 'Recorrentes', count: onDate(p.analytics?.recorrentes).length, action: list('Recorrentes', onDate(p.analytics?.recorrentes)) },
        { label: 'Tratamentos por liminar', count: onDate(p.analytics?.continuousTreatment).length, action: list('Tratamentos por liminar', onDate(p.analytics?.continuousTreatment)) },
    ];
    const attendance = p.data.atendimentos;
    return <section aria-labelledby="cashflow-agenda-title" className="overflow-hidden rounded-xl border border-gray-200 bg-white text-left dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            <h3 id="cashflow-agenda-title" className="text-sm font-semibold">Agenda e movimento {period}</h3>
            <button type="button" className={link} onClick={() => p.onAgenda()}>Ver agenda e atendimentos</button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 sm:grid-cols-4 lg:grid-cols-5">
            <Stat label="Agendados ativos" value={attendance?.total} detail="realizados + aguardando" onClick={() => p.onAgenda('all')} />
            <Stat label="Atendidos" value={attendance?.realizados} tone="text-emerald-800 dark:text-emerald-300" onClick={() => p.onAgenda('completed')} />
            <Stat label="Aguardando" value={attendance?.faltantes} tone="text-amber-800 dark:text-amber-300" onClick={() => p.onAgenda('scheduled')} />
            <Stat label="Faltas / cancelamentos" value={p.data.agenda?.faltasOuCancelados} onClick={() => p.onAgenda('canceled')} />
            <Stat label="Agendamentos criados" value={p.createdLoading || p.createdError ? undefined : p.createdTotal} detail={p.createdLoading ? 'Consultando…' : p.createdError ? 'Consulta indisponível' : 'ativos · inclui datas futuras'} />
        </dl>
        <div className="border-t border-gray-200 bg-gray-50/60 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
            <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">Perfil dos agendamentos marcados para este período</h4>
            {p.loading ? <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Consultando perfil da agenda…</p> : p.error || !p.analytics ? <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Perfil da agenda indisponível. Atualize para tentar novamente.</p> : <dl className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3 xl:grid-cols-5">
                {profile.map(item => <div key={item.label} className="min-w-0"><dt className="text-xs leading-5 text-gray-600 dark:text-gray-300">{item.label}</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{item.action && item.count > 0 ? <button type="button" className={link} aria-label={`Ver ${item.label.toLowerCase()}: ${item.count}`} onClick={item.action}>{item.count}</button> : item.count}</dd>{item.detail && <dd className="text-xs text-gray-600 dark:text-gray-300">{item.detail}</dd>}</div>)}
            </dl>}
        </div>
    </section>;
}
function Stat({ label, value, detail, tone = 'text-gray-900 dark:text-gray-100', onClick }: { label: string; value?: number; detail?: string; tone?: string; onClick?: () => void }) {
    const v = value ?? '—';
    return <div className="min-w-0"><dt className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</dt><dd className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{onClick && value ? <button type="button" onClick={onClick} aria-label={`Ver ${label.toLowerCase()}: ${value}`} className="rounded underline decoration-dotted decoration-2 underline-offset-4 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:hover:bg-gray-800">{v}</button> : v}</dd>{detail && <dd className="mt-0.5 text-xs leading-5 text-gray-600 dark:text-gray-300">{detail}</dd>}</div>;
}
