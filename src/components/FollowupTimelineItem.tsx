import React from "react";
import { motion } from "framer-motion";
import StatusBadge from "./StatusBadge";
import { Send } from "lucide-react";

type Props = {
  fu: any;
  onResend?: (id: string) => void;
};

// === Cor do marcador lateral ===
const dotColor = (status: string) => {
  if (status === "sent") return "bg-green-500";
  if (status === "failed") return "bg-red-500";
  if (status === "scheduled") return "bg-yellow-400";
  if (status === "processing") return "bg-blue-500";
  return "bg-gray-300";
};

const FollowupTimelineItem: React.FC<Props> = ({ fu, onResend }) => {
  const sentTime = fu.sentAt
    ? new Date(fu.sentAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`mb-6 ml-2 relative pl-3 pr-2 py-2 rounded-md border-l-4 shadow-sm transition-all 
        ${fu.responded ? "border-green-400 bg-green-50/70" : "border-blue-100 bg-white"}`}
    >
      {/* bolinha lateral */}
      <div
        className={`absolute w-3 h-3 rounded-full -left-1.5 ${dotColor(fu.status)}`}
      />

      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{fu.message}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">
              {fu.scheduledAt
                ? new Date(fu.scheduledAt).toLocaleString("pt-BR")
                : "—"}
            </span>

            {sentTime && (
              <span className="text-xs text-gray-400">
                (enviado {sentTime})
              </span>
            )}

            <StatusBadge status={fu.status} />

            {fu.responded && (
              <span className="text-xs text-green-600 font-medium">
                💬 Respondido
              </span>
            )}
          </div>
        </div>

        {fu.status === "failed" && !!onResend && (
          <button
            onClick={() => onResend(fu._id)}
            className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded flex items-center gap-1 shadow-sm transition-all"
          >
            <Send size={12} /> Reenviar
          </button>
        )}
      </div>
    </motion.li>
  );
};

export default FollowupTimelineItem;
