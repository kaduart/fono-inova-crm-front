import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#bfdbfe', '#10b981', '#f59e0b'];

const SiteAnalyticsChart = ({ data }) => {
    const chartData = data.reduce((acc, e) => {
        const found = acc.find(i => i.label === e.label);
        if (found) found.value += 1;
        else acc.push({ label: e.label, value: 1 });
        return acc;
    }, []);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={100}
                    fill="#8884d8"
                    label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default SiteAnalyticsChart;