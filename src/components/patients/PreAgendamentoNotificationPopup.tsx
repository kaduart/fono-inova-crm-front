import { AnimatePresence, motion } from "framer-motion";
import { Calendar, User, X, ClipboardList } from "lucide-react";
import { useEffect } from "react";
import notifySound from "../../assets/notify2.wav";
import { useNotification } from "../../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";

export const PreAgendamentoNotificationPopup = () => {
  const { preAgendamentoNotification, closePreAgendamentoNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (preAgendamentoNotification) {
      const audio = new Audio(notifySound);
      audio.play().catch(() => { });
    }
  }, [preAgendamentoNotification]);

  if (!preAgendamentoNotification) return null;

  const handleView = () => {
    // Navega para a tela de pré-agendamentos
    navigate("/pre-agendamentos"); // ajuste sua rota
    closePreAgendamentoNotification();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        <div className="bg-white border-2 border-amber-400 rounded-2xl shadow-2xl p-5 w-96 backdrop-blur-md">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-xl">
                <ClipboardList className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-amber-700 text-lg">
                  Novo Pré-Agendamento 📋
                </h3>
                <p className="text-xs text-gray-500">
                  Recebido há poucos segundos
                </p>
              </div>
            </div>
            <button
              onClick={closePreAgendamentoNotification}
              className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2 mb-4 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={16} className="text-amber-500" />
              <span className="font-medium">{preAgendamentoNotification.patientName}</span>
            </div>

            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={16} className="text-amber-500" />
              <span className="text-sm">
                {preAgendamentoNotification.specialty} • {preAgendamentoNotification.preferredDate}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={closePreAgendamentoNotification}
              className="text-sm text-gray-500 hover:text-gray-700 py-2 px-4 rounded-lg transition"
            >
              Ignorar
            </button>
            <button
              onClick={handleView}
              className="text-sm text-white bg-amber-500 hover:bg-amber-600 py-2 px-4 rounded-lg transition font-medium shadow-md hover:shadow-lg"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};