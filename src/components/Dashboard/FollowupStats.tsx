import { motion } from "framer-motion";
import { CheckCircle, Clock, MessageCircle, PlayCircle, TrendingUp, XCircle } from "lucide-react";
import React from "react";

// 🎯 Interface mais específica e tipagem segura
interface FollowupStatsData {
  sent: number;
  failed: number;
  scheduled: number;
  processing: number;
  responded: number;
  conversionRate: number;
  aiOptimized?: number;
}

interface FollowupStatsProps {
  data?: FollowupStatsData;
  loading?: boolean;
  error?: string;
}

// 🎨 Componente de Card individual para melhor performance
const StatCard = ({
  item,
  index
}: {
  item: any;
  index: number;
}) => {
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
};

// 🔄 Skeleton Loading como componente separado
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
    {[...Array(6)].map((_, i) => (
      <div
        key={i}
        className="animate-pulse bg-slate-200 h-24 rounded-xl"
        data-testid="stat-card-skeleton"
      />
    ))}
  </div>
);

// ⚡ Componente principal com melhorias
const FollowupStats: React.FC<FollowupStatsProps> = ({
  data,
  loading = false,
  error
}) => {
  // 🚨 Tratamento de erro
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center mb-6">
        <p className="text-red-800 font-medium">Erro ao carregar estatísticas</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  // 🔄 Estado de loading
  if (loading || !data) {
    return <StatsSkeleton />;
  }

  // 🎯 Dados normalizados com fallbacks seguros
  const normalizedData = {
    sent: data.sent ?? 0,
    failed: data.failed ?? 0,
    scheduled: data.scheduled ?? 0,
    processing: data.processing ?? 0,
    responded: data.responded ?? 0,
    conversionRate: data.conversionRate ?? 0,
  };

  // 🎨 Configuração dos cards com validação
  const cards = [
    {
      label: "Enviados",
      value: normalizedData.sent.toLocaleString('pt-BR'),
      icon: MessageCircle,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
      borderColor: "border-green-200",
      description: "Mensagens entregues com sucesso"
    },
    {
      label: "Agendados",
      value: normalizedData.scheduled.toLocaleString('pt-BR'),
      icon: Clock,
      color: "bg-yellow-500",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-600",
      borderColor: "border-yellow-200",
      description: "Follow-ups programados"
    },
    {
      label: "Falhados",
      value: normalizedData.failed.toLocaleString('pt-BR'),
      icon: XCircle,
      color: "bg-red-500",
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      borderColor: "border-red-200",
      description: "Erros no envio"
    },
    {
      label: "Processando",
      value: normalizedData.processing.toLocaleString('pt-BR'),
      icon: PlayCircle,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      borderColor: "border-blue-200",
      description: "Em fila de processamento"
    },
    {
      label: "Respondidos",
      value: normalizedData.responded.toLocaleString('pt-BR'),
      icon: CheckCircle,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      borderColor: "border-emerald-200",
      description: "Leads que responderam"
    },
    {
      label: "Conversão",
      value: `${normalizedData.conversionRate}%`,
      icon: TrendingUp,
      color: "bg-indigo-500",
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      borderColor: "border-indigo-200",
      description: "Taxa de resposta"
    },
  ].filter(Boolean); // 🛡️ Remove itens inválidos

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6"
      data-testid="followup-stats-container"
    >
      {cards.map((item, index) => (
        <StatCard
          key={item.label}
          item={item}
          index={index}
        />
      ))}
    </div>
  );
};

// 🎯 Export com memo para otimização de performance
export default React.memo(FollowupStats);