import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import API from "../../services/api";

const FollowupAvgTimeCard = () => {
    const [avg, setAvg] = useState(0);

    useEffect(() => {
        API.get("/followups/avg-response-time").then((res) => setAvg(res.data.data.avgMinutes));
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-center flex-col group hover:shadow-md transition-all duration-200">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-3 group-hover:scale-105 transition-transform duration-200">
                <Clock className="text-blue-600" size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Tempo médio de resposta</h3>
            <p className="text-2xl font-bold text-slate-800">{avg} min</p>
        </div>
    );
};

export default FollowupAvgTimeCard;