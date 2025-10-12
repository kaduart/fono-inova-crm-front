import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AdsCampaignsChart = ({ data }) => {
    const chartData = data.map(c => ({
        name: c.campaign.name,
        clicks: c.metrics.clicks,
        impressions: c.metrics.impressions,
        cost: c.metrics.cost_micros / 1000000, // USD
        conversions: c.metrics.conversions || 0
    }));

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                    formatter={(value) => value.toLocaleString()}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <Legend />
                <Bar dataKey="clicks" fill="#3b82f6" name="Cliques" />
                <Bar dataKey="impressions" fill="#60a5fa" name="Impressões" />
                <Bar dataKey="conversions" fill="#10b981" name="Conversões" />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default AdsCampaignsChart;