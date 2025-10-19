import { AnimatePresence, motion } from "framer-motion";
import { FileAudio, FileText, Image, Paperclip, Video, X } from "lucide-react";
import { useEffect } from "react";
import notifySound from "../../../assets/notify1.wav";
import { useNotification } from "../../../contexts/NotificationContext";

const iconMap = {
    image: Image,
    video: Video,
    audio: FileAudio,
    document: FileText,
};

export const MediaNotificationPopup = () => {
    const { mediaNotification, closeMediaNotification } = useNotification();
    if (!mediaNotification) return null;


    useEffect(() => {
        if (mediaNotification) {
            const audio = new Audio(notifySound);
            audio.play().catch(() => { });
        }
    }, [mediaNotification]);

    const Icon = iconMap[mediaNotification.type as keyof typeof iconMap] || Paperclip;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed bottom-6 right-6 z-50"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
                <div className="bg-white border border-emerald-400/60 rounded-2xl shadow-xl p-5 w-80 backdrop-blur-md">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <Icon className="text-emerald-600" size={22} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-700">
                                    Nova mídia recebida 💚
                                </h3>
                                <p className="text-sm text-gray-600">{mediaNotification.from}</p>
                            </div>
                        </div>
                        <button
                            onClick={closeMediaNotification}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {mediaNotification.caption && (
                        <p className="mt-3 text-sm italic text-gray-600">
                            “{mediaNotification.caption}”
                        </p>
                    )}

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => {
                                // 🔜 opcional: abrir painel de conversa
                                closeMediaNotification();
                            }}
                            className="text-sm text-white bg-emerald-500 hover:bg-emerald-600 py-2 px-4 rounded-lg transition"
                        >
                            Ver conversa
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
