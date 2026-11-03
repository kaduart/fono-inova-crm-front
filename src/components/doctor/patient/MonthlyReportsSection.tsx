// Relatório mensal na ficha do paciente (item 3 da sprint prontuário, 03/11/2026).
// Gerar → escrever o resumo → aprovar → baixar PDF / avisar a família. Regras: back/docs/FAMILY_COMMUNICATION.md.
import { ArrowLeft, Check, FileDown, FileText, MessageCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { monthLabel, MonthlyReport, monthlyReports } from '../../../services/clinicalService';
import { extractApiError } from '../../../utils/errorUtils';
import { toast } from '../../../utils/toast';

const STATUS: Record<MonthlyReport['status'], { label: string; cls: string }> = {
    draft: { label: 'Rascunho', cls: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
    approved: { label: 'Aprovado', cls: 'bg-blue-50 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
    sent: { label: 'Enviado à família', cls: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
};
const PLACEHOLDER = /\[[^\]]*\]/;
const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100';
const errMsg = (e: unknown, fallback: string) => extractApiError(e)?.message || fallback;

/** Até o dia 10, sugere o mês anterior (fechamento); depois, o mês corrente. */
export function defaultReportMonth(now = new Date()) {
    const d = new Date(now.getFullYear(), now.getMonth() - (now.getDate() <= 10 ? 1 : 0), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
    return (
        <div className="rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-50">{value}</p>
            {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
    );
}

function ReportEditor({ report, onChange, onBack, patientName }: { report: MonthlyReport; onChange: (r: MonthlyReport) => void; onBack: () => void; patientName: string }) {
    const [summary, setSummary] = useState(report.summary || '');
    const [nextSteps, setNextSteps] = useState(report.nextSteps || '');
    const [family, setFamily] = useState(report.familyMessage || '');
    const [busy, setBusy] = useState<string | null>(null);
    useEffect(() => { setSummary(report.summary || ''); setNextSteps(report.nextSteps || ''); setFamily(report.familyMessage || ''); }, [report._id, report.status]); // eslint-disable-line react-hooks/exhaustive-deps

    const d = report.data;
    const att = d.attendance;
    const dirty = summary !== (report.summary || '') || nextSteps !== (report.nextSteps || '');
    const sent = report.status === 'sent';
    const familyProblem = PLACEHOLDER.test(family) ? 'Troque os trechos entre colchetes.' : family.trim().length < 20 ? 'Escreva o aviso.' : null;

    const run = async (key: string, fn: () => Promise<MonthlyReport>, okMsg: string) => {
        setBusy(key);
        try { onChange(await fn()); toast.success(okMsg); }
        catch (e) { toast.error(errMsg(e, 'Não foi possível concluir.')); }
        finally { setBusy(null); }
    };
    const downloadPdf = async () => {
        setBusy('pdf');
        try {
            const blob = await monthlyReports.pdf(report._id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Relatorio_${patientName.replace(/\s+/g, '_')}_${report.month}.pdf`;
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        } catch { toast.error('Não foi possível gerar o PDF.'); }
        finally { setBusy(null); }
    };

    return (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 text-left dark:border-gray-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline"><ArrowLeft size={15} aria-hidden /> Relatórios</button>
                    <h3 className="text-lg font-bold capitalize text-gray-900 dark:text-gray-50">{monthLabel(report.month)}</h3>
                </div>
                <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${STATUS[report.status].cls}`}>{STATUS[report.status].label}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Kpi label="Sessões com evolução" value={d.sessionsWithEvolution} />
                <Kpi label="Presença" value={att.rate != null ? `${att.rate}%` : '—'} sub={`${att.attended} presenças · ${att.missed} faltas`} />
                <Kpi label="Metas do PEI" value={d.goals.length ? `${d.goals.filter(g => g.status === 'achieved').length}/${d.goals.length}` : '—'} sub={d.goals.length ? 'alcançadas' : 'sem PEI ativo'} />
            </div>

            {d.goals.length > 0 && (
                <details className="rounded-xl border border-gray-200 dark:border-gray-700" open>
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Metas do PEI</summary>
                    <ul className="space-y-2 px-3 pb-3">
                        {d.goals.map(g => (
                            <li key={g.goalId} className="text-sm">
                                <div className="flex justify-between gap-2"><span className="text-gray-900 dark:text-gray-100">{g.area} · {g.description}</span><span className="shrink-0 text-gray-600">{g.baseline} → {g.current} (alvo {g.target})</span></div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700"><div className="h-1.5 rounded-full bg-emerald-600" style={{ width: `${g.progressPct}%` }} /></div>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            {d.areas.length > 0 && (
                <details className="rounded-xl border border-gray-200 dark:border-gray-700">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Áreas trabalhadas ({d.areas.length})</summary>
                    <ul className="divide-y divide-gray-100 px-3 pb-2 text-sm dark:divide-slate-800">
                        {d.areas.map(a => (
                            <li key={a.name} className="flex justify-between py-1.5">
                                <span className="text-gray-900 dark:text-gray-100">{a.name}</span>
                                <span className="text-gray-600">{a.first} → {a.last} <b className={a.delta > 0 ? 'text-emerald-700' : a.delta < 0 ? 'text-amber-700' : 'text-gray-600'}>{a.delta > 0 ? `+${a.delta}` : a.delta}</b></span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            <div>
                <label htmlFor="mr-summary" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo do mês *</label>
                <textarea id="mr-summary" rows={5} value={summary} disabled={sent} onChange={(e) => setSummary(e.target.value)} className={`${inputCls} mt-1`}
                    placeholder="O que mudou no mês, em linguagem que a família entende." />
            </div>
            <div>
                <label htmlFor="mr-next" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Próximos passos</label>
                <textarea id="mr-next" rows={3} value={nextSteps} disabled={sent} onChange={(e) => setNextSteps(e.target.value)} className={`${inputCls} mt-1`}
                    placeholder="Foco do próximo mês e orientações para casa." />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={downloadPdf} disabled={busy === 'pdf'} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200">
                    <FileDown size={15} aria-hidden /> {busy === 'pdf' ? 'Gerando…' : 'Baixar PDF'}
                </button>
                {!sent && dirty && (
                    <button type="button" disabled={!!busy} onClick={() => run('save', () => monthlyReports.update(report._id, { summary, nextSteps }), report.status === 'approved' ? 'Salvo. Aprove de novo para enviar.' : 'Rascunho salvo')}
                        className="min-h-10 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300">Salvar</button>
                )}
                {report.status === 'draft' && !dirty && (
                    <button type="button" disabled={!!busy || summary.trim().length < 20} onClick={() => run('approve', () => monthlyReports.approve(report._id), 'Relatório aprovado')}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                        <Check size={15} aria-hidden /> Aprovar relatório
                    </button>
                )}
            </div>

            {report.status !== 'draft' && (
                <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aviso para a família (WhatsApp)</p>
                    {sent ? (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{report.familyMessage}<span className="mt-1 block text-xs text-gray-500">Enviado{report.phoneLast4 ? ` para o final ${report.phoneLast4}` : ''}. O PDF você anexa pelo botão acima, se a família pedir.</span></p>
                    ) : (
                        <>
                            <textarea aria-label="Aviso para a família" rows={4} value={family} onChange={(e) => setFamily(e.target.value)} className={`${inputCls} mt-1`} />
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className={`text-xs ${familyProblem ? 'text-amber-700' : 'text-gray-500'}`}>{familyProblem || 'O PDF não vai junto: baixe e anexe se a família pedir.'}</span>
                                <button type="button" disabled={!!busy || !!familyProblem} onClick={() => run('send', () => monthlyReports.send(report._id, family.trim()), 'Aviso enviado para a família')}
                                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                                    <MessageCircle size={15} aria-hidden /> Enviar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function MonthlyReportsSection({ patientId, patientName }: { patientId: string; patientName: string }) {
    const [list, setList] = useState<MonthlyReport[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [month, setMonth] = useState(defaultReportMonth());
    const [openId, setOpenId] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);

    const load = useCallback(async () => {
        try { setLoadError(false); setList(await monthlyReports.list(patientId)); }
        catch { setLoadError(true); }
    }, [patientId]);
    useEffect(() => { load(); }, [load]);

    const upsert = (r: MonthlyReport) => setList(prev => [r, ...(prev || []).filter(x => x._id !== r._id)].sort((a, b) => b.month.localeCompare(a.month)));
    const open = useMemo(() => list?.find(r => r._id === openId) || null, [list, openId]);

    const generate = async () => {
        setGenerating(true);
        try { const r = await monthlyReports.generate(patientId, month); upsert(r); setOpenId(r._id); }
        catch (e) { toast.error(errMsg(e, 'Não foi possível gerar o relatório.')); }
        finally { setGenerating(false); }
    };

    if (open) return <ReportEditor report={open} patientName={patientName} onChange={upsert} onBack={() => setOpenId(null)} />;

    return (
        <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Mês
                    <input type="month" value={month} max={defaultReportMonth(new Date(Date.now() + 40 * 86400000))} onChange={(e) => setMonth(e.target.value)}
                        className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100" />
                </label>
                <button type="button" onClick={generate} disabled={generating || !month} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                    <FileText size={15} aria-hidden /> {generating ? 'Gerando…' : `Gerar relatório de ${monthLabel(month)}`}
                </button>
                <p className="w-full text-xs text-gray-500">Usa só evoluções finalizadas. Enquanto for rascunho, gerar de novo atualiza os números.</p>
            </div>

            {loadError ? (
                <div className="py-8 text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Não foi possível carregar os relatórios.</p>
                    <button type="button" onClick={load} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><RefreshCw size={14} aria-hidden /> Tentar de novo</button>
                </div>
            ) : !list ? (
                <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" aria-busy="true" />
            ) : list.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">Nenhum relatório mensal ainda.</p>
            ) : (
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-slate-800 dark:border-gray-700 dark:bg-slate-900">
                    {list.map(r => (
                        <li key={r._id}>
                            <button type="button" onClick={() => setOpenId(r._id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800">
                                <span>
                                    <span className="block text-sm font-semibold capitalize text-gray-900 dark:text-gray-50">{monthLabel(r.month)}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{r.data.sessionsWithEvolution} sessões · presença {r.data.attendance.rate != null ? `${r.data.attendance.rate}%` : '—'}</span>
                                </span>
                                <span className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
