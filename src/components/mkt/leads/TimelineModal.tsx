// src/components/leads/TimelineModal.tsx
import { motion } from "framer-motion";
import { Calendar, MessageCircle, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import FollowupComposer from "../../Dashboard/FollowupComposer";
import FollowupTimelineItem from "../../FollowupTimelineItem";
import Skeleton from "../../ui/Skeleton";
import API from "../../../services/api";

interface TimelineModalProps {
    lead: any;
    onClose: () => void;
    onFollowupCreated: () => void;
}

const TimelineModal: React.FC<TimelineModalProps> = ({
    lead,
    onClose,
    onFollowupCreated,
}) => {
    const [followups, setFollowups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchLeadFollowups = async (leadId: string) => {
        try {
            setLoading(true);
            const res = await API.get(`/followups`, { params: { lead: leadId } });
            setFollowups(res.data.data || res.data || []);
        } catch (error) {
            toast.error("Erro ao carregar follow-ups");
            console.error("Erro:", error);
        } finally {
            setLoading(false);
        }
    };

    const resendFollowup = async (id: string) => {
        try {
            await API.post(`/followups/resend/${id}`);
            toast.success("Follow-up reenviado para fila!");
            if (lead?._id) fetchLeadFollowups(lead._id);
        } catch (error) {
            toast.error("Erro ao reenviar follow-up");
        }
    };

    useEffect(() => {
        if (lead?._id) {
            fetchLeadFollowups(lead._id);
        }
    }, [lead]);

    return (
        <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col"
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
            >
                {/* CABEÇALHO DO MODAL */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-6 text-white flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Timeline de {lead?.name}
                            </h2>
                            <p className="text-emerald-100 text-sm mt-1">
                                Histórico completo de interações
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* INFO DO LEAD */}
                    <div className="flex items-center gap-4 mt-4 text-sm">
                        {lead?.contact?.phone && (
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <MessageCircle size={14} />
                                <span>{lead.contact.phone}</span>
                            </div>
                        )}
                        {lead?.origin && (
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                                <Calendar size={14} />
                                <span>Origem: {lead.origin}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* CONTEÚDO DO MODAL */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="pl-4 border-l-2 border-slate-200">
                                    <Skeleton className="h-3 w-24 mb-2 rounded" />
                                    <Skeleton className="h-4 w-64 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : followups.length === 0 ? (
                        <div className="text-center py-8">
                            <MessageCircle size={48} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm mb-2">
                                Nenhum follow-up encontrado para este lead.
                            </p>
                            <p className="text-slate-400 text-xs">
                                Crie o primeiro follow-up abaixo.
                            </p>
                        </div>
                    ) : (
                        <ol className="relative border-l-2 border-emerald-200 pl-4 space-y-6">
                            {followups.map((fu) => (
                                <FollowupTimelineItem
                                    key={fu._id}
                                    fu={fu}
                                    onResend={resendFollowup}
                                />
                            ))}
                        </ol>
                    )}

                    {/* COMPOSER DE NOVO FOLLOW-UP */}
                    {lead?._id && (
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <FollowupComposer
                                lead={lead}
                                onCreated={() => {
                                    fetchLeadFollowups(lead._id);
                                    onFollowupCreated();
                                }}
                            />
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TimelineModal;