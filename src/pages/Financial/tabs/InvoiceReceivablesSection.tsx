import {
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleDollarSign,
    FileText,
    Loader2,
    Pencil,
    ReceiptText,
    WalletCards,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { extractErrorMessage } from '../../../utils/errorUtils';
import {
    getInvoiceReceivables,
    InvoiceReceivable,
    InvoiceReceivableGuide,
    receiveInvoiceBatch,
    updateInvoiceNumber,
} from '../../../services/insuranceBatchReceiptService';

// Cada NF é um card expansível com as guias dentro — 10 já ocupa a tela inteira.
const PER_PAGE = 10;

const money = (value: number) => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

const date = (value?: string | null) => value
    ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : 'Data não informada';

interface ReceiptTarget {
    invoice: InvoiceReceivable;
    guide?: InvoiceReceivableGuide;
}

interface Props {
    onCountChange?: (count: number) => void;
    onChanged?: () => void;
    // Filtro compartilhado com as outras sub-abas de Convênios (ver
    // InsuranceFilterBar/InsuranceTab) — o valor vive no componente pai para
    // não se perder ao trocar de aba.
    nfFilter: string;
    patientFilter: string;
}

// React StrictMode monta efeitos duas vezes em desenvolvimento. Compartilhar a
// promise em voo evita duas chamadas idênticas sem transformar dados financeiros
// em cache persistente: concluída a request, a próxima atualização consulta o back.
let receivablesRequest: ReturnType<typeof getInvoiceReceivables> | null = null;
function fetchInvoiceReceivables() {
    if (!receivablesRequest) {
        receivablesRequest = getInvoiceReceivables('all').finally(() => {
            receivablesRequest = null;
        });
    }
    return receivablesRequest;
}

function StatusBadge({ status }: { status: InvoiceReceivable['status'] }) {
    if (status === 'received') {
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-2xs font-bold text-emerald-700">
                <Check size={11} /> Baixada
            </span>
        );
    }
    const partial = status === 'partial';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-2xs font-bold ${
            partial
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
        }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${partial ? 'bg-amber-500' : 'bg-blue-500'}`} />
            {partial ? 'Recebimento parcial' : 'Aguardando recebimento'}
        </span>
    );
}

export default function InvoiceReceivablesSection({ onCountChange, onChanged, nfFilter, patientFilter }: Props) {
    const [invoices, setInvoices] = useState<InvoiceReceivable[]>([]);
    const [view, setView] = useState<'pending' | 'received'>('pending');
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);
    const [target, setTarget] = useState<ReceiptTarget | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
    const [page, setPage] = useState(1);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceReceivable | null>(null);
    const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
    const [updatingInvoice, setUpdatingInvoice] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchInvoiceReceivables();
            setInvoices(data);
            onCountChange?.(data.filter(invoice => invoice.status !== 'received' && invoice.pendingAmount > 0).length);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Não foi possível carregar as notas fiscais'));
        } finally {
            setLoading(false);
        }
    }, [onCountChange]);

    useEffect(() => { void load(); }, [load]);

    useEffect(() => {
        const refresh = () => { void load(); };
        window.addEventListener('cash:refresh', refresh);
        return () => window.removeEventListener('cash:refresh', refresh);
    }, [load]);

    const pendingInvoices = useMemo(
        () => invoices.filter(invoice => invoice.status !== 'received' && invoice.pendingAmount > 0),
        [invoices]
    );
    const receivedInvoices = useMemo(
        () => invoices.filter(invoice => invoice.status === 'received'),
        [invoices]
    );
    const allVisibleInvoices = view === 'pending' ? pendingInvoices : receivedInvoices;

    // Filtro por número de NF e por paciente — a lista já cresce rápido (17
    // notas hoje, tende a virar centenas/milhares) e sem isso fica inviável
    // achar uma nota específica só rolando a página.
    const filteredInvoices = useMemo(() => {
        const nfQuery = nfFilter.trim().toLowerCase();
        const patientQuery = patientFilter.trim().toLowerCase();
        if (!nfQuery && !patientQuery) return allVisibleInvoices;
        return allVisibleInvoices.filter(invoice => {
            const matchesNf = !nfQuery || (invoice.invoiceNumber || '').toLowerCase().includes(nfQuery);
            const matchesPatient = !patientQuery || (invoice.patient?.fullName || '').toLowerCase().includes(patientQuery);
            return matchesNf && matchesPatient;
        });
    }, [allVisibleInvoices, nfFilter, patientFilter]);

    // Paginação no cliente: a lista já vem inteira do backend, já mesclada por
    // número de NF (ver mergeReceivablesByInvoice em InsuranceBatchReceiptService).
    // Cada item aqui é uma NF; se ela cobriu mais de um lançamento/remessa, isso
    // já vem somado nas guias e nos totais — o front só exibe.
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const visibleInvoices = filteredInvoices.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    // Trocar Pendentes/Baixadas ou mudar um filtro volta para a primeira
    // página — continuar na página 3 de uma lista filtrada menor deixaria a
    // tela vazia.
    useEffect(() => { setPage(1); }, [view, nfFilter, patientFilter]);

    const summary = useMemo(() => ({
        partial: pendingInvoices.filter(invoice => invoice.status === 'partial').length,
        pending: pendingInvoices.reduce((sum, invoice) => sum + invoice.pendingAmount, 0),
        received: receivedInvoices.reduce((sum, invoice) => sum + invoice.receivedAmount, 0),
    }), [pendingInvoices, receivedInvoices]);

    const toggleExpanded = (batchId: string) => setExpanded(current => {
        const next = new Set(current);
        if (next.has(batchId)) next.delete(batchId);
        else next.add(batchId);
        return next;
    });

    // Uma NF mesclada pode representar mais de um InsuranceBatch (batchIds).
    // Não existe transação atômica cruzando batches diferentes, então cada
    // baixa roda em sequência; se uma falhar no meio, as anteriores já foram
    // aplicadas (idempotentes numa nova tentativa — reenviar não duplica).
    const confirmReceipt = async () => {
        if (!target) return;
        setReceiving(true);
        try {
            const guideId = target.guide?.guideId || undefined;
            const batchIds = target.guide?.batchIds?.length ? target.guide.batchIds : target.invoice.batchIds;
            let anyIdempotent = false;
            for (const batchId of batchIds) {
                const result = await receiveInvoiceBatch(batchId, {
                    receivedDate,
                    guideIds: guideId ? [guideId] : undefined,
                });
                if (result.idempotent) anyIdempotent = true;
            }
            toast.success(target.guide
                ? `Guia ${target.guide.number} recebida e refletida no financeiro.`
                : `Baixa da NF ${target.invoice.invoiceNumber} registrada no financeiro.`);
            setTarget(null);
            await load();
            onChanged?.();
            if (anyIdempotent) toast.info('Parte dos pagamentos selecionados já estava recebida.');
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Não foi possível registrar a baixa'));
        } finally {
            setReceiving(false);
        }
    };

    // Idem: se a NF mesclada vier de mais de um batch, o número precisa ser
    // atualizado em todos para continuarem agrupados na próxima consulta.
    const handleUpdateInvoiceNumber = async () => {
        if (!editingInvoice) return;
        setUpdatingInvoice(true);
        try {
            const batchIds = editingInvoice.batchIds?.length ? editingInvoice.batchIds : [editingInvoice.batchId];
            for (const batchId of batchIds) {
                await updateInvoiceNumber(batchId, editInvoiceNumber.trim());
            }
            toast.success(`Número da NF atualizado para ${editInvoiceNumber.trim()}.`);
            setEditingInvoice(null);
            setEditInvoiceNumber('');
            await load();
            onChanged?.();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Não foi possível atualizar o número da NF'));
        } finally {
            setUpdatingInvoice(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                {[0, 1, 2].map(item => <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-white" />)}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white">
                        <ReceiptText size={16} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900">Controle por nota fiscal</h2>
                        <p className="truncate text-2xs text-slate-500">Clique em uma NF para conferir guias e registrar a baixa.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                        <button type="button" onClick={() => setView('pending')} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${view === 'pending' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            Pendentes <span className="ml-1 opacity-80">{pendingInvoices.length}</span>
                        </button>
                        <button type="button" onClick={() => setView('received')} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${view === 'received' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            Baixadas <span className="ml-1 opacity-80">{receivedInvoices.length}</span>
                        </button>
                    </div>
                    {view === 'pending' ? (
                        <>
                            {summary.partial > 0 && <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700">{summary.partial} parcial{summary.partial !== 1 ? 'is' : ''}</span>}
                            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">Saldo {money(summary.pending)}</span>
                        </>
                    ) : (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-black text-emerald-700">Recebido {money(summary.received)}</span>
                    )}
                </div>
            </section>

            {visibleInvoices.length === 0 ? (
                <section className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-6 py-14 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={25} />
                    </div>
                    {nfFilter || patientFilter ? (
                        <>
                            <h3 className="mt-3 text-base font-black text-slate-900">Nenhuma NF encontrada</h3>
                            <p className="mt-1 text-sm text-slate-500">Nenhum resultado para os filtros aplicados.</p>
                        </>
                    ) : (
                        <>
                            <h3 className="mt-3 text-base font-black text-slate-900">{view === 'pending' ? 'Tudo certo por aqui' : 'Nenhuma baixa registrada'}</h3>
                            <p className="mt-1 text-sm text-slate-500">{view === 'pending' ? 'Nenhuma nota fiscal possui saldo aguardando recebimento.' : 'As notas aparecerão aqui depois da baixa financeira.'}</p>
                        </>
                    )}
                </section>
            ) : visibleInvoices.map(invoice => {
                const isExpanded = expanded.has(invoice.batchId);
                const progress = invoice.totalNet > 0
                    ? Math.min(100, Math.round((invoice.receivedAmount / invoice.totalNet) * 100))
                    : 0;
                const cardTone = invoice.status === 'received'
                    ? 'border-emerald-100 bg-emerald-50/40'
                    : invoice.status === 'partial'
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200 bg-blue-50/30';
                return (
                    <article key={invoice.batchId} className={`overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md ${cardTone}`}>
                        <button type="button" onClick={() => toggleExpanded(invoice.batchId)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/60 sm:px-4">
                            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${invoice.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                    <h3 className="truncate text-sm font-black text-slate-950">NF {invoice.invoiceNumber}</h3>
                                    <button
                                        type="button"
                                        onClick={event => {
                                            event.stopPropagation();
                                            setEditingInvoice(invoice);
                                            setEditInvoiceNumber(invoice.invoiceNumber || '');
                                        }}
                                        className="inline-flex items-center gap-1 rounded-md p-1 text-2xs font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                                        title="Editar número da NF"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                    <StatusBadge status={invoice.status} />
                                    {invoice.batchIds.length > 1 && (
                                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-3xs font-bold text-violet-700">
                                            {invoice.batchIds.length} lançamentos
                                        </span>
                                    )}
                                    {invoice.origin === 'legacy_reconciliation' && <span className="hidden rounded-full bg-violet-50 px-2 py-0.5 text-3xs font-bold text-violet-700 lg:inline">Legado</span>}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                    <span className="font-bold text-slate-700">{invoice.patient?.fullName || 'Paciente não identificado'}</span>
                                    <span className="mx-1.5">·</span>{invoice.insuranceProvider}
                                    <span className="mx-1.5">·</span>{view === 'received' ? `baixada em ${date(invoice.receivedAt)}` : date(invoice.invoiceDate)}
                                    <span className="mx-1.5">·</span>{invoice.guides.length} guia{invoice.guides.length !== 1 ? 's' : ''} / {invoice.sessions} sessões
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{view === 'pending' ? 'Saldo' : 'Recebido'}</p>
                                <p className={`whitespace-nowrap text-sm font-black ${view === 'pending' ? 'text-amber-700' : 'text-emerald-700'}`}>{money(view === 'pending' ? invoice.pendingAmount : invoice.receivedAmount)}</p>
                            </div>
                            <span className={`grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition ${isExpanded ? 'bg-slate-200' : 'bg-slate-100'}`}>
                                {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                            </span>
                        </button>

                        {isExpanded && (
                            <div className="border-t border-slate-200 bg-slate-50/70 px-4 pb-2 pt-3 sm:px-5">
                                <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                                    <span className="rounded-lg bg-white px-3 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200">Bruto <strong className="ml-1 text-slate-800">{money(invoice.totalGross)}</strong></span>
                                    <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs text-emerald-600">Recebido <strong className="ml-1 text-emerald-700">{money(invoice.receivedAmount)}</strong></span>
                                    <div className="mx-1 h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-slate-200">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-2xs font-black text-slate-500">{progress}%</span>
                                    {view === 'pending' && (
                                        <button type="button" onClick={() => setTarget({ invoice })} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700">
                                            <WalletCards size={14} /> Baixar saldo da NF
                                        </button>
                                    )}
                                </div>
                                {invoice.guides.map(guide => (
                                    <div key={guide.guideId || guide.number} className="flex flex-col gap-2 border-b border-slate-200/70 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                                                guide.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                                            }`}>
                                                {guide.status === 'received' ? <Check size={15} /> : <CircleDollarSign size={15} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-extrabold text-slate-900">Guia {guide.number}</p>
                                                <p className="truncate text-xs text-slate-500">{guide.specialty || 'Especialidade não informada'} · {guide.sessions} sessões · {money(guide.grossAmount)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 pl-11 sm:pl-0">
                                            <span className={`rounded-full px-2.5 py-1 text-3xs font-bold ${
                                                guide.status === 'received'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : guide.status === 'partial'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {guide.status === 'received' ? 'Recebida' : guide.status === 'partial' ? 'Parcial' : `${guide.pendingSessions} pendente(s)`}
                                            </span>
                                            {view === 'pending' && guide.status !== 'received' && guide.guideId && (
                                                <button type="button" onClick={() => setTarget({ invoice, guide })} className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50">
                                                    Baixar guia
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </article>
                );
            })}

            {totalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3" aria-label="Paginação das notas fiscais">
                    <p className="text-xs font-semibold text-slate-500">
                        {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, filteredInvoices.length)} de {filteredInvoices.length} nota{filteredInvoices.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setPage(n)}
                                aria-current={n === currentPage ? 'page' : undefined}
                                className={`min-w-[2rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                                    n === currentPage
                                        ? 'bg-slate-900 text-white'
                                        : 'border border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Próxima
                        </button>
                    </div>
                </nav>
            )}

            {editingInvoice && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="edit-invoice-title">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                            <div className="flex gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Pencil size={19} /></div>
                                <div>
                                    <h3 id="edit-invoice-title" className="text-base font-black text-slate-950">Editar número da NF</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">NF {editingInvoice.invoiceNumber}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => !updatingInvoice && setEditingInvoice(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar"><X size={18} /></button>
                        </div>
                        <div className="space-y-4 px-5 py-5">
                            <div>
                                <label htmlFor="invoice-number-edit" className="mb-1.5 block text-xs font-bold text-slate-700">Número da nota fiscal</label>
                                <input id="invoice-number-edit" type="text" value={editInvoiceNumber} onChange={event => setEditInvoiceNumber(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Digite o número da NF" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
                            <button type="button" onClick={() => setEditingInvoice(null)} disabled={updatingInvoice} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">Cancelar</button>
                            <button type="button" onClick={handleUpdateInvoiceNumber} disabled={updatingInvoice || !editInvoiceNumber.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                {updatingInvoice ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                                {updatingInvoice ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {target && (
                <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
                            <div className="flex gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><WalletCards size={19} /></div>
                                <div>
                                    <h3 id="receipt-title" className="text-base font-black text-slate-950">Confirmar baixa financeira</h3>
                                    <p className="mt-0.5 text-xs text-slate-500">NF {target.invoice.invoiceNumber}{target.guide ? ` · Guia ${target.guide.number}` : ' · saldo restante'}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => !receiving && setTarget(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar"><X size={18} /></button>
                        </div>
                        <div className="space-y-4 px-5 py-5">
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">
                                Esta ação registra entrada real no financeiro e atualiza os Payments faturados deste recorte.
                            </div>
                            <div>
                                <label htmlFor="invoice-received-date" className="mb-1.5 block text-xs font-bold text-slate-700">Data do recebimento</label>
                                <input id="invoice-received-date" type="date" value={receivedDate} onChange={event => setReceivedDate(event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
                            <button type="button" onClick={() => setTarget(null)} disabled={receiving} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50">Cancelar</button>
                            <button type="button" onClick={confirmReceipt} disabled={receiving || !receivedDate} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                                {receiving ? <Loader2 size={16} className="animate-spin" /> : <WalletCards size={16} />}
                                {receiving ? 'Registrando...' : 'Confirmar baixa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
