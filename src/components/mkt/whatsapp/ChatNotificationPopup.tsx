import { useNotificationMotion } from '../../../hooks/useNotificationMotion';
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useEffect } from "react";
import notifySound from "../../../assets/notify1.wav";
import { useChatNavigation } from "../../../contexts/ChatNavigationContext";
import { useNotification } from "../../../contexts/NotificationContext";

export const ChatNotificationPopup = () => {
    const { chatNotification: incomingNotification, closeChatNotification } = useNotification();
    const { setPendingContactPhone, setShouldOpenMessagesTab } = useChatNavigation();

    useEffect(() => {
        if (incomingNotification) {
            const audio = new Audio(notifySound);
            audio.play().catch(() => { });
        }
    }, [incomingNotification]);

    const { notification: chatNotification, visible, motionProps } = useNotificationMotion(incomingNotification);
  if (!chatNotification) return null;

    const handleOpenChat = () => {
        console.log('🔔 ChatNotificationPopup: Abrindo chat para', chatNotification.from);

        // ✅ Marca o telefone pendente
        setPendingContactPhone(chatNotification.from);

        // ✅ Sinaliza que deve abrir a aba Mensagens
        setShouldOpenMessagesTab(true);

        // ✅ Fecha a notificação
        closeChatNotification();
    };

    return (
        <AnimatePresence>
      {visible && (
            <motion.div
                className="fixed bottom-6 right-6"
                {...motionProps}
            >
                <div className="bg-white border border-emerald-400/60 rounded-2xl shadow-xl p-5 w-80">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <MessageCircle className="text-emerald-600" size={22} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-700">
                                    Nova mensagem no WhatsApp 💚
                                </h3>
                                <p className="text-sm text-gray-600 truncate">
                                    {chatNotification.contactName || chatNotification.from}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={closeChatNotification}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {chatNotification.text && (
                        <p className="mt-3 text-sm italic text-gray-600 line-clamp-2">
                            "{chatNotification.text}"
                        </p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleOpenChat}
                            className="text-sm text-white bg-emerald-500 hover:bg-emerald-600 py-2 px-4 rounded-lg transition"
                        >
                            Ver conversa
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
    );
};