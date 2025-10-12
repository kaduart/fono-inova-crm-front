import { motion } from "framer-motion";
import React from "react";

interface FollowupStatsProps {
  data?: {
    sent: number;
    failed: number;
    scheduled: number;
    processing: number;
    responded: number;
    conversionRate: number | string;
  };
}

const FollowupStats: React.FC<FollowupStatsProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="text-gray-500 text-center py-4">
        Carregando estatísticas...
      </div>
    );
  }

  const cards = [
    { label: "Enviados", value: data.sent ?? 0, color: "bg-green-500" },
    { label: "Agendados", value: data.scheduled ?? 0, color: "bg-yellow-500" },
    { label: "Falhados", value: data.failed ?? 0, color: "bg-red-500" },
    { label: "Processando", value: data.processing ?? 0, color: "bg-blue-500" },
    { label: "Respondidos", value: data.responded ?? 0, color: "bg-emerald-500" },
    { label: "Conversão", value: `${data.conversionRate ?? 0}%`, color: "bg-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((item) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
          transition={{ duration: 0.4 }}
          className={`${item.color} text-white rounded-lg shadow p-4 flex flex-col items-center`}
        >
          <p className="text-sm opacity-90">{item.label}</p>
          <p className="text-2xl font-bold">{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default FollowupStats;
