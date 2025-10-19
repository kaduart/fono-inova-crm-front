import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "react-hot-toast";

interface LeadAmandaModalProps {
    lead: any | null;
    open: boolean;
    onClose: () => void;
    onSent?: () => void;
}

export const LeadAmandaModal: React.FC<LeadAmandaModalProps> = ({
    lead,
    open,
    onClose,
    onSent,
}) => {
    const [reason, setReason] = useState("reengajamento");
    const [campaign, setCampaign] = useState("");
    const [draft, setDraft] = useState("");
    const [contextSummary, setContextSummary] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [temperature, setTemperature] = useState(0.8);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (lead) fetchContext();
    }, [lead]);

    const fetchContext = async () => {
        try {
            const res = await axios.get(`/api/chat-context/${lead._id}`);
            const data = res.data?.context || {};
            setMessages(data.messages || []);
            setContextSummary(data.summary || "");
        } catch {
            console.warn("Nenhum contexto encontrado.");
        }
    };

    const handleGenerate = async () => {
        if (!lead) return;
        setLoading(true);
        try {
            const res = await axios.post("/api/amanda/draft", {
                leadId: lead._id,
                reason,
                temperature,
            });
            setDraft(res.data.draft || "");
        } catch {
            toast.error("Erro ao gerar mensagem 💚");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!draft.trim()) return toast.error("Mensagem vazia.");
        setSending(true);
        try {
            await axios.post("/api/amanda/send", {
                leadId: lead._id,
                message: draft,
                reason,
                campaign,
            });
            toast.success("Follow-up enviado com sucesso 💚");
            onSent?.();
            onClose();
        } catch {
            toast.error("Erro ao enviar mensagem.");
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose} title={`Amanda 💚 — Assistente Virtual`}>
            {!lead ? (
                <p className="p-4 text-gray-500">Selecione um lead para continuar.</p>
            ) : (
                <div className="space-y-5">
                    {/* Histórico de conversas */}
                    {messages.length > 0 && (
                        <div className="bg-gray-50 border rounded-md p-3 max-h-48 overflow-y-auto">
                            <h4 className="font-semibold text-sm mb-2 text-gray-700">Últimas mensagens</h4>
                            {messages.slice(-6).map((m, i) => (
                                <div key={i} className="text-sm mb-1">
                                    <span className="font-medium">
                                        {m.direction === "inbound" ? "Cliente:" : "Amanda:"}
                                    </span>{" "}
                                    {m.text}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Resumo do contexto */}
                    {contextSummary && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Resumo do contexto</label>
                            <textarea
                                rows={2}
                                className="border border-gray-300 rounded-md w-full p-2 bg-gray-50"
                                readOnly
                                value={contextSummary}
                            />
                        </div>
                    )}

                    {/* Configurações */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Motivo</label>
                            <select
                                className="border border-gray-300 rounded-md w-full p-2"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            >
                                <option value="reengajamento">Reengajamento</option>
                                <option value="no_show">Faltou à sessão</option>
                                <option value="pacote_fim">Fim de pacote</option>
                                <option value="lembrete_avaliacao">Lembrete de avaliação</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Temperatura (criatividade)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="1.2"
                                value={temperature}
                                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                className="border border-gray-300 rounded-md w-full p-2"
                            />
                        </div>
                    </div>

                    {/* Campanha */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Campanha</label>
                        <input
                            className="border border-gray-300 rounded-md w-full p-2"
                            value={campaign}
                            onChange={(e) => setCampaign(e.target.value)}
                            placeholder="ex: Outubro Verde"
                        />
                    </div>

                    {/* Mensagem da Amanda 💚 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Mensagem</label>
                        <textarea
                            rows={4}
                            className="border border-gray-300 rounded-md w-full p-2"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <Button
                            variant="secondary"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? "Gerando..." : "Gerar novamente 💚"}
                        </Button>

                        <div className="space-x-2">
                            <Button variant="secondary" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSend} disabled={sending}>
                                {sending ? "Enviando..." : "Enviar 💚"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};
