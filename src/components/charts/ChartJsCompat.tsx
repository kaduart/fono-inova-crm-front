// Ponte para o formato de dados do Chart.js ({ labels, datasets }) desenhado com Recharts.
// Permite tirar o Chart.js do app sem reescrever os dados das telas que o usavam.
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Dataset = { label?: string; data: number[]; borderColor?: string; backgroundColor?: string | string[] };
export type ChartJsData = { labels: string[]; datasets: Dataset[] };

const color = (d: Dataset, i: number) => d.borderColor || (Array.isArray(d.backgroundColor) ? d.backgroundColor[0] : d.backgroundColor) || ['#26977b', '#3b82f6', '#f59e0b'][i % 3];
const rows = ({ labels, datasets }: ChartJsData) =>
  labels.map((l, i) => Object.fromEntries([['label', l], ...datasets.map((d, k) => [d.label || `s${k}`, d.data[i]])]));
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 } };

export function LineCompat({ data }: { data: ChartJsData }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows(data)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(0,0,0,.06)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {data.datasets.map((d, i) => (
          <Area key={d.label || i} type="monotone" dataKey={d.label || `s${i}`} stroke={color(d, i)} fill={color(d, i)} fillOpacity={0.1} strokeWidth={2} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarCompat({ data }: { data: ChartJsData }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows(data)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(0,0,0,.06)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} />
        <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {data.datasets.map((d, i) => (
          <Bar key={d.label || i} dataKey={d.label || `s${i}`} fill={color(d, i)} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DoughnutCompat({ data }: { data: ChartJsData }) {
  const d = data.datasets[0];
  const colors = Array.isArray(d?.backgroundColor) ? d.backgroundColor : [];
  const pts = data.labels.map((l, i) => ({ name: l, value: d?.data[i] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={pts} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
          {pts.map((p, i) => <Cell key={p.name} fill={colors[i] || '#94a3b8'} />)}
        </Pie>
        <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
