// src/components/whatsapp/AmandaStatusBadge.tsx
import { Tooltip } from "@mui/material";
import { useEffect, useState } from "react";
import API from "../../../services/api";

interface StatusData {
    success: boolean;
    status: string;
    api?: {
        groq?: string;
        openai?: string;
        primaryProvider?: string;
        groqTier?: string;
    };
    features?: {
        freeAI?: boolean;
    };
}

/**
 * Badge compacto de status da Amanda
 * 🟢 Online | 🟡 Parcial | 🔴 Offline
 */
export default function AmandaStatusBadge() {
    const [status, setStatus] = useState<"loading" | "online" | "partial" | "offline">("loading");
    const [details, setDetails] = useState<StatusData | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const { data } = await API.get("/amanda/status");

                if (data.success && data.status === "operational") {
                    setStatus("online");
                } else if (data.success) {
                    setStatus("partial");
                } else {
                    setStatus("offline");
                }
                setDetails(data);
            } catch {
                setStatus("offline");
                setDetails(null);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 60000); // 1 min
        return () => clearInterval(interval);
    }, []);

    const config = {
        loading: {
            color: "bg-gray-400",
            text: "Verificando...",
            textColor: "text-gray-600",
            tooltip: "Verificando status da Amanda..."
        },
        online: {
            color: "bg-green-500",
            text: "Amanda Online",
            textColor: "text-green-700",
            tooltip: `IA ativa via ${details?.api?.primaryProvider?.toUpperCase() || "Groq"} (${details?.api?.groqTier || "free"})`
        },
        partial: {
            color: "bg-yellow-500",
            text: "Parcial",
            textColor: "text-yellow-700",
            tooltip: "Amanda operando com limitações"
        },
        offline: {
            color: "bg-red-500",
            text: "Offline",
            textColor: "text-red-700",
            tooltip: "Amanda indisponível - mensagens serão respondidas manualmente"
        },
    };

    const { color, text, textColor, tooltip } = config[status];

    return (
        <Tooltip title={tooltip} arrow>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm cursor-help">
                <span
                    className={`w-2.5 h-2.5 rounded-full ${color} ${status === "online" ? "animate-pulse" : ""}`}
                />
                <span className={`text-sm font-medium ${textColor}`}>
                    {text}
                </span>
                {details?.features?.freeAI && status === "online" && (
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">
                        Free
                    </span>
                )}
            </div>
        </Tooltip>
    );
}