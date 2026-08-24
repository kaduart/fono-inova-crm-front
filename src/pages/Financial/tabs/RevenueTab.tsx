import { Banknote, Landmark, TrendingUp, WalletCards } from 'lucide-react';
import moment from 'moment-timezone';
import { useMemo, useState } from 'react';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { useFinancialMetrics } from '../../../hooks/useFinancialMetrics';

const TIMEZONE = 'America/Sao_Paulo';
const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const RevenueTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState(moment().tz(TIMEZONE).year());
    const startDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).startOf('month').toISOString();
    const endDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).endOf('month').toISOString();
    const years = Array.from({ length: 3 }, (_, index) => moment().tz(TIMEZONE).year() - index);
    const { data, isLoading } = useFinancialMetrics(startDate, endDate);

    const metrics = useMemo(() => ({
        totalRevenue: data?.cash?.total || 0,
        particular: data?.cash?.breakdown?.particular || 0,
        convenioAvulso: data?.cash?.breakdown?.convenioAvulso || 0,
        convenioPacote: data?.cash?.breakdown?.convenioPacote || 0,
        faturado: data?.billing?.total || 0,
        aReceber: data?.receivable?.total || 0,
    }), [data]);

    if (isLoading) return <LoadingSpinner centered size="large" color="border-emerald-600" className="min-h-[400px]" />;

    const cards = [
        { label: 'Total recebido', value: metrics.totalRevenue, icon: Banknote, tone: 'bg-green-50 text-green-700' },
        { label: 'Particular', value: metrics.particular, icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Convênio avulso', value: metrics.convenioAvulso, icon: Landmark, tone: 'bg-blue-50 text-blue-700' },
        { label: 'Convênio pacote', value: metrics.convenioPacote, icon: WalletCards, tone: 'bg-purple-50 text-purple-700' },
    ];

    return <section className="space-y-6" aria-labelledby="revenue-title">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 id="revenue-title" className="text-xl font-bold text-gray-900">Análise de receitas</h2><p className="mt-1 text-sm text-gray-500">Visão consolidada de {monthNames[selectedMonth]} de {selectedYear}.</p></div>
            <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-700">Mês<select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">{monthNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
                <label className="text-xs font-medium text-gray-700">Ano<select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
            </div>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-1 truncate text-xl font-bold tabular-nums text-gray-900">{money(value)}</p></div></div></article>)}</div>
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><h3 className="text-base font-semibold text-gray-900">Resumo do período</h3><div className="mt-4 flex flex-wrap gap-2"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold tabular-nums text-blue-700 ring-1 ring-inset ring-blue-200">Faturado: {money(metrics.faturado)}</span><span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold tabular-nums text-amber-700 ring-1 ring-inset ring-amber-200">A receber: {money(metrics.aReceber)}</span></div></article>
    </section>;
};

export default RevenueTab;
