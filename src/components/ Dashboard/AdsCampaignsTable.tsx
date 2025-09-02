const AdsCampaignsTable = ({ data }) => (
    <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
            <thead>
                <tr className="bg-gray-100 text-left">
                    <th className="p-3 font-medium text-gray-700">Campanha</th>
                    <th className="p-3 font-medium text-gray-700">Cliques</th>
                    <th className="p-3 font-medium text-gray-700">Impressões</th>
                    <th className="p-3 font-medium text-gray-700">Conversões</th>
                    <th className="p-3 font-medium text-gray-700">Custo (R$)</th>
                    <th className="p-3 font-medium text-gray-700">CTR</th>
                    <th className="p-3 font-medium text-gray-700">Custo/Conversão</th>
                </tr>
            </thead>
            <tbody>
                {data.map(c => {
                    const cost = c.metrics.cost_micros / 1000000;
                    const ctr = c.metrics.impressions > 0 ? (c.metrics.clicks / c.metrics.impressions * 100).toFixed(2) : 0;
                    const costPerConversion = c.metrics.conversions > 0 ? (cost / c.metrics.conversions).toFixed(2) : 0;

                    return (
                        <tr key={c.campaign.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3 text-gray-800">{c.campaign.name}</td>
                            <td className="p-3 text-center">{c.metrics.clicks}</td>
                            <td className="p-3 text-center">{c.metrics.impressions.toLocaleString()}</td>
                            <td className="p-3 text-center">{c.metrics.conversions || 0}</td>
                            <td className="p-3 text-center">R$ {cost.toFixed(2)}</td>
                            <td className="p-3 text-center">{ctr}%</td>
                            <td className="p-3 text-center">R$ {costPerConversion}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

export default AdsCampaignsTable;