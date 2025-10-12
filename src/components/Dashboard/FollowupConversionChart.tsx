import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import API from "../../services/api";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

const FollowupConversionChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        API.get("/followups/conversion-by-origin").then((res) => setData(res.data.data));
    }, []);

    return (
        <div className="bg-white rounded-lg shadow p-4 mt-6">
            <h3 className="font-semibold mb-4 text-gray-700">📊 Conversão por Origem de Lead</h3>
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie data={data} dataKey="conversionRate" nameKey="origin" cx="50%" cy="50%" outerRadius={100}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FollowupConversionChart;
