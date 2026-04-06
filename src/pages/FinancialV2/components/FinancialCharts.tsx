import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from 'recharts';

interface ChartData {
    name: string;
    value: number;
    color: string;
}

interface FinancialChartsProps {
    productionMix: ChartData[];
    packageStatus: ChartData[];
    insuranceStatus: ChartData[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg">
                <p className="font-medium">{data.name}</p>
                <p className="text-sm text-gray-600">
                    {data.value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                    })}
                </p>
            </div>
        );
    }
    return null;
};

const CustomTooltipSessions = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-white p-3 border rounded-lg shadow-lg">
                <p className="font-medium">{data.name}</p>
                <p className="text-sm text-gray-600">
                    {data.value} sessões
                </p>
            </div>
        );
    }
    return null;
};

export const FinancialCharts = ({
    productionMix,
    packageStatus,
    insuranceStatus,
}: FinancialChartsProps) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composição da Produção */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Composição da Produção</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={productionMix}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {productionMix.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Status dos Pacotes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Pacotes: Consumo</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={packageStatus} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={80} />
                            <Tooltip content={<CustomTooltipSessions />} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {packageStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Status do Convênio */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Convênio por Status</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={insuranceStatus}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, percent }) =>
                                    `${name}: ${(percent * 100).toFixed(0)}%`
                                }
                            >
                                {insuranceStatus.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Componente simplificado para mostrar quando não há dados
export const EmptyChart = ({ message }: { message: string }) => (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 h-64 flex items-center justify-center">
        <p className="text-gray-500 text-center">{message}</p>
    </div>
);
