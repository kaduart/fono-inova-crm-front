import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import API from "../../services/api";

const FollowupTrendChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        API.get("/followups/trend?days=7").then((res) => setData(res.data.data));
    }, []);

    // Tooltip customizado elegante
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 backdrop-blur-sm">
                    <p className="text-sm font-medium text-slate-800 mb-2">{label}</p>
                    <div className="space-y-1">
                        {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-slate-600">{entry.name}:</span>
                                <span className="font-semibold text-slate-800">{entry.value}</span>
                            </div>
                        ))}
                    </div>
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
                    <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800 text-lg">Tendência de Follow-ups</h3>
                    <p className="text-sm text-slate-500">Últimos 7 dias - Enviados vs Respondidos</p>
                </div>
            </div>

            {/* Gráfico */}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#f1f5f9" 
                        vertical={false}
                    />
                    <XAxis 
                        dataKey="_id" 
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        wrapperStyle={{
                            fontSize: "12px",
                            marginTop: "20px"
                        }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="#3b82f6" 
                        name="Enviados"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="responded" 
                        stroke="#10b981" 
                        name="Respondidos"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="failed" 
                        stroke="#ef4444" 
                        name="Falhados"
                        strokeWidth={2}
                        dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "#ef4444", strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* Estado vazio */}
            {data.length === 0 && (
                <div className="text-center py-12">
                    <TrendingUp size={48} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Nenhum dado de tendência disponível</p>
                </div>
            )}
        </div>
    );
};

export default FollowupTrendChart;