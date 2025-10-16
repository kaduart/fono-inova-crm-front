import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import API from "../../services/api";

// Paleta de cores sofisticada - tons mais suaves e profissionais
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16", "#f97316"];

const FollowupConversionChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        API.get("/followups/conversion-by-origin").then((res) => setData(res.data.data));
    }, []);

    // Formatação customizada do tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 backdrop-blur-sm">
                    <p className="text-sm font-medium text-slate-800">{payload[0].name}</p>
                    <p className="text-sm text-slate-600">
                        <span className="font-semibold text-emerald-600">{payload[0].value}%</span> conversão
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {payload[0].payload.leadsCount || 0} leads
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            {/* Cabeçalho elegante */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <TrendingUp size={20} className="text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 text-lg">Conversão por Origem</h3>
                    <p className="text-sm text-slate-500">Taxa de conversão por fonte de leads</p>
                </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="conversionRate"
                        nameKey="origin"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                className="hover:opacity-80 transition-opacity"
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        wrapperStyle={{
                            paddingLeft: "20px",
                            fontSize: "12px"
                        }}
                        formatter={(value, entry: any) => (
                            <span className="text-slate-600 text-xs">
                                {value} ({entry.payload.conversionRate}%)
                            </span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Legenda adicional */}
            {data.length === 0 && (
                <div className="text-center py-8">
                    <TrendingUp size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum dado de conversão disponível</p>
                </div>
            )}
        </div>
    );
};

export default FollowupConversionChart;