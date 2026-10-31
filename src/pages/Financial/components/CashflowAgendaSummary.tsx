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
    // Visual aprovado em 31/10: uma linha de chips clicáveis no lugar do bloco alto.
    const chips: { label: string; value?: number; tone?: 'g' | 'a' | 'r'; detail?: string; onClick?: () => void }[] = [
        { label: 'agendados', value: attendance?.total, onClick: () => p.onAgenda('all') },
        { label: 'atendidos', value: attendance?.realizados, tone: 'g', onClick: () => p.onAgenda('completed') },
        { label: 'aguardando', value: attendance?.faltantes, tone: 'a', onClick: () => p.onAgenda('scheduled') },
        { label: 'faltas/cancel.', value: p.data.agenda?.faltasOuCancelados, tone: 'r', onClick: () => p.onAgenda('canceled') },
    ];
    const tone = { g: 'text-emerald-700 dark:text-emerald-300', a: 'text-amber-700 dark:text-amber-300', r: 'text-red-700 dark:text-red-400' };
    const chipCls = 'inline-flex min-h-9 items-baseline gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';
    const Chip = ({ label, value, t, detail, onClick }: { label: string; value?: number; t?: 'g' | 'a' | 'r'; detail?: string; onClick?: () => void }) => {
        const inner = <><b className={`text-base font-bold tabular-nums ${t ? tone[t] : 'text-gray-900 dark:text-gray-100'}`}>{value ?? '—'}</b>{label}{detail && <span className="text-xs text-gray-500 dark:text-gray-400">({detail})</span>}</>;
        return onClick && value
            ? <button type="button" onClick={onClick} aria-label={`Ver ${label}: ${value}`} className={`${chipCls} hover:border-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600`}>{inner}</button>
            : <span className={chipCls}>{inner}</span>;
    };
    return <section aria-labelledby="cashflow-agenda-title" className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left dark:border-gray-700 dark:bg-gray-900">
        <h3 id="cashflow-agenda-title" className="mr-1 text-sm font-semibold text-gray-900 dark:text-gray-100">Agenda {period}</h3>
        {chips.map(c => <Chip key={c.label} label={c.label} value={c.value} t={c.tone} onClick={c.onClick} />)}
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700" />
        {p.loading ? <span role="status" className="text-sm text-gray-500">Consultando perfil…</span>
            : p.error || !p.analytics ? <span role="status" className="text-sm text-gray-500">Perfil da agenda indisponível. Atualize para tentar novamente.</span>
            : profile.map(item => <Chip key={item.label} label={item.label.charAt(0).toLowerCase() + item.label.slice(1)} value={item.count} detail={item.detail} onClick={item.action} />)}
        <Chip label="criados no período" value={p.createdLoading || p.createdError ? undefined : p.createdTotal} detail={p.createdLoading ? 'consultando…' : p.createdError ? 'indisponível' : 'inclui datas futuras'} />
        <button type="button" className={`${link} ml-auto`} onClick={() => p.onAgenda()}>Ver agenda e atendimentos</button>
    </section>;
}
