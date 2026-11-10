// src/pages/Financial/tabs/ProjecaoMensalTab.tsx
// Resultados → Projeção Mensal: de onde vem cada real do fechamento.
// Mantém tudo da versão antiga (cenários, meta, realizados, particular × convênio,
// avisos, agendados e pendentes com dias) e acrescenta as listas de crédito de
// pacotes e convênio agendado, que o back já devolvia e a tela não mostrava.
import { ReactNode, useState } from 'react';
import { brl, Chip, KpiStrip, Pill } from '../components/finUi';
import {
    ApptTable, colData, colPaciente, colTipo, colValor, EmptyOrError, InsightList, monthName,
    Panel, ProjAppt, RefreshButton, ReguaFechamento, statusText, useProjecao,
} from '../components/projecaoUi';

interface Props { month?: number; year?: number }
type Lista = 'realizados' | 'agendados' | 'pendentes' | 'creditoPacotes' | 'convenioAgendado';

const now = new Date();

const ProjecaoMensalTab = ({ month = now.getMonth() + 1, year = now.getFullYear() }: Props) => {
    const { data, loading, erro, reload } = useProjecao(month, year);
    const [lista, setLista] = useState<Lista>('pendentes');

    if (erro && !data) return <EmptyOrError erro={erro} onRetry={reload} />;

    const r = data?.resumo || {};
    const c = data?.cenarios;
    const meta = data?.metas?.sugerida || 0;
    const gap = data?.metas?.gapParaMeta || 0;
    const pctMeta = Math.min(100, data?.metas?.percentualAtual || 0);
    const taxa = Math.round((data?.taxaConversaoHistorica || 0) * 100);
    const d = data?.detalhes || {};
    const listas: Record<Lista, ProjAppt[]> = {
        realizados: d.realizados || [], agendados: d.agendados || [], pendentes: d.pendentes || [],
        creditoPacotes: d.creditoPacotes || [], convenioAgendado: d.convenioAgendado || [],
    };
    const urgentes = listas.pendentes.filter((p) => (p.diasParaAtendimento ?? 99) <= 3).length;
    const partic = r.particular || 0;
    const conv = r.convenio || 0;
    const totalMix = Math.max(1, partic + conv);

    const tabelas: Record<Lista, { label: string; total: number; node: ReactNode }> = {
        pendentes: {
            label: 'Pendentes de confirmação', total: r.pendenteConfirmacao || 0,
            node: <ApptTable rows={listas.pendentes} empty="Nenhum agendamento esperando confirmação."
                rowTone={(a) => ((a.diasParaAtendimento ?? 99) <= 3 ? 'bg-red-50/70 dark:bg-red-500/10' : '')}
                cols={[colData, colPaciente, colValor, {
                    key: 'dias', label: 'Faltam', right: true,
                    render: (a) => <Pill tone={(a.diasParaAtendimento ?? 99) <= 3 ? 'red' : 'gray'}>{!a.diasParaAtendimento ? 'hoje' : a.diasParaAtendimento === 1 ? '1 dia' : `${a.diasParaAtendimento} dias`}</Pill>,
                }]} />,
        },
        agendados: {
            label: 'Agendados confirmados', total: r.agendadoConfirmado || 0,
            node: <ApptTable rows={listas.agendados} cols={[colData, colPaciente, colValor]} empty="Nenhum avulso confirmado no restante do mês." />,
        },
        convenioAgendado: {
            label: 'Convênio agendado', total: r.convenioAgendado || 0,
            node: <ApptTable rows={listas.convenioAgendado} empty="Nenhuma sessão de convênio agendada."
                cols={[colData, colPaciente, { key: 'conv', label: 'Convênio', render: (a) => a.convenio || '—' }, colValor]} />,
        },
        creditoPacotes: {
            label: 'Crédito de pacotes', total: r.creditoPacotes || 0,
            node: <ApptTable rows={listas.creditoPacotes} empty="Nenhum pacote pago com sessões a fazer."
                cols={[colPaciente,
                    { key: 'ses', label: 'Sessões a fazer', right: true, render: (a) => a.sessoesRemanescentes ?? 0 },
                    { key: 'vps', label: 'Por sessão', right: true, render: (a) => brl(a.valorPorSessao) },
                    { key: 'tot', label: 'Total', right: true, render: (a) => brl(a.valorTotal) }]} />,
        },
        realizados: {
            label: 'Realizados', total: r.valorProduzido || 0,
            node: <ApptTable rows={listas.realizados} cols={[colData, colPaciente, colTipo, colValor]} empty="Nenhum atendimento realizado neste mês." />,
        },
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Projeção de fechamento de {monthName(month, year).toLowerCase()}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{statusText(data?.periodo)} O mês segue o filtro do topo do Financeiro.</p>
                </div>
                <RefreshButton onClick={reload} busy={loading} />
            </div>

            {/* 1. Cenários: o número que importa primeiro */}
            <div className="grid gap-3 md:grid-cols-3">
                {([
                    ['pessimista', 'Pessimista', '70% dos agendados e 20% dos pendentes', 'border-gray-200 dark:border-white/10'],
                    ['realista', 'Esperado', `Taxa histórica de ${taxa}%`, 'border-emerald-600 ring-1 ring-emerald-600 dark:border-emerald-500 dark:ring-emerald-500'],
                    ['otimista', 'Otimista', '95% dos agendados e 70% dos pendentes', 'border-gray-200 dark:border-white/10'],
                ] as const).map(([k, label, regra, border]) => (
                    <div key={k} className={`rounded-2xl border bg-white p-4 dark:bg-[#161d1b] ${border}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-semibold ${k === 'realista' ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'}`}>{label}</span>
                            {c?.[k]?.probabilidade && <span className="text-xs text-gray-500 dark:text-gray-400">{c[k].probabilidade}</span>}
                        </div>
                        <div className={`mt-1 text-2xl font-bold tabular-nums ${loading && !data ? 'animate-pulse text-gray-300' : 'text-gray-900 dark:text-gray-50'}`}>{brl(c?.[k]?.valor)}</div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{regra}</div>
                    </div>
                ))}
            </div>

            {/* 2. Régua + meta */}
            <Panel title="Régua de fechamento" sub="Recebido, a receber, agendado e pendente, com os cenários e a meta marcados."
                right={meta > 0 ? (
                    <div className="text-right text-sm">
                        <div className="text-gray-500 dark:text-gray-400">Meta do mês <span className="font-semibold text-gray-900 dark:text-gray-50">{brl(meta)}</span></div>
                        <div className={gap > 0 ? 'font-semibold text-red-700 dark:text-red-400' : 'font-semibold text-emerald-700 dark:text-emerald-400'}>
                            {gap > 0 ? `Faltam ${brl(gap)}` : 'Meta atingida na projeção'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{pctMeta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% já recebido</div>
                    </div>
                ) : <span className="text-xs text-gray-500 dark:text-gray-400">Sem meta cadastrada para o mês</span>}>
                {data ? <ReguaFechamento p={data} /> : <div className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />}
            </Panel>

            {/* 3. O que já aconteceu */}
            <KpiStrip loading={loading && !data} cols={5} items={[
                { label: 'Atendimentos realizados', value: String(r.atendimentosRealizados || 0), sub: `ticket médio ${brl(r.ticketMedio)}` },
                { label: 'Valor produzido', value: brl(r.valorProduzido), sub: 'sessões concluídas no mês' },
                { label: 'Já recebido', value: brl(r.jaRecebido), hero: true, sub: 'caixa do mês' },
                { label: 'A receber do mês', value: brl(Math.max(0, (r.valorProduzido || 0) - (r.jaRecebido || 0))), sub: 'produzido e ainda não pago' },
                { label: 'Potencial total', value: brl(r.totalPotencial), sub: 'se tudo acontecer' },
            ]} />

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#161d1b]">
                <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">Particular <b className="tabular-nums">{brl(partic)}</b> <span className="text-gray-500">({Math.round((partic / totalMix) * 100)}%)</span></span>
                    <span className="text-gray-700 dark:text-gray-200">Convênio <b className="tabular-nums">{brl(conv)}</b> <span className="text-gray-500">({Math.round((conv / totalMix) * 100)}%)</span></span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5" aria-hidden>
                    <div className="bg-emerald-600 dark:bg-emerald-500" style={{ width: `${(partic / totalMix) * 100}%` }} />
                    <div className="bg-sky-500" style={{ width: `${(conv / totalMix) * 100}%` }} />
                </div>
            </div>

            {/* 4. Avisos */}
            {(data?.insights?.length || 0) > 0 && (
                <Panel title="Avisos do mês">
                    <InsightList items={data?.insights || []} onAction={() => setLista('pendentes')} />
                </Panel>
            )}

            {/* 5. Listas: uma por vez, com contagem e total em cada chip */}
            <Panel id="projecao-listas" title={tabelas[lista].label} sub={`Total ${brl(tabelas[lista].total)}`}
                right={urgentes > 0 && lista !== 'pendentes' ? <Pill tone="red">{urgentes} pendentes nos próximos 3 dias</Pill> : undefined}>
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {(Object.keys(tabelas) as Lista[]).map((k) => (
                        <Chip key={k} on={lista === k} onClick={() => setLista(k)} label={tabelas[k].label} count={listas[k].length} warn={k === 'pendentes' && urgentes > 0} />
                    ))}
                </div>
                {tabelas[lista].node}
            </Panel>
        </div>
    );
};

export default ProjecaoMensalTab;
