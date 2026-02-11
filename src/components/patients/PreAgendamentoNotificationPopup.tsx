import { AnimatePresence, motion } from "framer-motion";
import { Calendar, User, X, ClipboardList } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import notifySound from "../../assets/notify2.wav";
import { useNotification } from "../../contexts/NotificationContext";

// ----------------------------------------------------------------------
// Tipagem (assumindo a estrutura do objeto de notificação)
// ----------------------------------------------------------------------
interface PreAgendamentoNotificationData {
  patientName: string;
  specialty: string;
  preferredDate: string;
  // outros campos podem existir, mas apenas os usados são tipados
}

interface NotificationContextValue {
  preAgendamentoNotification: PreAgendamentoNotificationData | null;
  closePreAgendamentoNotification: () => void;
}

// Nota: o contexto real deve prover os tipos acima; aqui apenas garantimos
// que o componente entende a forma dos dados recebidos.
// ----------------------------------------------------------------------

export const PreAgendamentoNotificationPopup = () => {
  const { preAgendamentoNotification, closePreAgendamentoNotification } =
    useNotification() as NotificationContextValue;
  const navigate = useNavigate();

  useEffect(() => {
    if (preAgendamentoNotification) {
      const audio = new Audio(notifySound);
      audio.play().catch(() => {
        // Silencia erro de reprodução automática (política de navegador)
      });
    }
  }, [preAgendamentoNotification]);

  if (!preAgendamentoNotification) return null;

  const handleView = () => {
    navigate("/pre-agendamentos");
    closePreAgendamentoNotification();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Card minimalista - sem bordas chamativas, sem blur, sem sombra pesada */}
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm w-72 p-4">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-amber-50 p-1.5 rounded-md">
                <ClipboardList className="text-amber-600" size={16} />
              </div>
              <div>
                <h3 className="font-medium text-gray-800 text-sm">
                  Novo pré-agendamento
                </h3>
                <p className="text-gray-400 text-[10px] leading-tight">
                  agora mesmo
                </p>
              </div>
            </div>
            <button
              onClick={closePreAgendamentoNotification}
              className="text-gray-300 hover:text-gray-500 transition p-1 rounded-sm hover:bg-gray-50"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="space-y-1.5 mb-3 bg-gray-50/80 p-2.5 rounded-md border border-gray-100">
            <div className="flex items-center gap-1.5 text-gray-700">
              <User size={13} className="text-gray-500" />
              <span className="text-xs font-medium">
                {preAgendamentoNotification.patientName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar size={13} className="text-gray-500" />
              <span className="text-[11px]">
                {preAgendamentoNotification.specialty} •{" "}
                {preAgendamentoNotification.preferredDate}
              </span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={closePreAgendamentoNotification}
              className="text-[11px] text-gray-400 hover:text-gray-600 py-1.5 px-2.5 rounded-md transition"
            >
              Ignorar
            </button>
            <button
              onClick={handleView}
              className="text-[11px] text-white bg-amber-500 hover:bg-amber-600 py-1.5 px-3 rounded-md transition font-medium shadow-sm"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};