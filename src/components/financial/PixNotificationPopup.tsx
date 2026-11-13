import { useNotificationMotion } from '../../hooks/useNotificationMotion';
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, CheckCircle, User, X, Zap } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../contexts/NotificationContext";
import { formatCurrency } from "../../utils/format";

const PixNotificationPopup: React.FC = () => {
  const { paymentNotification: incomingNotification, closePaymentNotification } = useNotification();
  const navigate = useNavigate();

  const { notification: paymentNotification, visible, motionProps } = useNotificationMotion(incomingNotification);
  if (!paymentNotification) return null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleViewDetails = () => {
    if (paymentNotification?.patientName) {
      // envia o usuário para o módulo financeiro filtrando o paciente
      const encoded = encodeURIComponent(paymentNotification.patientName.trim());
      navigate(`/financeiro?patient=${encoded}`);
    } else {
      navigate(`/financeiro`);
    }
    closePaymentNotification();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-6 right-6"
          {...motionProps}
        >
          <div className="relative overflow-hidden bg-emerald-700 text-white rounded-2xl shadow-lg border border-emerald-500/60 w-80 cursor-pointer">

            {/* Indicador de status */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-emerald-400"></div>

            {/* Conteúdo */}
            <div className="relative z-10 p-5">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <motion.div
                      className="bg-white/20 p-2 rounded-xl shadow-lg"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1, type: "spring" }}
                    >
                      <Zap size={22} className="text-lime-300" />
                    </motion.div>
                    <motion.span
                      className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-lime-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      <CheckCircle size={12} className="text-white" />
                    </motion.span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight text-white drop-shadow-sm">
                      Pagamento Recebido
                    </h3>
                    <p className="text-sm text-lime-100/90 font-medium">
                      Transação PIX confirmada
                    </p>
                  </div>
                </div>

                <button
                  onClick={closePaymentNotification}
                  className="text-lime-100/80 hover:text-white transition-all duration-quick hover:bg-white/10 rounded-lg p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Valor */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="text-lime-100/80 text-sm mb-1">Valor recebido</div>
                <div className="text-2xl font-bold text-white drop-shadow-sm">
                  {formatCurrency(paymentNotification.amount ?? 0)}
                </div>
              </motion.div>

              {/* Detalhes */}
              <div className="space-y-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center text-sm">
                  <User size={16} className="text-lime-300 mr-3" />
                  <div>
                    <div className="text-lime-100/80 text-xs">Cliente</div>
                    <div className="font-medium text-white">
                      {paymentNotification.patientName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-sm">
                  <Calendar size={16} className="text-lime-300 mr-3" />
                  <div>
                    <div className="text-lime-100/80 text-xs">Data e horário</div>
                    <div className="font-medium text-white">
                      {formatDate(paymentNotification.date ?? new Date())} às{" "}
                      {formatTime(paymentNotification.date ?? new Date())}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20">
                  <div className="text-lime-100/80 text-xs mb-1">ID da transação</div>
                  <div className="text-xs font-mono text-white/90 break-all select-text">
                    {paymentNotification.id}
                  </div>
                </div>
              </div>

              {/* Rodapé */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={() => {
                    handleViewDetails();
                    if (paymentNotification.patientName) {
                      const encoded = encodeURIComponent(paymentNotification.patientName);
                      navigate(`/financeiro?patient=${encoded}`);
                    } else {
                      navigate("/financeiro");
                    }
                  }}
                  className="text-emerald-800 font-semibold text-sm py-2 px-4 rounded-lg bg-lime-300 hover:bg-lime-200 transition-all duration-quick shadow-lg hover:shadow-lime-300/25 hover:scale-105 active:scale-95"
                >
                  Ver detalhes
                </button>
                <button
                  onClick={closePaymentNotification}
                  className="text-lime-100/90 hover:text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors duration-quick hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PixNotificationPopup;
