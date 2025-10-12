import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import API from "../../services/api";

const FollowupAvgTimeCard = () => {
    const [avg, setAvg] = useState(0);

    useEffect(() => {
        API.get("/followups/avg-response-time").then((res) => setAvg(res.data.data.avgMinutes));
    }, []);

    return (
        <div className="bg-white rounded-lg shadow p-4 mt-6 flex items-center justify-center flex-col">
            <Clock className="text-blue-500 mb-2" size={32} />
            <h3 className="text-sm font-semibold text-gray-700">⏱ Tempo médio de resposta</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">{avg} min</p>
        </div>
    );
};

export default FollowupAvgTimeCard;
