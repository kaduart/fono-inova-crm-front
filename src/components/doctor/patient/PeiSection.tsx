// PEI na ficha do paciente (item 5 da sprint prontuário, 03/11/2026). Regras: back/docs/PEI.md.
// Um plano ativo por profissional; cada meta com linha de base → atual → alvo (0–10) e medições.
import { Check, Pause, Plus, RefreshCw, Target, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { pei, PeiGoal, PeiGoalInput, PeiPlan } from '../../../services/clinicalService';
import { extractApiError } from '../../../utils/errorUtils';
import { toast } from '../../../utils/toast';
import { confirmDialog } from '../../ui/ConfirmHost';

const fmtDay = (d?: string | null) => {
    const m = d ? /^(\d{4})-(\d{2})-(\d{2})/.exec(d) : null;
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const STATUS: Record<string, { label: string; cls: string }> = {
    achieved: { label: 'Alcançada', cls: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
    paused: { label: 'Pausada', cls: 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300' },
    active: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
};
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100';
const blankGoal = (): PeiGoalInput => ({ area: '', description: '', criterion: '', baseline: 0, target: 8 });
const errMsg = (e: unknown, fallback: string) => extractApiError(e)?.message || fallback;

function GoalRow({ goal, onMeasure, busy }: { goal: PeiGoal; onMeasure: (value: number, note?: string) => Promise<void>; busy: boolean }) {
    const [value, setValue] = useState('');
    const [note, setNote] = useState('');
    const st = STATUS[goal.status || 'active'];
    const cur = goal.current ?? goal.baseline;
    const last = (goal.history || []).slice(-6);
    const valid = value !== '' && Number(value) >= 0 && Number(value) <= 10;
    return (
        <li className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{goal.area}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{goal.description}</p>
                    {goal.criterion && <p className="text-xs text-gray-600 dark:text-gray-400">Medida: {goal.criterion}</p>}
                </div>
                <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>
            </div>
            <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>Base {goal.baseline}</span><span className="font-semibold text-gray-900 dark:text-gray-100">Atual {cur}</span><span>Alvo {goal.target}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700" role="progressbar" aria-valuenow={goal.progressPct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Avanço da meta ${goal.description}`}>
                    <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${goal.progressPct ?? 0}%` }} />
                </div>
                {last.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Medições: {last.map(h => `${fmtDay(h.date).slice(0, 5)} ${h.value}`).join(' · ')}</p>
                )}
            </div>
            {goal.status !== 'paused' && (
                <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (!valid) return; await onMeasure(Number(value), note.trim() || undefined); setValue(''); setNote(''); }}>
                    <label className="flex flex-col text-xs font-medium text-gray-700 dark:text-gray-300">Medição de hoje (0–10)
                        <input type="number" min={0} max={10} step={0.5} value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} mt-1 w-24`} />
                    </label>
                    <label className="flex min-w-[160px] flex-1 flex-col text-xs font-medium text-gray-700 dark:text-gray-300">Observação (opcional)
                        <input type="text" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={`${inputCls} mt-1`} />
                    </label>
                    <button type="submit" disabled={!valid || busy} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Registrar</button>
                </form>
            )}
        </li>
    );
}

function GoalsEditor({ goals, onChange }: { goals: PeiGoalInput[]; onChange: (g: PeiGoalInput[]) => void }) {
    const set = (i: number, patch: Partial<PeiGoalInput>) => onChange(goals.map((g, j) => (j === i ? { ...g, ...patch } : g)));
    return (
        <div className="space-y-3">
            {goals.map((g, i) => (
                <fieldset key={g._id || `novo-${i}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <legend className="px-1 text-xs font-semibold text-gray-600">Meta {i + 1}</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Área<input className={`${inputCls} mt-1`} value={g.area} onChange={(e) => set(i, { area: e.target.value })} placeholder="Ex: Linguagem expressiva" /></label>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Como medir<input className={`${inputCls} mt-1`} value={g.criterion || ''} onChange={(e) => set(i, { criterion: e.target.value })} placeholder="Ex: em 4 de 5 tentativas" /></label>
                        <label className="text-xs font-medium text-gray-700 sm:col-span-2 dark:text-gray-300">Meta<input className={`${inputCls} mt-1`} value={g.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="Ex: Pedir objetos com frase de 2 palavras" /></label>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Linha de base (0–10)<input type="number" min={0} max={10} className={`${inputCls} mt-1`} value={g.baseline} onChange={(e) => set(i, { baseline: Number(e.target.value) })} /></label>
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Alvo (0–10)<input type="number" min={0} max={10} className={`${inputCls} mt-1`} value={g.target} onChange={(e) => set(i, { target: Number(e.target.value) })} /></label>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {g._id ? (
                            g.status !== 'achieved' && (
                                <button type="button" onClick={() => set(i, { status: g.status === 'paused' ? 'active' : 'paused' })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800">
                                    <Pause size={13} aria-hidden /> {g.status === 'paused' ? 'Retomar meta' : 'Pausar meta'}
                                </button>
                            )
                        ) : (
                            <button type="button" onClick={() => onChange(goals.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                                <Trash2 size={13} aria-hidden /> Remover
                            </button>
                        )}
                    </div>
                </fieldset>
            ))}
            <button type="button" onClick={() => onChange([...goals, blankGoal()])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:underline">
                <Plus size={15} aria-hidden /> Adicionar meta
            </button>
        </div>
    );
}

const goalProblem = (goals: PeiGoalInput[]) => {
    if (!goals.length) return 'Adicione pelo menos uma meta.';
    for (const g of goals) {
        if (!g.area.trim() || !g.description.trim()) return 'Cada meta precisa de área e descrição.';
        if (!(g.target > g.baseline)) return 'O alvo precisa ser maior que a linha de base.';
        if (g.baseline < 0 || g.target > 10) return 'Os valores vão de 0 a 10.';
    }
    return null;
};

export default function PeiSection({ patientId, specialty }: { patientId: string; specialty?: string }) {
    const [plans, setPlans] = useState<PeiPlan[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [editing, setEditing] = useState<{ goals: PeiGoalInput[]; reviewDate: string } | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try { setLoadError(false); setPlans(await pei.list(patientId)); }
        catch { setLoadError(true); }
    }, [patientId]);
    useEffect(() => { load(); }, [load]);

    const active = plans?.find(p => p.status === 'active') || null;
    const closed = plans?.filter(p => p.status === 'closed') || [];
    const replace = (plan: PeiPlan) => setPlans(prev => (prev ? [plan, ...prev.filter(p => p._id !== plan._id)] : [plan]));

    const startEdit = () => setEditing({
        goals: active ? active.goals.map(g => ({ _id: g._id, area: g.area, description: g.description, criterion: g.criterion, baseline: g.baseline, target: g.target, status: g.status })) : [blankGoal()],
        reviewDate: active?.reviewDate ? active.reviewDate.slice(0, 10) : '',
    });

    const save = async () => {
        if (!editing) return;
        const problem = goalProblem(editing.goals);
        if (problem) { toast.warn(problem); return; }
        setBusy(true);
        try {
            const plan = active
                ? await pei.update(active._id, { goals: editing.goals, reviewDate: editing.reviewDate || null })
                : await pei.create({ patientId, specialty, goals: editing.goals, reviewDate: editing.reviewDate || undefined });
            replace(plan);
            setEditing(null);
            toast.success(active ? 'PEI atualizado' : 'PEI criado');
        } catch (e) { toast.error(errMsg(e, 'Não foi possível salvar o PEI.')); }
        finally { setBusy(false); }
    };

    const measure = async (goalId: string, value: number, note?: string) => {
        if (!active) return;
        setBusy(true);
        try { replace(await pei.progress(active._id, goalId, value, note)); toast.success('Medição registrada'); }
        catch (e) { toast.error(errMsg(e, 'Não foi possível registrar.')); }
        finally { setBusy(false); }
    };

    const close = async () => {
        if (!active) return;
        const ok = await confirmDialog('O plano fica no histórico e você pode criar um novo depois.', { title: 'Encerrar este PEI?', confirmText: 'Encerrar', cancelText: 'Voltar' });
        if (!ok) return;
        try { replace(await pei.close(active._id)); toast.success('PEI encerrado'); }
        catch (e) { toast.error(errMsg(e, 'Não foi possível encerrar.')); }
    };

    if (loadError) {
        return (
            <div className="py-10 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Não foi possível carregar o PEI.</p>
                <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><RefreshCw size={14} aria-hidden /> Tentar de novo</button>
            </div>
        );
    }
    if (!plans) return <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" aria-busy="true" />;

    if (editing) {
        return (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-700 dark:bg-slate-900">
                <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">{active ? 'Editar metas do PEI' : 'Novo PEI'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Use 0 a 10 para a linha de base e o alvo. As medições ficam no histórico mesmo se você editar a meta.</p>
                </div>
                <label className="block max-w-xs text-xs font-medium text-gray-700 dark:text-gray-300">Revisar o plano em
                    <input type="date" className={`${inputCls} mt-1`} value={editing.reviewDate} onChange={(e) => setEditing({ ...editing, reviewDate: e.target.value })} />
                </label>
                <GoalsEditor goals={editing.goals} onChange={(goals) => setEditing({ ...editing, goals })} />
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-slate-800">
                    <button type="button" onClick={() => setEditing(null)} className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200">Cancelar</button>
                    <button type="button" onClick={save} disabled={busy} className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar PEI'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-left">
            {active ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">PEI em andamento</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Desde {fmtDay(active.startDate)}{active.reviewDate ? ` · revisar em ${fmtDay(active.reviewDate)}` : ''}
                                {' · '}{active.goals.filter(g => g.status === 'achieved').length} de {active.goals.length} metas alcançadas
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={startEdit} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200">Editar metas</button>
                            <button type="button" onClick={close} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">Encerrar</button>
                        </div>
                    </div>
                    <ul className="mt-3 space-y-3">
                        {active.goals.map(g => <GoalRow key={g._id} goal={g} busy={busy} onMeasure={(v, n) => measure(g._id!, v, n)} />)}
                    </ul>
                    <p className="mt-3 text-xs text-gray-500">O avanço das metas entra no relatório mensal.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-600 dark:bg-slate-900">
                    <Target className="mx-auto mb-2 h-10 w-10 text-gray-300" aria-hidden />
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sem PEI em andamento</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">Defina as metas com linha de base e alvo. Cada medição mostra o avanço aqui e no relatório mensal.</p>
                    <button type="button" onClick={startEdit} className="mt-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><Plus size={16} aria-hidden /> Criar PEI</button>
                </div>
            )}
            {closed.length > 0 && (
                <details className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">PEIs encerrados ({closed.length})</summary>
                    <ul className="divide-y divide-gray-100 px-4 pb-3 dark:divide-slate-800">
                        {closed.map(p => (
                            <li key={p._id} className="py-2 text-sm text-gray-700 dark:text-gray-300">
                                {fmtDay(p.startDate)} a {fmtDay(p.closedAt)} · <Check size={13} className="inline text-emerald-600" aria-hidden /> {p.goals.filter(g => g.status === 'achieved').length}/{p.goals.length} metas alcançadas
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </div>
    );
}
