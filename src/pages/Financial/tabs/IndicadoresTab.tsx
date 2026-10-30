// src/pages/Financial/tabs/IndicadoresTab.tsx
// Indicadores numa página só: resultado do mês, o que fazer agora e composição.
// Todos os números vêm prontos do back (`data.kpis` e blocos do /v2/financial/dashboard);
// a tela não recalcula nada. O painel antigo continua em "Painel detalhado".
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useFinancialDashboardV3 } from '../../../hooks/useFinancialDashboardV3';
import { Chip, KpiStrip, brl } from '../components/finUi';

const FinancialDashboardTab = lazy(() => import('./FinancialDashboardTab'));

type Composicao = 'caixa' | 'producao' | 'despesas' | 'agenda';

const TIPOS: Array<{ key: 'particular' | 'pacote' | 'convenio' | 'liminar'; label: string }> = [
    { key: 'particular', label: 'Particular' },
    { key: 'pacote', label: 'Pacote' },
    { key: 'convenio', label: 'Convênio' },
    { key: 'liminar', label: 'Liminar' },
];
const METODO: Record<string, string> = {
    pix: 'Pix', credit_card: 'Crédito', debit_card: 'Débito', cartao_credito: 'Crédito', cartao_debito: 'Débito',
    dinheiro: 'Dinheiro', cash: 'Dinheiro', transferencia: 'Transferência', bank_transfer: 'Transferência',
    convenio: 'Convênio', liminar_credit: 'Liminar', boleto: 'Boleto',
};
const variacao = (v?: number | null, base = 'mês anterior') =>
    v == null ? undefined : `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toLocaleString('pt-BR')}% vs ${base}`;

