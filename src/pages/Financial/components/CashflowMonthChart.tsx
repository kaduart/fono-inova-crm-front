import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO, startOfWeek } from 'date-fns';
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function CashflowMonthChart({ days }: { days: { date: string; caixa: number; producao: number; atendimentos: number }[] }) {
    const weeks = new Map<string, { caixa: number; producao: number }>();
    [...days].sort((a, b) => a.date.localeCompare(b.date)).forEach(day => {
        const key = format(startOfWeek(parseISO(day.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const week = weeks.get(key) || { caixa: 0, producao: 0 };
        week.caixa += day.caixa; week.producao += day.producao; weeks.set(key, week);
    });
    return <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
        <h3 className="mb-4 font-semibold">Caixa e produção por dia</h3>
        {days.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={days}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={date => format(parseISO(date), 'dd/MM')} /><YAxis tickFormatter={value => Number(value).toLocaleString('pt-BR', { notation: 'compact' })} />
            <Tooltip formatter={(value: any) => money(Number(value))} labelFormatter={date => format(parseISO(String(date)), 'dd/MM/yyyy')} /><Legend />
            <Area name="Caixa recebido" dataKey="caixa" stroke="#047857" fill="#047857" fillOpacity={0.12} /><Area name="Produção clínica" dataKey="producao" stroke="#2563eb" fill="#2563eb" fillOpacity={0.08} />
        </AreaChart></ResponsiveContainer></div> : <p className="text-sm">Nenhum movimento neste mês.</p>}
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><caption className="mb-2 text-left font-semibold">Resumo semanal · segunda a domingo</caption><thead><tr><th className="py-2 text-left">Semana a partir de</th><th className="text-right">Caixa</th><th className="text-right">Produção</th></tr></thead><tbody>{[...weeks].map(([date, week]) => <tr key={date} className="border-t border-gray-200 dark:border-gray-700"><td className="py-2">{format(parseISO(date), 'dd/MM')}</td><td className="text-right tabular-nums">{money(week.caixa)}</td><td className="text-right tabular-nums">{money(week.producao)}</td></tr>)}</tbody></table></div>
    </section>;
}
