// src/pages/Financial/tabs/InteligenciaFinanceiraTab.tsx
// Resultados → Inteligência Financeira: "vamos bater a meta e o que fazer agora".
// Mesmo dado da Projeção Mensal (GET /provisionamento/projecao-mes), lido para decisão.
// Nada foi retirado da versão antiga: recebido, agendado, crédito de pacotes,
// projeção, % da meta, avisos, 3 cenários e a lista de realizados (recolhida).
import { useState } from 'react';
import { brl, KpiStrip } from '../components/finUi';
import {
    ApptTable, colData, colPaciente, colTipo, colValor, EmptyOrError, InsightList, monthName,
    Panel, RefreshButton, ReguaFechamento, statusText, useProjecao,
} from '../components/projecaoUi';

interface Props { month?: number; year?: number; onGoProjecao?: () => void }

const now = new Date();

const InteligenciaFinanceiraTab = ({ month = now.getMonth() + 1, year = now.getFullYear(), onGoProjecao }: Props) => {
    const { data, loading, erro, reload } = useProjecao(month, year);
    const [verRealizados, setVerRealizados] = useState(false);

    if (erro && !data) return <EmptyOrError erro={erro} onRetry={reload} />;

    const r = data?.resumo || {};
    const c = data?.cenarios;
    const meta = data?.metas?.sugerida || 0;
    const gap = data?.metas?.gapParaMeta || 0;
    const pctMeta = data?.metas?.percentualAtual || 0;
    const realista = c?.realista?.valor || 0;
    const taxa = Math.round((data?.taxaConversaoHistorica || 0) * 100);
    const realizados = data?.detalhes?.realizados || [];
    const passado = data?.periodo?.status === 'PASSADO';

    const veredito = !meta
        ? 'Sem meta cadastrada para este mês. Cadastre em Metas do ano para acompanhar o quanto falta.'
        : passado
            ? (r.jaRecebido || 0) >= meta ? `Meta batida: entrou ${brl(r.jaRecebido)} de ${brl(meta)}.` : `Meta não batida: entrou ${brl(r.jaRecebido)} de ${brl(meta)}.`
            : gap > 0 ? `No ritmo atual o mês fecha em ${brl(realista)}, ${brl(gap)} abaixo da meta.` : `No ritmo atual o mês fecha em ${brl(realista)} e passa a meta de ${brl(meta)}.`;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{monthName(month, year)}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{statusText(data?.periodo)} O mês segue o filtro do topo do Financeiro.</p>
                </div>
                <RefreshButton onClick={reload} busy={loading} />
            </div>

            <div className={`rounded-2xl border p-4 text-[15px] font-medium ${meta && gap > 0 && !passado
                ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'}`}>
                {loading && !data ? 'Calculando a projeção do mês…' : veredito}
            </div>

            <KpiStrip loading={loading && !data} cols={5} items={[
                { label: 'Recebido', value: brl(r.jaRecebido), hero: true, sub: meta ? `${pctMeta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da meta` : 'dinheiro que já entrou' },
                { label: 'Agendado', value: brl(r.agendadoConfirmado), sub: 'avulsos confirmados no mês' },
                { label: 'Crédito de pacotes', value: brl(r.creditoPacotes), sub: 'já pago, sessões a fazer' },
                { label: 'Projeção realista', value: brl(realista), sub: taxa ? `taxa histórica de ${taxa}%` : 'mais provável' },
                { label: meta ? 'Falta para a meta' : 'Meta do mês', value: meta ? brl(gap) : 'Sem meta', danger: !!meta && gap > 0 && !passado, sub: meta ? `meta ${brl(meta)}` : 'cadastre em Metas do ano' },
            ]} />

            <Panel title="Régua de fechamento" sub="Onde o mês está hoje e onde deve fechar em cada cenário.">
                {data ? <ReguaFechamento p={data} /> : <div className="h-20 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />}
            </Panel>

            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <Panel title="O que fazer agora" sub="Avisos calculados pela projeção do mês.">
                        <InsightList items={data?.insights || []} onAction={onGoProjecao ? () => onGoProjecao() : undefined} />
                    </Panel>
                </div>
                <div className="lg:col-span-2">
                    <Panel title="Cenários de fechamento">
                        <dl className="divide-y divide-gray-100 dark:divide-white/5">
                            {([
                                ['pessimista', 'Pessimista', '70% dos agendados e 20% dos pendentes'],
                                ['realista', 'Realista', `85% dos agendados e pendentes pela taxa histórica (${taxa}%)`],
                                ['otimista', 'Otimista', '95% dos agendados e 70% dos pendentes'],
                            ] as const).map(([k, label, regra]) => (
                                <div key={k} className={`flex items-baseline justify-between gap-3 py-2.5 ${k === 'realista' ? 'font-semibold' : ''}`}>
                                    <dt>
                                        <span className={k === 'realista' ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-100'}>{label}</span>
                                        {c?.[k]?.probabilidade && <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">{c[k].probabilidade}</span>}
                                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">{regra}</span>
                                    </dt>
                                    <dd className="text-lg tabular-nums text-gray-900 dark:text-gray-50">{brl(c?.[k]?.valor)}</dd>
                                </div>
                            ))}
                        </dl>
                    </Panel>
                </div>
            </div>

            <Panel title={`Atendimentos realizados (${realizados.length})`} sub={`Produzido no mês: ${brl(r.valorProduzido)}`}
                right={
                    <button type="button" aria-expanded={verRealizados} onClick={() => setVerRealizados((v) => !v)}
                        className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                        {verRealizados ? 'Esconder lista' : 'Ver lista'}
                    </button>
                }>
                {verRealizados && <ApptTable rows={realizados} cols={[colData, colPaciente, colTipo, colValor]} empty="Nenhum atendimento realizado neste mês." />}
            </Panel>
        </div>
    );
};

export default InteligenciaFinanceiraTab;