export default function IndicadoresTab({ month, year }: { month: number; year: number }) {
    const { data, loading, error, fetchDashboard } = useFinancialDashboardV3();
    const { user } = useAuth();
    const [, setSearchParams] = useSearchParams();
    const [comp, setComp] = useState<Composicao>('caixa');
    const [detalhado, setDetalhado] = useState(false);
    const [revisao, setRevisao] = useState<number | null>(null);

    useEffect(() => { fetchDashboard(month, year); }, [month, year, fetchDashboard]);
    useEffect(() => {
        const onRefresh = () => fetchDashboard(month, year);
        window.addEventListener('cash:refresh', onRefresh);
        return () => window.removeEventListener('cash:refresh', onRefresh);
    }, [month, year, fetchDashboard]);
    useEffect(() => {
        if (user?.role !== 'admin') return;
        api.get('/v2/financial/dashboard/audits/convenio-payments-review-count')
            .then(r => setRevisao(Number(r.data?.data?.revisaoManual ?? 0)))
            .catch(() => setRevisao(null));
    }, [user?.role]);

    const irPara = (tab: string) => setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('financialTab', tab);
        return next;
    }, { replace: true });

    const d: any = data;
    const k = d?.kpis;

    const acoes = useMemo(() => {
        if (!k) return [];
        const rows: Array<{ label: string; qtd?: string; valor: number | null; tab: string; cta: string }> = [
            { label: 'Convênio a receber (sessões do mês)', valor: k.aReceber.convenio, tab: 'convenios', cta: 'Abrir Convênios' },
            { label: 'Particular realizado sem pagamento', valor: k.aReceber.particular, tab: 'pagamentos', cta: 'Abrir Pagamentos' },
            { label: 'Pacote com sessão a receber', valor: k.aReceber.pacote, tab: 'pagamentos', cta: 'Abrir Pagamentos' },
        ];
        if (revisao != null) rows.push({ label: 'Pagamentos de convênio para revisão manual', qtd: String(revisao), valor: null, tab: 'convenios', cta: 'Revisar' });
        rows.push({ label: 'Profissional sem regra de comissão', qtd: String(k.resultado.profissionaisSemRegra ?? 0), valor: null, tab: 'profissionais', cta: 'Abrir Profissionais' });
        return rows.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1));
    }, [k, revisao]);

    if (detalhado) {
        return (
            <div className="space-y-3">
                <button type="button" onClick={() => setDetalhado(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    ← Voltar para Indicadores
                </button>
                <Suspense fallback={<div className="py-16 text-center text-gray-400">Carregando...</div>}>
                    <FinancialDashboardTab month={month} year={year} />
                </Suspense>
            </div>
        );
    }

    const monthLabel = new Date(year, month - 1, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const prevLabel = new Date(year, month - 2, 1, 12).toLocaleDateString('pt-BR', { month: 'long' });
    const meta = k?.metaRealizada;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Indicadores · {monthLabel}</h2>
                    <p className="text-sm text-gray-500">Resultado do mês e o que fazer agora.</p>
                </div>
                <button type="button" onClick={() => setDetalhado(true)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Painel detalhado (ritmo, insights, ranking)
                </button>
            </div>

            {error && (
                <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    Não foi possível carregar os indicadores.
                    <button type="button" onClick={() => fetchDashboard(month, year)} className="font-semibold underline">Tentar de novo</button>
                </div>
            )}

            {/* 1. Resultado do mês */}
            <KpiStrip cols={5} loading={loading && !k} items={[
                {
                    label: 'Meta realizada (caixa)', hero: true,
                    value: meta ? brl(meta.valor) : '—',
                    sub: meta
                        ? meta.meta > 0
                            ? `${meta.percentual.toLocaleString('pt-BR')}% de ${brl(meta.meta)}${meta.percentualProjetado != null ? ` · no ritmo para ${Math.round(meta.percentualProjetado)}%` : ''}`
                            : 'sem meta cadastrada para o mês'
                        : undefined,
                },
                { label: 'Caixa', value: k ? brl(k.caixa.valor) : '—', sub: variacao(k?.caixa.variacao, prevLabel) },
                { label: 'Produção', value: k ? brl(k.producao.valor) : '—', sub: variacao(k?.producao.variacao, prevLabel) },
                {
                    label: 'A receber', value: k ? brl(k.aReceber.valor) : '—',
                    sub: k ? `particular ${brl(k.aReceber.particular + k.aReceber.pacote)} · convênio ${brl(k.aReceber.convenio)}` : undefined,
                },
                {
                    label: 'Resultado', value: k ? brl(k.resultado.valor) : '—', danger: (k?.resultado.valor ?? 0) < 0,
                    sub: k ? `caixa − despesas · margem ${k.resultado.margem.toLocaleString('pt-BR')}%` : undefined,
                },
            ]} />
            {meta && meta.meta > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-gray-600">
                        <span>Realizado {meta.percentual.toLocaleString('pt-BR')}% · esperado até hoje {meta.percentualEsperado.toLocaleString('pt-BR')}%</span>
                        <span>Projeção {brl(meta.projecaoEsperada)}</span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`Meta realizada ${meta.percentual}% de 100%`}>
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, meta.percentual)}%` }} />
                        <div className="absolute top-0 h-full w-0.5 bg-gray-500" style={{ left: `${Math.min(100, meta.percentualEsperado)}%` }} />
                    </div>
                </div>
            )}
            {k && (k.metaRealizada.liminarForaDaMeta > 0 || k.aReceber.liminar > 0 || k.metaRealizada.retroativoForaDaMeta > 0) && (
                <p className="text-sm text-gray-600">
                    Fora da meta neste mês: liminar recebida {brl(k.metaRealizada.liminarForaDaMeta)}
                    {k.metaRealizada.retroativoForaDaMeta > 0 && <> · convênio retroativo {brl(k.metaRealizada.retroativoForaDaMeta)}</>}
                    {k.aReceber.liminar > 0 && <> · liminar a receber {brl(k.aReceber.liminar)}</>}
                </p>
            )}
            {!k && !loading && !error && (
                <p className="text-sm text-amber-800">O servidor ainda não enviou os números desta página. Atualize o back para a versão nova da develop.</p>
            )}

            {/* 2. O que fazer agora */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <header className="border-b border-gray-100 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">O que fazer agora</h3>
                    <p className="text-xs text-gray-500">Ordenado por valor · cada linha abre a lista certa</p>
                </header>
                <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                        {acoes.length === 0 && <tr><td className="px-4 py-6 text-center text-gray-500">{loading ? 'Carregando…' : 'Nada pendente.'}</td></tr>}
                        {acoes.map(a => (
                            <tr key={a.label}>
                                <td className="px-4 py-2.5 font-medium text-gray-900">{a.label}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">{a.qtd ?? ''}</td>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{a.valor != null ? brl(a.valor) : '—'}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <button type="button" onClick={() => irPara(a.tab)} className="whitespace-nowrap rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">{a.cta} →</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            {/* 3. Composição */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">Composição do mês</h3>
                    <div className="flex flex-wrap gap-1.5">
                        <Chip on={comp === 'caixa'} onClick={() => setComp('caixa')} label="Caixa" />
                        <Chip on={comp === 'producao'} onClick={() => setComp('producao')} label="Produção" />
                        <Chip on={comp === 'despesas'} onClick={() => setComp('despesas')} label="Despesas" />
                        <Chip on={comp === 'agenda'} onClick={() => setComp('agenda')} label="Agenda" />
                    </div>
                </header>
                <div className="overflow-x-auto">
                    {comp === 'caixa' && <ComposicaoCaixa d={d} />}
                    {comp === 'producao' && <ComposicaoProducao d={d} />}
                    {comp === 'despesas' && <ComposicaoDespesas d={d} />}
                    {comp === 'agenda' && <ComposicaoAgenda d={d} />}
                </div>
            </section>

            {/* Comparativo */}
            {d?.comparativos && (
                <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <header className="border-b border-gray-100 px-4 py-3"><h3 className="font-semibold text-gray-900">Comparativo com {prevLabel}</h3></header>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr><th className="px-4 py-2"></th><th className="px-3 py-2 text-right">{prevLabel}</th><th className="px-3 py-2 text-right">Este mês</th><th className="px-4 py-2 text-right">Variação</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(['caixa', 'producao', 'despesas'] as const).map(key => (
                                    <tr key={key}>
                                        <td className="px-4 py-2.5 font-medium">{key === 'caixa' ? 'Caixa' : key === 'producao' ? 'Produção' : 'Despesas'}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{brl(d.comparativos.mesAnterior?.[key])}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{brl(d.comparativos.mesAtual?.[key])}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{d.comparativos.variacao?.[key] != null ? `${d.comparativos.variacao[key] >= 0 ? '+' : ''}${d.comparativos.variacao[key].toLocaleString('pt-BR')}%` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}

const Tabela = ({ head, rows, foot }: { head: string[]; rows: Array<Array<string | number>>; foot?: Array<string | number> }) => (
    <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>{head.map((h, i) => <th key={h + i} className={`px-4 py-2 ${i ? 'text-right' : ''}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-6 text-center text-gray-500">Sem dados no mês.</td></tr>}
            {rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j ? 'text-right tabular-nums' : 'font-medium'}`}>{c}</td>)}</tr>
            ))}
        </tbody>
        {foot && <tfoot className="bg-gray-50 font-semibold"><tr>{foot.map((c, j) => <td key={j} className={`px-4 py-2.5 ${j ? 'text-right tabular-nums' : ''}`}>{c}</td>)}</tr></tfoot>}
    </table>
);

function ComposicaoCaixa({ d }: { d: any }) {
    const b = d?.cash?.breakdown || {};
    const m: Record<string, number> = d?.cash?.byMethod || {};
    return (
        <div className="grid gap-0 lg:grid-cols-2">
            <Tabela head={['Por tipo', 'Valor']} rows={TIPOS.map(t => [t.label, brl(b[t.key])])} foot={['Total', brl(d?.cash?.total)]} />
            <Tabela head={['Por forma', 'Valor']}
                rows={Object.entries(m).filter(([, v]) => Number(v) > 0).sort((a, z) => Number(z[1]) - Number(a[1])).map(([k, v]) => [METODO[k] || k, brl(v)])} />
        </div>
    );
}

function ComposicaoProducao({ d }: { d: any }) {
    const p = d?.revenue?.byMethod || {};
    const r = d?.recebimentoProducao || {};
    const pend: Record<string, number> = {
        particular: p.particularPendente ?? 0, pacote: p.pacotePendente ?? 0,
        convenio: d?.kpis?.aReceber?.convenio ?? 0, liminar: d?.kpis?.aReceber?.liminar ?? 0,
    };
    return (
        <Tabela head={['Tipo', 'Produção', 'Já recebido', 'A receber']}
            rows={TIPOS.map(t => [t.label, brl(p[t.key]), brl(r[t.key]), brl(pend[t.key])])}
            foot={['Total', brl(d?.revenue?.total), brl(r.total), brl(d?.aReceberProducao)]} />
    );
}

function ComposicaoDespesas({ d }: { d: any }) {
    const b = d?.expenses?.breakdown;
    const det: any[] = (b?.detalheComissoes || []).filter((c: any) => c.total > 0 || c.noRule);
    return (
        <div>
            <Tabela head={['Despesas', 'Valor']}
                rows={[['Despesas cadastradas', brl(b?.expenses)], ['Comissões dos profissionais', brl(b?.comissoes)]]}
                foot={['Total', brl(d?.expenses?.total)]} />
            {det.length > 0 && (
                <Tabela head={['Comissão por profissional', 'Sessões', 'Valor']}
                    rows={det.sort((a, z) => z.total - a.total).map(c => [c.doctorName + (c.noRule ? ' (sem regra)' : ''), c.sessions ?? 0, c.noRule ? '—' : brl(c.total)])} />
            )}
        </div>
    );
}

function ComposicaoAgenda({ d }: { d: any }) {
    const a = d?.appointmentCounts || {};
    return (
        <Tabela head={['Agenda do mês', 'Quantidade']}
            rows={[['Atendimentos marcados (inclui pré-agendado)', a.ativos ?? '—'], ['Realizados', a.realizados ?? '—']]} />
    );
}
