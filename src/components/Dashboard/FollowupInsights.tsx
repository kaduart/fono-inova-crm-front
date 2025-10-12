// src/components/Dashboard/FollowupInsights.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import API from "../../services/api";
import { toast } from "react-toastify";

interface FollowupAnalytics {
  total: number;
  responded: number;
  avgResponseTime: number;
  topChannels: Record<string, number>;
  bestHour: string | null;
  bestDay: string | null;
  conversionRate?: string | number;
}

const FollowupInsights: React.FC = () => {
  const [data, setData] = useState<FollowupAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await API.get("/followups/analytics");
      // ✅ Garante que o objeto é sempre data.data
      setData(res.data?.data || null);
    } catch (err) {
      toast.error("Erro ao carregar insights");
      console.error("Erro ao carregar insights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-gray-200 h-20 rounded-lg"
          ></div>
        ))}
      </div>
    );
  }

  // 🔒 Evita crash mesmo se algo vier undefined
  const {
    total = 0,
    responded = 0,
    avgResponseTime = 0,
    topChannels = {},
    bestHour = "-",
    bestDay = "-",
    conversionRate = 0,
  } = data;

  const mainChannel =
    Object.entries(topChannels).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "desconhecido";

  const cards = [
    { label: "Total Follow-ups", value: total, color: "bg-indigo-500" },
    { label: "Respondidos", value: responded, color: "bg-emerald-500" },
    { label: "Taxa Conversão", value: `${conversionRate}%`, color: "bg-purple-500" },
    { label: "Tempo Médio Resp.", value: `${avgResponseTime} min`, color: "bg-blue-500" },
    { label: "Melhor Hora", value: bestHour, color: "bg-pink-500" },
    { label: "Melhor Dia", value: bestDay, color: "bg-orange-500" },
    { label: "Canal Top", value: mainChannel, color: "bg-yellow-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
      {cards.map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
          transition={{ duration: 0.4 }}
          className={`${item.color} text-white rounded-lg shadow p-4 flex flex-col items-center`}
        >
          <p className="text-xs opacity-90">{item.label}</p>
          <p className="text-lg font-bold">{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default FollowupInsights;
