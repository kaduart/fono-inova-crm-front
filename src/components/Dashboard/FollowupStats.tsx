import { motion } from "framer-motion";
import { CheckCircle, Clock, MessageCircle, PlayCircle, TrendingUp, XCircle } from "lucide-react";
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-200 h-24 rounded-xl"></div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Enviados",
      value: data.sent ?? 0,
      icon: MessageCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      borderColor: "border-green-200"
    },
    {
      label: "Agendados",
      value: data.scheduled ?? 0,
      icon: Clock,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      borderColor: "border-yellow-200"
    },
    {
      label: "Falhados",
      value: data.failed ?? 0,
      icon: XCircle,
      color: "bg-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      borderColor: "border-red-200"
    },
    {
      label: "Processando",
      value: data.processing ?? 0,
      icon: PlayCircle,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-200"
    },
    {
      label: "Respondidos",
      value: data.responded ?? 0,
      icon: CheckCircle,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200"
    },
    {
      label: "Conversão",
      value: `${data.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-200"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`bg-white rounded-2xl shadow-sm border ${item.borderColor} p-5 hover:shadow-md transition-all duration-200 group`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${item.bgColor} border ${item.borderColor}`}>
                <IconComponent size={18} className={item.textColor} />
              </div>
              <div className={`w-2 h-2 rounded-full ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>

            <p className="text-2xl font-bold text-slate-800 mb-1">{item.value}</p>
            <p className="text-sm text-slate-600 font-medium">{item.label}</p>

            <div className={`h-1 w-8 ${item.color} rounded-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          </motion.div>
        );
      })}
    </div>
  );
};

export default FollowupStats;