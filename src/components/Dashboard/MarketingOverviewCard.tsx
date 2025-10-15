import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import API from "@/services/api";

export default function MarketingOverviewCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    API.get("/marketing/overview").then((res) => setData(res.data.data));
  }, []);

  if (!data) return <p>Carregando...</p>;

  const { ga4, followup } = data;

  return (
    <Card className="p-5 shadow-md">
      <h3 className="text-lg font-semibold mb-2">📊 Visão Geral de Marketing</h3>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm text-gray-500">GA4 – Tráfego</h4>
          <p>Usuários: {ga4.totalUsers}</p>
          <p>Sessões: {ga4.sessions}</p>
          <p>Duração média: {ga4.avgSessionDuration}s</p>
        </div>

        <div>
          <h4 className="text-sm text-gray-500">Follow-ups – Engajamento</h4>
          <p>Enviados: {followup.sent}</p>
          <p>Falhos: {followup.failed}</p>
          <p>Taxa de sucesso: {followup.successRate}%</p>
        </div>
      </div>

      <div className="h-52 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[
            { name: "Usuários", value: ga4.totalUsers },
            { name: "Sessões", value: ga4.sessions },
            { name: "Follow-ups", value: followup.sent },
          ]}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
