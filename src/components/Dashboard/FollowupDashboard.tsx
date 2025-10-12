import React from "react";

const FollowupStats = ({ stats = {} }) => {
  const safeStats = {
    sent: stats.sent || 0,
    failed: stats.failed || 0,
    scheduled: stats.scheduled || 0,
    processing: stats.processing || 0,
    responded: stats.responded || 0,
    conversionRate: stats.conversionRate || 0,
  };

  const cards = [
    { label: "Enviados", value: safeStats.sent, color: "bg-green-500" },
    { label: "Agendados", value: safeStats.scheduled, color: "bg-yellow-500" },
    { label: "Falhados", value: safeStats.failed, color: "bg-red-500" },
    { label: "Processando", value: safeStats.processing, color: "bg-blue-500" },
    { label: "Respondidos", value: safeStats.responded, color: "bg-emerald-500" },
    { label: "Conversão", value: `${safeStats.conversionRate}%`, color: "bg-indigo-500" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((item) => (
        <div
          key={item.label}
          className={`${item.color} text-white rounded-lg shadow p-4 flex flex-col items-center justify-center transition-all hover:scale-[1.02]`}
        >
          <p className="text-sm opacity-90">{item.label}</p>
          <p className="text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default FollowupStats;
