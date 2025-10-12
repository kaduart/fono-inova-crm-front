// FollowupTimeline.tsx
import { useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";

export const PRESET_FOLLOWUPS = [
  { step: 1, label: "Agradecimento inicial", message: "Olá! Aqui é da Clínica Fono Inova..." },
  { step: 2, label: "Reforço de proposta", message: "Oi! Passando pra confirmar..." },
  { step: 3, label: "Lembrete amigável", message: "Seguimos à disposição..." },
  { step: 4, label: "Condição especial", message: "Aproveite nossa condição especial..." },
  { step: 5, label: "Último contato", message: "Estamos encerrando nossa agenda..." }
];

const FollowupTimeline = ({ lead, existingFollowups }) => {
  const [sending, setSending] = useState(false);
  const sentSteps = existingFollowups.map(f => f.message);

  const handleSend = async (step) => {
    const preset = PRESET_FOLLOWUPS[step - 1];
    try {
      setSending(true);
      await API.post("/followups", {
        lead: lead._id,
        message: preset.message,
        playbook: "reengajamento",
        scheduledAt: new Date().toISOString()
      });
      toast.success(`Follow-up ${step} enviado!`);
      setSending(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar follow-up");
      setSending(false);
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Timeline de Follow-ups</h3>
      <ol className="relative border-l border-blue-200">
        {PRESET_FOLLOWUPS.map((item) => {
          const alreadySent = sentSteps.includes(item.message);
          return (
            <li key={item.step} className="mb-6 ml-4">
              <div className={`absolute w-3 h-3 rounded-full -left-1.5 ${alreadySent ? "bg-green-500" : "bg-blue-300"}`} />
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-600 mb-2">{item.message}</p>
              <button
                disabled={alreadySent || sending}
                onClick={() => handleSend(item.step)}
                className={`px-3 py-1 rounded text-sm ${
                  alreadySent
                    ? "bg-green-500 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                {alreadySent ? "Enviado ✅" : sending ? "Enviando..." : "Enviar agora"}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default FollowupTimeline;
