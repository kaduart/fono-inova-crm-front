import React, { useEffect, useState } from "react";
import API from "../../services/api";

const FollowupInsightsCard = () => {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        API.get("/followups/analytics/latest")
            .then(res => setData(res.data.data))
            .catch(() => { });
    }, []);

    if (!data) return null;

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl shadow">
            <h3 className="font-semibold text-gray-700 mb-3">💡 Insights Semanais</h3>
            <ul className="text-sm text-gray-600 space-y-1">
                <li>📈 Taxa de resposta: <strong>{data.conversionRate}%</strong></li>
                <li>🕐 Horário mais eficaz: <strong>{data.bestHour || "—"}h</strong></li>
                <li>🌐 Canal mais engajador: <strong>{data.bestChannel}</strong></li>
            </ul>
        </div>
    );
};

export default FollowupInsightsCard;
