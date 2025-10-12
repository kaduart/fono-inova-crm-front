import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import API from "../../services/api";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const FollowupPerformanceChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await API.get("/followups/analytics");
        const channels = res.data.data.topChannels || {};
        const chartData = Object.entries(channels).map(([channel, count]) => ({
          channel: channel.toUpperCase(),
          count,
        }));
        setData(chartData);
      } catch {
        console.error("Erro ao carregar desempenho por canal");
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-lg shadow p-6 mt-6"
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        📊 Desempenho por Canal
      </h3>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">Nenhum dado disponível ainda.</p>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
              <XAxis type="number" />
              <YAxis
                dataKey="channel"
                type="category"
                tick={{ fontSize: 12, fill: "#4b5563" }}
                width={100}
              />
              <Tooltip
                formatter={(value: any) => [`${value} envios`, "Total"]}
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 4, 4]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export default FollowupPerformanceChart;
