// src/pages/Financial/tabs/PaymentsTab.tsx
// Financeiro › Pagamentos. Lista os pagamentos de verdade do período (inclusive venda de
// pacote, baixa de convênio, liminar e quitação de dívida) e as sessões realizadas sem
// pagamento ("a cobrar"), com chips com contagem e paginação no servidor.
// As ações por sessão (registrar, editar, cancelar) continuam na visão "Sessões do período".
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '../../../utils/toast';
import { getPaymentsLedger, LedgerItem, LedgerResponse, LedgerSituacao } from '../../../services/paymentService';
import { useDoctorsContext } from '../../../contexts/DoctorsContext';
import { brl, Chip, fmtDay, KpiStrip, Pager, PeriodBar, PeriodRange, Pill, rangeFor, Tone } from '../components/finUi';
import type { FinancialRecord } from '../../../services/paymentService';

const PaymentPage = lazy(() => import('../../../components/financial/PaymentPage'));

const TIPO: Record<string, { label: string; tone: Tone }> = {
    particular: { label: 'Particular', tone: 'gray' },
    pacote: { label: 'Pacote', tone: 'green' },
    convenio: { label: 'Convênio', tone: 'blue' },
    liminar: { label: 'Liminar', tone: 'violet' },
};
const FORMA: Record<string, string> = {
    pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro', transferencia: 'Transferência', multi: 'Mais de uma', outros: 'Outras',
};
const METHOD_LABEL: Record<string, string> = {
    pix: 'Pix', dinheiro: 'Dinheiro', cash: 'Dinheiro', cartao_credito: 'Crédito', credit_card: 'Crédito', credito: 'Crédito',
    cartao_debito: 'Débito', debit_card: 'Débito', debito: 'Débito', cartao: 'Cartão', card: 'Cartão',
    transferencia_bancaria: 'Transferência', transferencia: 'Transferência', transfer: 'Transferência',
    convenio: 'Convênio', liminar_credit: 'Liminar',
};
const STATUS: Record<string, { label: string; tone: Tone }> = {
    paid: { label: 'Pago', tone: 'green' },
    partial: { label: 'Parcial', tone: 'blue' },
    pending: { label: 'Pendente', tone: 'amber' },
    canceled: { label: 'Cancelado', tone: 'gray' },
    refunded: { label: 'Estornado', tone: 'gray' },
    a_cobrar: { label: 'A cobrar', tone: 'amber' },
};
const SERVICE: Record<string, string> = {
    evaluation: 'Avaliação', individual_session: 'Sessão avulsa', session: 'Sessão', package_session: 'Sessão de pacote',
    tongue_tie_test: 'Teste da linguinha', neuropsych_evaluation: 'Avaliação neuropsicológica', return: 'Retorno',
    convenio_session: 'Sessão de convênio', package: 'Pacote',
};
const KIND: Record<string, string> = {
    package_receipt: 'Venda de pacote', package_payment: 'Pagamento de pacote', debt_settlement: 'Quitação de dívida',
    liminar_contract_receipt: 'Recebimento de liminar', monthly_settlement: 'Fechamento mensal', manual_adjustment: 'Ajuste manual',
};

const methodText = (it: LedgerItem) => {
    if (it.kind === 'a_cobrar') return '—';
    if (it.splitMethods && it.splitMethods.length > 1) {
        return it.splitMethods.map((m) => METHOD_LABEL[(m.method || '').toLowerCase()] || m.method).join(' + ');
    }
    const m = (it.paymentMethod || '').toLowerCase();
    return METHOD_LABEL[m] || (it.forma ? FORMA[it.forma] : '—');
};

const referente = (it: LedgerItem) => {
    if (it.paymentKind && KIND[it.paymentKind]) {
        const pk = it.package;
        return pk?.totalSessions ? `${KIND[it.paymentKind]} · ${pk.totalSessions} sessões` : KIND[it.paymentKind];
    }
    const appt = it.appointment;
    const when = appt?.date ? `${fmtDay(appt.date)}${appt.time ? ` ${appt.time}` : ''}` : it.kind === 'a_cobrar' ? `${fmtDay(it.data)}${it.hora ? ` ${it.hora}` : ''}` : '';
    const what = (it.serviceType && SERVICE[it.serviceType]) || (it.package ? 'Sessão de pacote' : 'Sessão');
    const pkg = it.package?.totalSessions ? ` · ${it.package.sessionsDone ?? 0}/${it.package.totalSessions}` : '';
    return `${what}${when ? ` ${when}` : ''}${pkg}`;
};

