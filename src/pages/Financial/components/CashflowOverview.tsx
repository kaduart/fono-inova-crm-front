import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { CashflowV2Data } from '../../../services/cashflowService';
import { commercialService, PackageEndingItem } from '../../../services/commercialService';
import { renewalMessage, specialtyText } from '../../../components/commercial/commercialCopy';
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const button = 'min-h-10 rounded-lg border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-950';
const primary = 'min-h-10 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2';
interface Props {
    agendaSummary?: ReactNode; onMetric?: (key: 'caixa' | 'previsto' | 'receber' | 'ticket') => void; data: CashflowV2Data; periodLabel: string; patientsWithoutNext: number; patientsLoading: boolean; patientsError: boolean;
    patientsImpact: number; recurrent: number; onSchedule: () => void; onCollect: () => void;
    onBill: () => void; slotsAtRisk: number; slotImpact: number; onFit: () => void; onContact: (phone: string, text?: string) => void;
    /** Faltas/cancelamentos do dia: abre a lista com "oferecer remarcação". */
    onMissed?: () => void;
    /** Lista de pacientes sem próxima sessão (já carregada pela tela) para citar os primeiros nomes. */
    patientsTop?: { name: string; isRecurrent?: boolean }[];
}
// Fila de renovação não depende da data: busca uma vez por montagem (antes rebuscava a cada atualização).
let packagesCache: { at: number; items: PackageEndingItem[] } | null = null;
export default function CashflowOverview(p: Props) {
    const { data } = p;
    const [packages, setPackages] = useState<PackageEndingItem[]>(packagesCache?.items || []);
    const [packageState, setPackageState] = useState<'loading' | 'ready' | 'error'>(packagesCache ? 'ready' : 'loading');
    const [showPackages, setShowPackages] = useState(false);
    useEffect(() => {
        if (packagesCache && Date.now() - packagesCache.at < 5 * 60_000) return;
        let active = true;
        commercialService.packageEnding().then(items => { packagesCache = { at: Date.now(), items }; if (active) { setPackages(items); setPackageState('ready'); } })
            .catch(() => { if (active) setPackageState('error'); });
        return () => { active = false; };
    }, []);
    // Renovar: 1 sessão restante primeiro; resumo por especialidade.
    const sortedPackages = useMemo(() => [...packages].sort((a, b) => a.remaining - b.remaining), [packages]);
    const lastOne = packages.filter(item => item.remaining <= 1).length;
    const bySpecialty = useMemo(() => {
        const m = new Map<string, number>();
        packages.forEach(item => { const k = specialtyText(item.specialty) || 'Sem especialidade'; m.set(k, (m.get(k) || 0) + 1); });
        return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ');
    }, [packages]);
    const pending = data.pendentesCobranca || [];
    const bills = data.conveniosAtendidos || [];
    const caixa = data.caixa.total;
    const previsto = data.agenda?.previsto || 0;
    const pct = previsto > 0 ? Math.min(100, Math.round((caixa / previsto) * 100)) : null;
    const variacao = Number(data.comparativos.variacaoVsOntem || 0);
    const isDay = p.periodLabel === 'do Dia';
    const pendingTotal = pending.reduce((sum, item) => sum + item.valor, 0);
    const billsTotal = bills.reduce((s, i) => s + i.valor, 0);
    const missed = data.agenda?.faltasOuCancelados || 0;
    const missedValue = data.agenda?.perdido || 0;
    // Nomes sem repetição: "Isis · 2 atendimentos" em vez de "Isis, Isis".
    const pendingNames = useMemo(() => {
        const m = new Map<string, number>();
        pending.forEach(item => m.set(item.paciente, (m.get(item.paciente) || 0) + 1));
        const names = [...m.entries()].map(([n, c]) => (c > 1 ? `${n} · ${c} atendimentos` : n));
        return `${names.slice(0, 3).join(', ')}${names.length > 3 ? ` e mais ${names.length - 3}` : ''}`;
    }, [pending]);
    const topWithoutNext = (p.patientsTop || []).slice(0, 3).map(item => item.name).filter(Boolean).join(', ');
    const atStake = pendingTotal + missedValue + (p.patientsWithoutNext > 0 ? p.patientsImpact : 0) + billsTotal;
    // Visual aprovado em 31/10: o caixa é o destaque (número grande + barra do previsto).
    const cell = (key: 'caixa' | 'previsto' | 'receber' | 'ticket') => p.onMetric ? {
        role: 'button', tabIndex: 0, title: 'Clique para ver a lista', onClick: () => p.onMetric!(key),
        onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onMetric!(key); } },
    } : {};
    const cellCls = `min-w-0 border-gray-200 px-4 py-4 dark:border-gray-700 ${p.onMetric ? 'group cursor-pointer hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 dark:hover:bg-gray-800' : ''}`;
    const label = 'text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300';
    const more = (text: string) => p.onMetric ? <dd className="mt-1.5 text-xs font-semibold text-emerald-700 group-hover:underline dark:text-emerald-300">{text} ›</dd> : null;
    // Do previsto ao caixa: só soma números que o banco já devolve; o resto é "sem explicação".
    const entrou = Math.min(caixa, previsto);
    const bridge: [string, number, string][] = [
        ['entrou no caixa', entrou, 'bg-emerald-600'], ['atendido sem pagamento', pendingTotal, 'bg-red-600'], ['convênio a faturar', billsTotal, 'bg-blue-600'],
    ];
    const explained = bridge.reduce((s, [, v]) => s + v, 0);
    const rest = Math.max(0, previsto - explained);
    return <div id="cashflow-overview" className="mb-5 scroll-mt-24 space-y-3 text-left text-gray-900 dark:text-gray-100">
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-gray-200 bg-white lg:grid-cols-[1.4fr_1fr_1fr_1fr] dark:border-gray-700 dark:bg-gray-900">
            <div {...cell('caixa')} className={`${cellCls} col-span-2 border-b lg:col-span-1 lg:border-b-0 lg:border-r`}>
                <dt className={label}>Caixa recebido {p.periodLabel.toLowerCase()}</dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{money(caixa)}</dd>
                {pct !== null && <dd className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-label={`${pct}% do previsto`}><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} /></dd>}
                <dd className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">
                    {pct !== null ? `${pct}% do previsto` : 'Sem previsto na agenda'}
                    {isDay && <> · <span className={variacao >= 0 ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-red-700 dark:text-red-400'}>{variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span> vs ontem ({money(data.comparativos.ontem)})</>}
                </dd>
                {more(`Ver ${plural(data.transacoes?.length || 0, 'recebimento', 'recebimentos')}`)}
            </div>
            <div {...cell('previsto')} className={`${cellCls} border-r`}>
                <dt className={label}>Previsto da agenda</dt>
                <dd className="mt-2 text-xl font-bold tabular-nums">{data.agenda ? money(previsto) : 'Não disponível'}</dd>
                <dd className="mt-1 text-xs text-gray-600 dark:text-gray-300">{data.agenda ? `${data.agenda.sessoes} sessões · faltas e cancelamentos fora` : 'Atualize o backend para consultar'}</dd>
                {more('Ver agenda')}
            </div>
            <div {...cell('receber')} className={`${cellCls} lg:border-r`}>
                <dt className={label}>A receber {p.periodLabel.toLowerCase()}</dt>
                <dd className={`mt-2 text-xl font-bold tabular-nums ${pendingTotal > 0 ? 'text-red-700 dark:text-red-400' : ''}`}>{money(pendingTotal)}</dd>
                <dd className="mt-1 text-xs text-gray-600 dark:text-gray-300">{plural(pending.length, 'atendido sem pagamento', 'atendidos sem pagamento')}</dd>
                {more('Ver quem cobrar')}
            </div>
            <div {...cell('ticket')} className={`${cellCls} col-span-2 border-t lg:col-span-1 lg:border-t-0`}>
                <dt className={label}>Ticket médio</dt>
                <dd className="mt-2 text-xl font-bold tabular-nums">{money(data.estatisticas.ticketMedio)}</dd>
                <dd className="mt-1 text-xs text-gray-600 dark:text-gray-300">caixa do mês: {money(data.comparativos.totalAcumuladoMes)}</dd>
                {more('Ver recebimentos')}
            </div>
        </dl>
        {data.agenda && previsto > 0 && <section aria-labelledby="cashflow-bridge" className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <h3 id="cashflow-bridge" className="text-sm font-semibold">Do previsto ao caixa <span className="font-normal text-gray-600 dark:text-gray-300">· para onde foram os {money(previsto)}</span></h3>
            <div className="my-2.5 flex h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" aria-hidden>
                {bridge.filter(([, v]) => v > 0).map(([k, v, c]) => <span key={k} className={c} style={{ width: `${Math.min(100, (v / previsto) * 100)}%` }} />)}
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                {bridge.map(([k, v]) => <li key={k}><b className="tabular-nums">{money(v)}</b> {k}</li>)}
                {rest > 0 && <li><b className="tabular-nums">{money(rest)}</b> pacote pago antes, liminar ou sem lançamento</li>}
                {caixa > previsto && <li className="text-gray-600 dark:text-gray-300">+ {money(caixa - previsto)} acima do previsto (pacotes e pagamentos antecipados)</li>}
            </ul>
        </section>}
        {p.agendaSummary}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="cashflow-actions" className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h3 id="cashflow-actions" className="text-sm font-semibold">O que fazer para não perder receita</h3>
                {atStake > 0 && <span className="text-xs text-gray-600 dark:text-gray-300">{money(atStake)} em jogo{packages.length ? ' · pacotes fora (valor a definir)' : ''}</span>}
            </div>
            <div className="px-4">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {pending.length > 0 && <Action n={pending.length} tone="r" primary title={pending.length === 1 ? 'Atendido sem pagamento' : 'Atendidos sem pagamento'} detail={pendingNames} value={money(pendingTotal)} label="Cobrar" onClick={p.onCollect} />}
                {missed > 0 && <Action n={missed} tone="a" title="Faltas para remarcar" detail="Remarcar ainda esta semana recupera a sessão" value={missedValue > 0 ? money(missedValue) : ''} label="Remarcar" onClick={p.onMissed || (() => undefined)} />}
                {!p.patientsLoading && !p.patientsError && p.patientsWithoutNext > 0 && <Action n={p.patientsWithoutNext} tone="a" title="Pacientes sem próxima sessão" detail={`${plural(p.recurrent, 'recorrente', 'recorrentes')}${topWithoutNext ? ` · ${topWithoutNext}` : ''}`} value={`${money(p.patientsImpact)}/mês`} label="Agendar" onClick={p.onSchedule} />}
                {packageState === 'ready' && packages.length > 0 && <Action n={packages.length} tone="g" title={`${packages.length === 1 ? 'Pacote acabando' : 'Pacotes acabando'} (até 2 sessões)`} detail={`${lastOne ? `${lastOne} na última sessão · ` : ''}${bySpecialty} · valor da nova oferta a definir`} value="" label={showPackages ? 'Fechar' : 'Renovar'} onClick={() => setShowPackages(open => !open)} />}
                {p.slotsAtRisk > 0 && <Action n={p.slotsAtRisk} tone="a" title="Horários críticos na grade" detail="Grade atual · confirme disponibilidade e candidatos" value={`${money(p.slotImpact)}/mês em risco`} label="Encaixar" onClick={p.onFit} />}
                {bills.length > 0 && <Action n={bills.length} tone="g" title="Convênio para faturar" detail="Consultar os atendimentos e suas guias" value={money(billsTotal)} label="Faturar" onClick={p.onBill} />}
            </div>
            {p.patientsLoading && <p role="status" className="mt-2 text-sm text-gray-600 dark:text-gray-300">Consultando pacientes sem próxima sessão…</p>}
            {p.patientsError && <p role="alert" className="mt-2 text-sm">Não foi possível consultar pacientes sem próxima sessão. Selecione o período novamente para tentar.</p>}
            {packageState !== 'ready' && <p role="status" className="mt-2 text-sm text-gray-600 dark:text-gray-300">{packageState === 'loading' ? 'Consultando renovações…' : 'Não foi possível consultar as renovações. Atualize a tela para tentar novamente.'}</p>}
            {!pending.length && !missed && !bills.length && !p.slotsAtRisk && !p.patientsLoading && !p.patientsError && !p.patientsWithoutNext && packageState === 'ready' && !packages.length && <p className="py-3 text-sm text-gray-600 dark:text-gray-300">Nada pendente nas filas consultadas.</p>}
            {showPackages && <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"><h4 className="mb-2 font-semibold">Pacotes para renovar <span className="text-xs font-normal text-gray-600 dark:text-gray-300">· última sessão primeiro</span></h4>{sortedPackages.map(item => <div key={item.packageId} className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 py-3 dark:border-gray-700"><div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-600 dark:text-gray-300">{specialtyText(item.specialty) || item.specialty} · {item.remaining <= 1 ? 'última sessão' : `${item.remaining} sessões restantes`}{item.doctorName ? ` · ${item.doctorName}` : ''}</p></div>{item.phone ? <button type="button" className={button} onClick={() => p.onContact(item.phone, renewalMessage({ name: item.name, specialty: item.specialty, remaining: item.remaining }))}>WhatsApp com renovação</button> : <span className="text-sm">Telefone não informado</span>}</div>)}</div>}
            <p className="my-3 text-xs text-gray-600 dark:text-gray-300">Renovações e horários críticos mostram as filas atuais. Confirme a agenda antes de oferecer um encaixe. Nenhuma mensagem é enviada sozinha.</p>
        </div></section>
        <section aria-labelledby="cashflow-origin" className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"><h3 id="cashflow-origin" className="mb-4 text-sm font-semibold">De onde veio o caixa</h3><div className="space-y-5">
            <Breakdown title="Por forma de pagamento" values={[
                ['Pix', data.caixa.pix], ['Cartão', data.caixa.cartao], ['Dinheiro', data.caixa.dinheiro], ['Transferência', data.caixa.transferencia], ['Outros', data.caixa.outros]
            ]} />
            <Breakdown title="Por tipo" values={[
                ['Particular', data.porTipo.particular], ['Pacotes', data.porTipo.pacote], ['Convênio', data.porTipo.convenio], ['Liminar', data.porTipo.liminar]
            ]} />
        </div></section>
        </div>
    </div>;
}
function Action({ n, tone, title, detail, value, label, onClick, primary: isPrimary }: { n: number; tone: 'r' | 'a' | 'g'; title: string; detail: string; value: string; label: string; onClick: () => void; primary?: boolean }) {
    // Cor pela urgência: vermelho cobrar, amarelo agendar/grade, verde oportunidade.
    const badge = { r: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', a: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', g: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' }[tone];
    return <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_6rem]">
        <span className={`rounded-lg py-1 text-center text-lg font-bold tabular-nums ${badge}`}>{n}</span>
        <div className="min-w-0"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300" title={detail}>{detail}</p></div>
        <span className={`text-sm font-bold tabular-nums sm:text-right ${tone === 'r' ? 'text-red-700 dark:text-red-400' : ''}`}>{value}</span>
        <button type="button" className={`${isPrimary ? primary : button} col-start-3 justify-self-end sm:col-start-auto sm:w-full`} onClick={onClick}>{label}</button>
    </div>;
}
const BD_COLORS = ['bg-emerald-600', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500', 'bg-gray-400'];
function Breakdown({ title, values }: { title: string; values: [string, number][] }) {
    const items = values.filter(([, value]) => value > 0);
    const total = items.reduce((s, [, v]) => s + v, 0);
    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
    return <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{title}</h4>
        {/* Com uma forma só a barra cheia não diz nada: fica só a linha. */}
        {items.length > 1 && <div className="mb-2.5 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">{items.map(([label, value], i) => <span key={label} title={`${label}: ${money(value)}`} className={BD_COLORS[i % BD_COLORS.length]} style={{ width: `${pct(value)}%` }} />)}</div>}
        <dl className="space-y-1.5">{items.map(([label, value], i) => <div key={label} className="flex items-center gap-2 text-sm"><span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${BD_COLORS[i % BD_COLORS.length]}`} /><dt className="flex-1">{label}</dt><dd className="font-semibold tabular-nums">{money(value)} <span className="font-normal text-gray-600 dark:text-gray-300">· {pct(value)}%</span></dd></div>)}</dl>
        {!items.length && <p className="text-sm text-gray-600 dark:text-gray-300">Sem recebimentos.</p>}
    </div>;
}
