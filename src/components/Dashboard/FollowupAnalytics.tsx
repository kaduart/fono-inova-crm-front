import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../../services/api";

const FollowupAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await API.get("/followups/analytics");
        setAnalytics(res.data.data);
      } catch {
        console.error("Erro ao carregar analytics");
      }
    };
    fetchAnalytics();
  }, []);

  if (!analytics) {
    return <p className="text-gray-500 text-sm">Carregando analytics...</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6"
    >
      {/* tempo médio de resposta */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-sm text-gray-600 font-medium">Tempo médio de resposta</p>
        <p className="text-2xl font-bold text-blue-600 mt-1">
          {analytics.avgResponseTime ? `${analytics.avgResponseTime} min` : "—"}
        </p>
      </div>

      {/* melhor horário */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-sm text-gray-600 font-medium">Melhor horário de envio</p>
        <p className="text-2xl font-bold text-green-600 mt-1">{analytics.bestHour}</p>
      </div>

      {/* melhor dia */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center justify-center">
        <p className="text-sm text-gray-600 font-medium">Melhor dia da semana</p>
        <p className="text-2xl font-bold text-indigo-600 mt-1">{analytics.bestDay}</p>
      </div>

      {/* canais */}
      <div className="bg-white p-4 rounded-lg shadow col-span-full">
        <h3 className="font-semibold text-gray-700 mb-3">Canais mais utilizados</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          {Object.entries(analytics.topChannels || {}).map(([channel, count]: any) => (
            <li key={channel} className="flex justify-between">
              <span className="capitalize">{channel}</span>
              <span className="font-semibold text-gray-800">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default FollowupAnalytics;