interface PaymentsTabProps {
    month: number;
    year: number;
    onMarkAsPaid?: (p: FinancialRecord) => void;
    onMarkAsDebit?: (p: FinancialRecord) => void;
    registerAppointmentAndPayemntFuture?: (p: FinancialRecord) => void;
    onCancelPayment?: (id: string) => void;
}

const LIMIT = 50;

export default function PaymentsTab({ month, year, onMarkAsPaid, onMarkAsDebit, registerAppointmentAndPayemntFuture, onCancelPayment }: PaymentsTabProps) {
    const [period, setPeriod] = useState<PeriodRange>(() => rangeFor('month', month, year));
    const [view, setView] = useState<'lista' | 'sessoes'>('lista');
    const [situacao, setSituacao] = useState<LedgerSituacao>('todos');
    const [tipo, setTipo] = useState('');
    const [forma, setForma] = useState('');
    const [doctorId, setDoctorId] = useState('');
    const [q, setQ] = useState('');
    const [qDebounced, setQDebounced] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<LedgerResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [patientFilter, setPatientFilter] = useState('');
    const [exporting, setExporting] = useState(false);
    const { activeDoctors } = useDoctorsContext();
    const reqId = useRef(0);

    // O mês lá de cima manda quando o período é "mês selecionado" ou "mês anterior".
    useEffect(() => {
        setPeriod((p) => (p.key === 'month' || p.key === 'last_month' ? rangeFor(p.key, month, year) : p));
    }, [month, year]);

    useEffect(() => {
        const t = setTimeout(() => setQDebounced(q.trim()), 350);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => { setPage(1); }, [period.start, period.end, situacao, tipo, forma, doctorId, qDebounced]);

    const params = useMemo(() => ({
        startDate: period.start,
        endDate: period.end,
        situacao,
        tipo: tipo || undefined,
        forma: forma || undefined,
        doctorId: doctorId || undefined,
        q: qDebounced.length >= 2 ? qDebounced : undefined,
        page,
        limit: LIMIT,
    }), [period.start, period.end, situacao, tipo, forma, doctorId, qDebounced, page]);

    const load = useCallback(async () => {
        const id = ++reqId.current;
        setLoading(true);
        setError(null);
        try {
            const res = await getPaymentsLedger(params);
            if (id === reqId.current) setData(res);
        } catch (e: any) {
            if (id === reqId.current) setError(e?.response?.data?.message || 'Não foi possível carregar os pagamentos.');
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, [params]);

    useEffect(() => { if (view === 'lista') load(); }, [load, view]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const rows: LedgerItem[] = [];
            let p = 1;
            let pages = 1;
            do {
                const res = await getPaymentsLedger({ ...params, page: p, limit: 100 });
                rows.push(...res.items);
                pages = res.pagination.pages;
                p += 1;
            } while (p <= pages && p <= 30);
            const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const header = ['Data', 'Paciente', 'Profissional', 'Referente a', 'Tipo', 'Forma', 'Situação', 'Valor'];
            const lines = rows.map((it) => [
                fmtDay(it.data), it.patient?.fullName, it.doctor?.fullName, referente(it), TIPO[it.tipo]?.label || it.tipo,
                methodText(it), STATUS[it.status]?.label || it.status, (it.amount || 0).toFixed(2).replace('.', ','),
            ].map(esc).join(';'));
            const blob = new Blob(['﻿' + [header.map(esc).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pagamentos_${period.start}_a_${period.end}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Não foi possível exportar. Tente de novo.');
        } finally {
            setExporting(false);
        }
    };

    const openSessions = (name?: string) => {
        setPatientFilter(name || '');
        setView('sessoes');
    };

    const k = data?.kpis;
    const f = data?.facets;
    const items = data?.items || [];
    const pagination = data?.pagination || { page: 1, pages: 0, total: 0, limit: LIMIT };
    const hasFilters = situacao !== 'todos' || !!tipo || !!forma || !!doctorId || qDebounced.length >= 2;
    const clearFilters = () => { setSituacao('todos'); setTipo(''); setForma(''); setDoctorId(''); setQ(''); };

    return (
        <div className="space-y-4 p-1 sm:p-2">
            <PeriodBar value={period} month={month} year={year} onChange={setPeriod}
                right={
                    <div className="flex flex-wrap items-center gap-2">
                        <Chip on={view === 'lista'} onClick={() => setView('lista')} label="Lista de pagamentos" />
                        <Chip on={view === 'sessoes'} onClick={() => openSessions('')} label="Sessões do período (ações)" />
                    </div>
                } />

            {view === 'sessoes' ? (
                <div className="space-y-2">
                    {patientFilter && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            Mostrando só <b>{patientFilter}</b>.
                            <button type="button" className="font-semibold underline" onClick={() => setPatientFilter('')}>Ver todos</button>
                        </div>
                    )}
                    <Suspense fallback={<div className="py-10 text-center text-sm text-gray-500">Carregando sessões…</div>}>
                        <PaymentPage
                            onMarkAsPaid={onMarkAsPaid}
                            onMarkAsDebit={onMarkAsDebit}
                            registerAppointmentAndPayemntFuture={registerAppointmentAndPayemntFuture}
                            onCancelPayment={onCancelPayment}
                            enabled
                            month={month}
                            year={year}
                            range={{ start: period.start, end: period.end }}
                            patientFilter={patientFilter}
                        />
                    </Suspense>
                </div>
            ) : (
                <>
                    <KpiStrip loading={loading && !data} items={[
                        { label: 'Recebido', value: brl(k?.recebido.total), sub: `${k?.recebido.count ?? 0} pagamentos · regra oficial do caixa`, hero: true, onClick: () => setSituacao('paid') },
                        { label: 'A cobrar', value: brl(k?.aCobrar.total), sub: `${k?.aCobrar.count ?? 0} sessões realizadas sem pagamento`, onClick: () => setSituacao('a_cobrar') },
                        { label: 'Parcial', value: brl(k?.parcial.total), sub: `${k?.parcial.count ?? 0} pagamentos`, onClick: () => setSituacao('partial') },
                        { label: 'Cancelado ou estornado', value: brl(k?.cancelado.total), sub: `${k?.cancelado.count ?? 0} pagamentos`, onClick: () => setSituacao('canceled') },
                    ]} />

                    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        <div className="space-y-2 border-b border-gray-200 px-3 py-3 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="mr-1 text-xs font-semibold text-gray-500">Situação</span>
                                <Chip on={situacao === 'todos'} onClick={() => setSituacao('todos')} label="Todos" count={f?.status.todos ?? '–'} />
                                <Chip on={situacao === 'paid'} onClick={() => setSituacao('paid')} label="Pagos" count={f?.status.paid ?? '–'} />
                                <Chip on={situacao === 'a_cobrar'} warn={(f?.status.a_cobrar ?? 0) > 0} onClick={() => setSituacao('a_cobrar')} label="A cobrar" count={f?.status.a_cobrar ?? '–'} />
                                <Chip on={situacao === 'pending'} onClick={() => setSituacao('pending')} label="Pendentes" count={f?.status.pending ?? '–'} />
                                <Chip on={situacao === 'partial'} onClick={() => setSituacao('partial')} label="Parciais" count={f?.status.partial ?? '–'} />
                                <Chip on={situacao === 'canceled'} onClick={() => setSituacao('canceled')} label="Cancelados" count={f?.status.canceled ?? '–'} />
                            </div>
                            {situacao !== 'a_cobrar' && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 text-xs font-semibold text-gray-500">Tipo</span>
                                    {Object.entries(TIPO).map(([key, t]) => (
                                        <Chip key={key} on={tipo === key} onClick={() => setTipo(tipo === key ? '' : key)} label={t.label} count={f?.tipo[key] ?? 0} />
                                    ))}
                                    <span className="ml-2 mr-1 text-xs font-semibold text-gray-500">Forma</span>
                                    {Object.entries(FORMA).filter(([key]) => (f?.forma[key] ?? 0) > 0 || forma === key).map(([key, label]) => (
                                        <Chip key={key} on={forma === key} onClick={() => setForma(forma === key ? '' : key)} label={label} count={f?.forma[key] ?? 0} />
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente (2 letras ou mais)"
                                    aria-label="Buscar paciente" className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm sm:max-w-xs" />
                                <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Profissional"
                                    className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm">
                                    <option value="">Todos os profissionais</option>
                                    {(activeDoctors || []).map((d: any) => <option key={d._id} value={d._id}>{d.fullName}</option>)}
                                </select>
                                <button type="button" onClick={exportCsv} disabled={exporting || !pagination.total}
                                    className="ml-auto h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                                    {exporting ? 'Exportando…' : 'Exportar CSV'}
                                </button>
                            </div>
                        </div>

                        {error ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm">
                                <p className="font-semibold text-red-700">{error}</p>
                                <button type="button" onClick={load} className="rounded-lg border border-gray-300 px-3 py-1.5 font-semibold">Tentar de novo</button>
                            </div>
                        ) : !loading && items.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-gray-500">
                                <p>Nada em {period.start === period.end ? fmtDay(period.start) : `${fmtDay(period.start)} a ${fmtDay(period.end)}`} {hasFilters ? 'com esses filtros' : ''}.</p>
                                {hasFilters && <button type="button" onClick={clearFilters} className="font-semibold text-emerald-700 underline">Limpar filtros</button>}
                            </div>
                        ) : (
                            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2">Data</th>
                                            <th className="px-3 py-2">Paciente</th>
                                            <th className="hidden px-3 py-2 md:table-cell">Profissional</th>
                                            <th className="hidden px-3 py-2 lg:table-cell">Referente a</th>
                                            <th className="px-3 py-2">Tipo</th>
                                            <th className="hidden px-3 py-2 sm:table-cell">Forma</th>
                                            <th className="px-3 py-2">Situação</th>
                                            <th className="px-3 py-2 text-right">Valor</th>
                                            <th className="px-3 py-2"><span className="sr-only">Ações</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((it) => {
                                            const st = STATUS[it.status] || { label: it.status, tone: 'gray' as Tone };
                                            const tp = TIPO[it.tipo] || { label: it.tipo, tone: 'gray' as Tone };
                                            return (
                                                <tr key={it._id} className="align-top">
                                                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-gray-700">{fmtDay(it.data)}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-semibold text-gray-900">{it.patient?.fullName || 'Paciente não identificado'}</div>
                                                        <div className="text-xs text-gray-500 md:hidden">{it.doctor?.fullName}</div>
                                                        <div className="text-xs text-gray-500 lg:hidden">{referente(it)}</div>
                                                    </td>
                                                    <td className="hidden px-3 py-2 text-gray-700 md:table-cell">{it.doctor?.fullName || '—'}</td>
                                                    <td className="hidden px-3 py-2 text-gray-700 lg:table-cell">{referente(it)}</td>
                                                    <td className="px-3 py-2"><Pill tone={tp.tone}>{tp.label}</Pill></td>
                                                    <td className="hidden whitespace-nowrap px-3 py-2 text-gray-700 sm:table-cell">{methodText(it)}</td>
                                                    <td className="px-3 py-2"><Pill tone={st.tone}>{st.label}</Pill></td>
                                                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-gray-900">{brl(it.amount)}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        {(it.kind === 'a_cobrar' || it.appointment) && (
                                                            <button type="button" onClick={() => openSessions(it.patient?.fullName)}
                                                                className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold ${it.kind === 'a_cobrar'
                                                                    ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                                                {it.kind === 'a_cobrar' ? 'Registrar' : 'Ações'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-sm text-gray-500 sm:px-4">
                            <Pager page={pagination.page} pages={pagination.pages} total={pagination.total} limit={pagination.limit} onPage={setPage} busy={loading} />
                            <span>Total filtrado <b className="tabular-nums text-gray-900">{brl(data?.totalFiltrado)}</b></span>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
