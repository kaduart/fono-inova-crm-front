const KPICards = ({ adsData, analyticsData }) => {
    // Calcular totais
    const totalClicks = adsData.reduce((sum, item) => sum + item.metrics.clicks, 0);
    const totalImpressions = adsData.reduce((sum, item) => sum + item.metrics.impressions, 0);
    const totalCost = adsData.reduce((sum, item) => sum + (item.metrics.cost_micros / 1000000), 0);
    const totalConversions = adsData.reduce((sum, item) => sum + (item.metrics.conversions || 0), 0);
    const totalEvents = analyticsData.reduce((sum, item) => sum + (item.value || 1), 0);

    // Calcular médias
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : 0;
    const cpc = totalClicks > 0 ? (totalCost / totalClicks).toFixed(2) : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks * 100).toFixed(2) : 0;

    const kpis = [
        { title: 'Total de Cliques', value: totalClicks, icon: 'mouse-pointer', color: 'blue' },
        { title: 'Total de Impressões', value: totalImpressions.toLocaleString(), icon: 'eye', color: 'green' },
        { title: 'Custo Total', value: `R$ ${totalCost.toFixed(2)}`, icon: 'dollar-sign', color: 'purple' },
        { title: 'Taxa de CTR', value: `${ctr}%`, icon: 'percent', color: 'orange' },
        { title: 'Custo por Clique', value: `R$ ${cpc}`, icon: 'calculator', color: 'red' },
        { title: 'Taxa de Conversão', value: `${conversionRate}%`, icon: 'trending-up', color: 'indigo' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {kpis.map((kpi, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg p-6 card-hover">
                    <div className="flex items-center">
                        <div className={`rounded-full p-3 bg-${kpi.color}-100 text-${kpi.color}-600 mr-4`}>
                            <i className={`fas fa-${kpi.icon} text-lg`}></i>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">{kpi.title}</h3>
                            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPICards;