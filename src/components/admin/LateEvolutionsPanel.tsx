// "Evoluções em atraso" no Precisa de você do Dashboard admin (item 6 da sprint prontuário, 03/11/2026).
// Sessão concluída sem evolução finalizada do profissional, agrupada por terapeuta, com lembrete
// pronto no WhatsApp. Só leitura. Dados: GET /v2/evolutions/pending/by-doctor (só admin; para
// outros perfis o back responde 403 e a linha simplesmente não aparece).
import { MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSpecialtyLabel } from '../../constants/specialties';
import { fetchLateEvolutionsByDoctor, LateEvolutionsByDoctor, LateEvolutionsSummary } from '../../services/evolutionService';
import { SidePanel } from '../commercial/CommercialParts';
import { openWhatsApp } from '../commercial/commercialCopy';

/** Acima disso a pendência fica vermelha (combinado com a coordenação). */
export const LATE_LIMIT_DAYS = 2;

type Filter = 'all' | 'late' | 'drafts';

const firstName = (n = '') => n.trim().split(/\s+/)[0] || n;
const fmtDay = (d?: string | null) => {
    const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
    return m ? `${m[3]}/${m[2]}` : '';
};

export function lateReminderMessage(doc: Pick<LateEvolutionsByDoctor, 'fullName' | 'items'>): string {
    const names = doc.items.map(i => firstName(i.fullName));
    const list = names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' e $1') : `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}`;
    const n = doc.items.length;
    return `Oi, ${firstName(doc.fullName)}! ${n === 1 ? 'Ficou 1 evolução' : `Ficaram ${n} evoluções`} para fechar no sistema (${list}). Consegue finalizar hoje? Obrigado!`;
}

export function useLateEvolutions() {
    const [data, setData] = useState<LateEvolutionsSummary | null>(null);
    const [error, setError] = useState(false);
    const load = useCallback(async () => {
        try {
            setData(await fetchLateEvolutionsByDoctor());
            setError(false);
        } catch (e: unknown) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            // 403 = perfil sem acesso: some sem erro.
            if (status === 403) { setData({ doctors: [], total: 0, drafts: 0, oldestDaysLate: 0 }); setError(false); return; }
            console.error('[dashboard] falha ao carregar evoluções em atraso', e);
            setError(true);
        }
    }, []);
    useEffect(() => { load(); }, [load]);
    return { data, error, reload: load };
}

export function lateEvolutionsDetail(d: LateEvolutionsSummary | null): string {
    if (!d || !d.total) return '';
    const parts = [`${d.doctors.length} ${d.doctors.length === 1 ? 'terapeuta' : 'terapeutas'}`];
    if (d.oldestDaysLate > 0) parts.push(`mais antiga há ${d.oldestDaysLate} ${d.oldestDaysLate === 1 ? 'dia' : 'dias'}`);
    if (d.drafts) parts.push(`${d.drafts} ${d.drafts === 1 ? 'rascunho' : 'rascunhos'}`);
    return parts.join(' · ');
}

const chipCls = 'inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold';

export function LateEvolutionsPanel({ data, onClose }: { data: LateEvolutionsSummary; onClose: () => void }) {
    const [filter, setFilter] = useState<Filter>('all');
    const lateCount = useMemo(() => data.doctors.reduce((s, d) => s + d.items.filter(i => i.daysLate > LATE_LIMIT_DAYS).length, 0), [data]);
    const doctors = useMemo(() => data.doctors
        .map(d => ({
            ...d,
            items: d.items.filter(i => filter === 'all' || (filter === 'late' ? i.daysLate > LATE_LIMIT_DAYS : !!i.draft)),
        }))
        .filter(d => d.items.length > 0), [data, filter]);

    const filters: { id: Filter; label: string }[] = [
        { id: 'all', label: `Todas (${data.total})` },
        { id: 'late', label: `Mais de ${LATE_LIMIT_DAYS} dias (${lateCount})` },
        { id: 'drafts', label: `Só rascunhos (${data.drafts})` },
    ];

    return (
        <SidePanel kicker="Coordenação clínica" title="Evoluções em atraso"
            subtitle="Sessão concluída sem evolução finalizada, nos últimos 90 dias. Rascunho conta como pendente até a terapeuta finalizar."
            onClose={onClose}>
            <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar pendências">
                {filters.map(f => (
                    <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`min-h-8 rounded-full border px-3 text-sm font-semibold transition-colors ${filter === f.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800'}`}>
                        {f.label}
                    </button>
                ))}
            </div>
            {doctors.length === 0 && <p className="py-8 text-center text-sm text-gray-600 dark:text-gray-400">Nada nesse filtro.</p>}
            <ul className="flex flex-col gap-3">
                {doctors.map(d => {
                    const full = data.doctors.find(x => x.doctorId === d.doctorId) || d;
                    return (
                        <li key={d.doctorId} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-50">{d.fullName}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {d.specialty ? `${getSpecialtyLabel(d.specialty)} · ` : ''}{full.pendingCount} em atraso{full.draftCount ? ` · ${full.draftCount} ${full.draftCount === 1 ? 'rascunho' : 'rascunhos'}` : ''}
                                    </p>
                                </div>
                                <button type="button" disabled={!d.phoneNumber}
                                    onClick={() => openWhatsApp(d.phoneNumber, lateReminderMessage(full))}
                                    title={d.phoneNumber ? 'Abre o WhatsApp com o lembrete pronto' : 'Profissional sem telefone no cadastro'}
                                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                                    <MessageCircle size={14} aria-hidden /> Lembrar
                                </button>
                            </div>
                            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
                                {d.items.map(i => (
                                    <li key={`${i._id}-${i.lastAppointmentId || ''}`} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                                        <span className="min-w-0 truncate text-gray-900 dark:text-gray-100">
                                            {i.fullName}
                                            <span className="text-xs text-gray-500 dark:text-gray-400"> · {fmtDay(i.lastCompletedDate)}{i.lastCompletedTime ? ` ${i.lastCompletedTime}` : ''}</span>
                                        </span>
                                        {i.draft ? (
                                            <span className={`${chipCls} bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`}>rascunho salvo</span>
                                        ) : (
                                            <span className={`${chipCls} ${i.daysLate > LATE_LIMIT_DAYS ? 'bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                                                {i.daysLate === 0 ? 'sem evolução · hoje' : `sem evolução · ${i.daysLate} ${i.daysLate === 1 ? 'dia' : 'dias'}`}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ul>
        </SidePanel>
    );
}
