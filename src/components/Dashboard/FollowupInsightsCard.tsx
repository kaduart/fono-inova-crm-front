import { useEffect, useState } from "react";
import API from "../../services/api";

type InsightsPayload = {
    total?: number;
    responded?: number;
    conversionRate?: number;
    bestHour?: string | number | null;
    bestDay?: string;
    topChannels?: Record<string, number>;
    // extras do back que não quebram o componente:
    aiPerformance?: any;
    insights?: any;
};

const FollowupInsightsCard = () => {
    const [data, setData] = useState<{
        conversionRate: number;
        bestHourDisplay: string;
        bestChannel: string;
    } | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await API.get("/followups/analytics");
                const raw: InsightsPayload = res?.data?.data || {};

                // 🔧 conversionRate => se não vier pronto, calcula em cima de responded/total
                const conversionRate =
                    typeof raw.conversionRate === "number" && !Number.isNaN(raw.conversionRate)
                        ? raw.conversionRate
                        : raw.total
                            ? Math.round((((raw.responded || 0) / raw.total) * 100) * 10) / 10
                            : 0;

                // 🔧 bestChannel => deriva do topChannels (mapa origin->count)
                const top = raw.topChannels || {};
                const bestChannel =
                    Object.entries(top).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "—";

                // 🔧 bestHourDisplay => evita duplicar "h" se back já mandou "10h"
                let bestHourDisplay = "—";
                if (raw.bestHour !== null && raw.bestHour !== undefined) {
                    if (typeof raw.bestHour === "string") {
                        bestHourDisplay = raw.bestHour; // já formatado no back (ex.: "10h")
                    } else if (typeof raw.bestHour === "number") {
                        bestHourDisplay = `${raw.bestHour}h`;
                    }
                }

                setData({
                    conversionRate,
                    bestHourDisplay,
                    bestChannel,
                });
            } catch {
                // silencioso pra não poluir o card
            }
        };

        fetchInsights();
    }, []);

    if (!data) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow">
            <h3 className="font-semibold text-gray-700 mb-3">💡 Insights Semanais</h3>
            <ul className="text-sm text-gray-600 space-y-1">
                <li>
                    📈 Taxa de resposta: <strong>{data.conversionRate}%</strong>
                </li>
                <li>
                    🕐 Horário mais eficaz: <strong>{data.bestHourDisplay}</strong>
                </li>
                <li>
                    🌐 Canal mais engajador: <strong>{data.bestChannel}</strong>
                </li>
            </ul>
        </div>
    );
};

export default FollowupInsightsCard;
