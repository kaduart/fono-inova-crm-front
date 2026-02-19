// hooks/useAmandaControl.ts
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import API from '../../../../services/api';
import { logger } from '../../../../utils/logger';
import type { Contact } from '../types/chat.types';

export function useAmandaControl(contact: Contact | null) {
    const [manualActive, setManualActive] = useState<boolean>(!!contact?.manualActive);
    const [loading, setLoading] = useState(false);

    // Sincronizar com props
    const syncWithContact = useCallback((value: boolean) => {
        setManualActive(value);
    }, []);

    // Reativar Amanda
    const handleResumeAmanda = useCallback(async () => {
        const key = contact?.leadId;
        if (!key) {
            toast.error("Este contato não possui lead ativo");
            return;
        }

        try {
            setLoading(true);
            const { data } = await API.post(`/followups/amanda-resume/${key}`, {});

            if (data?.success) {
                toast.success(data.message || "Amanda reativada");
                setManualActive(false);
            } else {
                throw new Error(data?.message || "Erro ao reativar");
            }
        } catch (err: any) {
            logger.error("Erro ao reativar Amanda:", err);
            toast.error(err.message || "Erro ao reativar Amanda");
        } finally {
            setLoading(false);
        }
    }, [contact?.leadId]);

    // Pausar Amanda manualmente
    const handlePauseAmanda = useCallback(async () => {
        const key = contact?.leadId;
        if (!key) {
            toast.error("Este contato não possui lead ativo");
            return;
        }

        try {
            setLoading(true);
            const { data } = await API.post(`/whatsapp/amanda-pause/${key}`, {});

            if (data?.success) {
                toast.success(data.message || "Amanda pausada");
                setManualActive(true);
            } else {
                throw new Error(data?.message || "Erro ao pausar");
            }
        } catch (err: any) {
            logger.error("Erro ao pausar Amanda:", err);
            toast.error(err.message || "Erro ao pausar Amanda");
        } finally {
            setLoading(false);
        }
    }, [contact?.leadId]);

    // Cancelar follow-up
    const handleCancelFollowup = useCallback(async () => {
        const key = contact?.leadId;
        if (!key) {
            toast.error("Este contato não possui lead ativo");
            return;
        }

        if (!confirm("Tem certeza que deseja cancelar o follow-up deste lead?")) {
            return;
        }

        try {
            setLoading(true);
            const { data } = await API.post(`/followups/cancel-followup/${key}`, {});

            if (data?.success) {
                toast.success(data.message || "Follow-up cancelado");
            } else {
                throw new Error(data?.message || "Erro ao cancelar");
            }
        } catch (err: any) {
            logger.error("Erro ao cancelar follow-up:", err);
            toast.error(err.message || "Erro ao cancelar follow-up");
        } finally {
            setLoading(false);
        }
    }, [contact?.leadId]);

    return {
        manualActive,
        loading,
        syncWithContact,
        handleResumeAmanda,
        handlePauseAmanda,
        handleCancelFollowup,
    };
}
