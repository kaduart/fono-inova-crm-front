import { motion } from "framer-motion";
import { Brain, Calendar, Clock, MessageCircle, Target, TrendingUp, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../../services/api";

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

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-slate-200 h-24 rounded-xl"
          ></div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <Brain size={48} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Nenhum dado de insights disponível</p>
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
    "Nenhum";

  const cards = [
    {
      label: "Total Follow-ups",
      value: total,
      icon: MessageCircle,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-200"
    },
    {
      label: "Respondidos",
      value: responded,
      icon: TrendingUp,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200"
    },
    {
      label: "Taxa de Conversão",
      value: `${conversionRate}%`,
      icon: Target,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      borderColor: "border-purple-200"
    },
    {
      label: "Tempo Médio Resp.",
      value: `${avgResponseTime}min`,
      icon: Clock,
      color: "bg-amber-500",
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      borderColor: "border-amber-200"
    },
    {
      label: "Melhor Hora",
      value: bestHour,
      icon: Clock,
      color: "bg-pink-500",
      bgColor: "bg-pink-50",
      textColor: "text-pink-600",
      borderColor: "border-pink-200"
    },
    {
      label: "Melhor Dia",
      value: bestDay,
      icon: Calendar,
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      borderColor: "border-orange-200"
    },
    {
      label: "Canal Principal",
      value: mainChannel,
      icon: Users,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-200"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
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

export default FollowupInsights;