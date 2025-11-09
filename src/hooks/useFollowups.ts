// hooks/useFollowup.ts
import { useCallback, useEffect, useState } from "react";
import { amandaService } from "../services/amandaService";
import { followupService } from "../services/followupService";

/**
 * Hook COMPLETO para gerenciar follow-ups de um lead
 * Inclui: listagem, criação, agendamento, reenvio, e integração com IA
 */
export const useFollowup = (leadId: string) => {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Carrega histórico automaticamente quando leadId muda
    useEffect(() => {
        if (leadId) {
            loadHistory();
        }
    }, [leadId]);

    /**
     * Carrega o histórico completo de follow-ups do lead
     */
    const loadHistory = useCallback(async () => {
        if (!leadId) return;

        setLoading(true);
        const result = await followupService.getHistory(leadId);
        if (result.success) {
            setHistory(result.data);
        }
        setLoading(false);
    }, [leadId]);

    /**
     * Envia um follow-up manual
     */
    const sendManual = useCallback(async (message: string, stage?: string) => {
        setLoading(true);
        const result = await followupService.create({
            lead: leadId,
            message,
            stage
        });

        if (result.success) {
            await loadHistory(); // Recarrega o histórico
        }

        setLoading(false);
        return result;
    }, [leadId, loadHistory]);

    /**
     * Gera e envia um follow-up usando IA (Amanda)
     */
    const sendWithAI = useCallback(async (
        context?: string,
        tone?: 'casual' | 'formal' | 'friendly'
    ) => {
        setLoading(true);

        const result = await followupService.createAIFollowup({
            leadId,
            context,
            tone: tone || 'friendly'
        });

        if (result.success) {
            await loadHistory(); // Recarrega o histórico
        }

        setLoading(false);
        return result;
    }, [leadId, loadHistory]);

    /**
     * Agenda um follow-up para data futura
     */
    const scheduleFollowup = useCallback(async (
        message: string,
        scheduledAt: string,
        aiOptimized: boolean = false
    ) => {
        setLoading(true);

        const result = await followupService.schedule({
            leadId,
            message,
            scheduledAt,
            aiOptimized
        });

        if (result.success) {
            await loadHistory(); // Recarrega o histórico
        }

        setLoading(false);
        return result;
    }, [leadId, loadHistory]);

    /**
     * Reenvia um follow-up que falhou
     */
    const resendFollowup = useCallback(async (followupId: string) => {
        setLoading(true);

        const result = await followupService.resend(followupId);

        if (result.success) {
            await loadHistory(); // Recarrega o histórico
        }

        setLoading(false);
        return result;
    }, [loadHistory]);

    /**
     * Gera uma mensagem com IA sem enviar (preview)
     */
    const generatePreview = useCallback(async (
        context?: string,
        tone?: 'casual' | 'formal' | 'friendly'
    ) => {
        setLoading(true);

        const result = await amandaService.generateFollowup({
            leadId,
            context,
            tone: tone || 'friendly'
        });

        setLoading(false);
        return result;
    }, [leadId]);

    return {
        // Estado
        loading,
        history,

        // Ações
        loadHistory,
        sendManual,
        sendWithAI,
        scheduleFollowup,
        resendFollowup,
        generatePreview
    };
};