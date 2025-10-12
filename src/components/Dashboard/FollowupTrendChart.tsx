import { useEffect, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import API from "../../services/api";

const FollowupTrendChart = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        API.get("/followups/trend?days=7").then((res) => setData(res.data.data));
    }, []);

    return (
        <div className="bg-white rounded-lg shadow p-4 mt-6">
            <h3 className="font-semibold mb-4 text-gray-700">📅 Tendência de Follow-ups (7 dias)</h3>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sent" stroke="#22c55e" name="Enviados" />
                    <Line type="monotone" dataKey="responded" stroke="#3b82f6" name="Respondidos" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Falhados" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default FollowupTrendChart;
