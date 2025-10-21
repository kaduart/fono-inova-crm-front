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

    // ✅ Hook sempre executado (evita erro de hooks)
    useEffect(() => {
        if (mediaNotification) {
            const audio = new Audio(notifySound);
            audio.play().catch(() => { });
        }
    }, [mediaNotification]);

    // 🔹 Retorna só o layout (sem quebrar ordem de hooks)
    if (!mediaNotification) return null;

    const Icon = iconMap[mediaNotification.type as keyof typeof iconMap] || Paperclip;

    // 🔸 Prévia visual dependendo do tipo
    const renderPreview = () => {
        switch (mediaNotification.type) {
            case "image":
                return (
                    <img
                        src={mediaNotification.url}
                        alt="Mídia recebida"
                        className="mt-3 rounded-lg shadow-sm max-h-40 object-cover w-full"
                    />
                );
            case "video":
                return (
                    <video
                        controls
                        src={mediaNotification.url}
                        className="mt-3 rounded-lg shadow-sm max-h-40 w-full"
                    />
                );
            case "audio":
                return (
                    <audio
                        controls
                        src={mediaNotification.url}
                        className="mt-3 w-full rounded-lg"
                    />
                );
            case "document":
                return (
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                        <FileText size={18} />
                        <span>Documento recebido</span>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed bottom-6 right-6 z-50"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
                <div className="bg-white/90 backdrop-blur-md border border-emerald-400/60 rounded-2xl shadow-xl p-5 w-80 relative overflow-hidden">
                    {/* Borda animada sutil */}
                    <div className="absolute inset-0 rounded-2xl border border-emerald-400/30 animate-pulse pointer-events-none" />

                    {/* Cabeçalho */}
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-xl">
                                <Icon className="text-emerald-600" size={22} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-700 leading-tight">
                                    Nova mídia recebida 💚
                                </h3>
                                <p className="text-sm text-gray-600 truncate max-w-[160px]">
                                    {mediaNotification.from}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={closeMediaNotification}
                            className="text-gray-400 hover:text-gray-600 transition"
                            title="Fechar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Prévia */}
                    {renderPreview()}

                    {/* Legenda opcional */}
                    {mediaNotification.caption && (
                        <p className="mt-3 text-sm italic text-gray-600">
                            “{mediaNotification.caption}”
                        </p>
                    )}

                    {/* Botão */}
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => {
                                // 🔜 Abrir chat no futuro
                                closeMediaNotification();
                            }}
                            className="text-sm text-white bg-emerald-500 hover:bg-emerald-600 py-2 px-4 rounded-lg transition shadow-md"
                        >
                            Ver conversa
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
