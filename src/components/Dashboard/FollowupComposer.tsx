import { motion } from "framer-motion";
import { Loader2, Send, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-toastify";
import API from "../../services/api";
import { Button } from "../ui/Button";

interface FollowupComposerProps {
    lead: any;
    onCreated?: () => void;
}

const FollowupComposer: React.FC<FollowupComposerProps> = ({ lead, onCreated }) => {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [scheduledAt, setScheduledAt] = useState("");

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await API.post("/ai/amanda/generate-followup", { leadId: lead._id });
            setMessage(res.data.message);
            toast.success("Mensagem gerada pela Amanda ✨");
        } catch {
            toast.error("Erro ao gerar mensagem");
        } finally {
            setGenerating(false);
        }
    };

    const handleSubmit = async () => {
        if (!message.trim()) return toast.warn("Escreva ou gere uma mensagem.");
        setLoading(true);
        try {
            await API.post("/followups", {
                lead: lead._id,
                message,
                scheduledAt: scheduledAt || new Date().toISOString(),
            });
            toast.success("Follow-up agendado com sucesso!");
            if (onCreated) onCreated();
        } catch (err) {
            toast.error("Erro ao agendar follow-up");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-4"
        >
            <h3 className="font-semibold text-lg mb-3 text-gray-800">
                ✉️ Novo Follow-up para {lead.name}
            </h3>

            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite ou gere uma mensagem..."
                className="w-full border rounded p-2 text-sm mb-3 h-28 focus:ring-2 focus:ring-blue-400"
            />

            <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="border rounded p-2 w-full mb-3 text-sm"
            />

            <div className="flex gap-2 justify-end">
                <Button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="bg-purple-500 hover:bg-purple-600 text-white text-sm flex items-center gap-1"
                >
                    {generating ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles size={16} />}
                    Gerar com Amanda
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm flex items-center gap-1"
                >
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={16} />}
                    Agendar
                </Button>
            </div>
        </motion.div>
    );
};

export default FollowupComposer;
