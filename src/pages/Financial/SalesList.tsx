import { Eye, Filter, Plus, TrendingUp, WalletCards } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useSales } from '../../hooks/useSales';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

interface SalesListProps { onNewSale: () => void; onViewSale: (id: string) => void; }

const statusClass: Record<string, string> = {
    realizado: 'bg-green-50 text-green-700 ring-green-200',
    confirmado: 'bg-blue-50 text-blue-700 ring-blue-200',
    agendado: 'bg-amber-50 text-amber-700 ring-amber-200',
    cancelado: 'bg-red-50 text-red-700 ring-red-200',
};

const SalesList = ({ onNewSale, onViewSale }: SalesListProps) => {
    const { sales, loading, fetchSales } = useSales();
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    useEffect(() => { fetchSales({ month: filterMonth, year: filterYear }); }, [filterMonth, filterYear]);

    const revenue = sales.reduce((sum, sale) => sum + sale.valorLiquido, 0);
    const margin = sales.reduce((sum, sale) => sum + (sale.margemContribuicao || 0), 0);
    const metrics = [
        { label: 'Faturamento', value: revenue, icon: WalletCards, tone: 'bg-emerald-50 text-emerald-700' },
        { label: 'Margem total', value: margin, icon: TrendingUp, tone: 'bg-green-50 text-green-700' },
        { label: 'Ticket médio', value: sales.length ? revenue / sales.length : 0, icon: Filter, tone: 'bg-blue-50 text-blue-700' },
    ];

    return (
        <section className="space-y-6" aria-labelledby="sales-title">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div><h2 id="sales-title" className="text-xl font-bold text-gray-900">Vendas e contratos</h2><p className="mt-1 text-sm text-gray-500">Acompanhe faturamento, custos e margem do período.</p></div>
                <button type="button" onClick={onNewSale} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Nova venda</button>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {metrics.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-medium text-gray-500">{label}</p><p className="mt-0.5 truncate text-xl font-bold tabular-nums text-gray-900">{money(value)}</p></div></div></article>)}
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
                <label className="text-xs font-medium text-gray-700">Mês<select value={filterMonth} onChange={(event) => setFilterMonth(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-44">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{format(new Date(2024, index), 'MMMM', { locale: ptBR })}</option>)}</select></label>
                <label className="text-xs font-medium text-gray-700">Ano<select value={filterYear} onChange={(event) => setFilterYear(Number(event.target.value))} className="mt-1 block min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-32">{[2025, 2026].map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                <p className="text-sm text-gray-500 sm:ml-auto sm:pb-2" aria-live="polite">{sales.length} vendas encontradas</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500"><tr>{['Data', 'Cliente', 'Tipo', 'Profissional', 'Valor', 'Custos', 'Margem', 'Status', 'Ações'].map((item) => <th key={item} scope="col" className="px-4 py-3">{item}</th>)}</tr></thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500">Carregando vendas…</td></tr> : sales.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-500">Nenhuma venda encontrada neste período.</td></tr> : sales.map((sale) => <tr key={sale._id} className="transition-colors hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">{format(new Date(sale.dataVenda), 'dd/MM/yyyy')}</td><td className="px-4 py-3 font-medium text-gray-900">{sale.patient?.fullName || '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sale.tipoVenda === 'pacote' ? 'bg-purple-50 text-purple-700 ring-purple-200' : 'bg-gray-50 text-gray-700 ring-gray-200'}`}>{sale.tipoVenda === 'pacote' ? 'Pacote' : 'Avulso'}</span></td>
                        <td className="px-4 py-3 text-gray-600">{sale.doctor?.fullName || '—'}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{money(sale.valorLiquido)}</td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-red-700">{money(sale.totalCustosVariaveis)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-green-700">{money(sale.margemContribuicao)}</td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${statusClass[sale.status] || 'bg-gray-50 text-gray-700 ring-gray-200'}`}>{sale.status}</span></td>
                        <td className="px-4 py-3 text-right"><button type="button" onClick={() => onViewSale(sale._id)} aria-label={`Ver venda de ${sale.patient?.fullName || 'cliente'}`} className="inline-grid min-h-10 min-w-10 place-items-center rounded-lg text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"><Eye className="h-4 w-4" aria-hidden="true" /></button></td>
                    </tr>)}
                </tbody>
            </table></div></div>
        </section>
    );
};

export default SalesList;
