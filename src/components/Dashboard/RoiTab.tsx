// Aba ROI & Atribuição: tela ÚNICA de ROI de Vendas & Marketing (aprovada em 30/10/2026).
// Antes o ROI aparecia em Leads, em Métricas do Funil e aqui, com fontes diferentes.
// Números do back: /v2/commercial/roi-summary (docs/SALES_MARKETING.md).
import { lazy, Suspense, useState } from 'react';
import { Chip, PeriodBar } from '../../pages/Financial/components/finUi';
import { CUR_MONTH, CUR_YEAR, RoiChannelTable, RoiKpis, useRoiSummary, useSalesPeriod } from '../mkt/SalesParts';
import AcquisitionByChannel from './AcquisitionByChannel';

const RevenueTab = lazy(() => import('./RevenueTab'));

type View = 'canal' | 'anuncio' | 'detalhe';

export default function RoiTab() {
    const [period, setPeriod] = useSalesPeriod();
    const [view, setView] = useState<View>('canal');
    const { data, loading, error } = useRoiSummary(period);
    const cov = data?.coverage;

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div>
                <h1 className="text-xl font-bold text-gray-900 md:text-2xl">ROI &amp; Atribuição</h1>
                <p className="text-sm text-gray-600">Quanto cada canal custou e quanto trouxe de paciente novo. A receita segue a regra de caixa do Financeiro.</p>
            </div>

            <PeriodBar value={period} month={CUR_MONTH} year={CUR_YEAR} onChange={setPeriod} />
            <RoiKpis data={data} loading={loading} />
            {error && <p className="text-sm text-red-600">Não consegui carregar o ROI: {error}</p>}

            {cov && cov.leads > 0 && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${cov.rate >= 80 ? 'bg-emerald-50 text-emerald-900' : 'bg-blue-50 text-blue-900'}`}>
                    {cov.rate.toLocaleString('pt-BR')}% dos leads do período têm origem identificada ({cov.withOrigin} de {cov.leads}).
                    {cov.rate < 100 && ' Os outros chegaram pelo WhatsApp sem a tag do anúncio ou sem origem preenchida, então ficam em "Sem origem".'}
                </div>
            )}
            {data && data.totals.spend === 0 && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    Nenhum investimento lançado no período, então o custo por lead e por paciente não aparece. Lance o gasto em "Por anúncio".
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <Chip on={view === 'canal'} onClick={() => setView('canal')} label="Por canal" />
                <Chip on={view === 'anuncio'} onClick={() => setView('anuncio')} label="Por anúncio" />
                <Chip on={view === 'detalhe'} onClick={() => setView('detalhe')} label="Visão detalhada" />
            </div>

            {view === 'canal' && (data ? <RoiChannelTable data={data} /> : <div className="h-40 animate-pulse rounded-xl bg-gray-100" />)}
            {view === 'anuncio' && <AcquisitionByChannel startDate={period.start} endDate={period.end} />}
            {view === 'detalhe' && (
                <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-gray-100" />}>
                    <RevenueTab />
                </Suspense>
            )}
        </div>
    );
}
