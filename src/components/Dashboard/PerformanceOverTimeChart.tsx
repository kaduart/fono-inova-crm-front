import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PerformanceOverTimeChart = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                    formatter={(value) => value.toLocaleString()}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <Legend />
                <Area type="monotone" dataKey="clicks" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Cliques" />
                <Area type="monotone" dataKey="impressions" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Impressões" />
                <Area type="monotone" dataKey="conversions" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Conversões" />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default PerformanceOverTimeChart;