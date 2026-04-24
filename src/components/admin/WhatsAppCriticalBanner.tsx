/**
 * 🚨 WhatsApp Critical Banner
 *
 * Banner fixo no topo quando o pipeline do WhatsApp está crítico.
 * Impossível ignorar. Mostra dados reais do backend.
 *
 * Regra de exibição:
 * - status === 'critical' → banner vermelho fixo
 * - pendingEvents > 0 → mostra contagem
 * - workersEnabled === false → mensagem específica
 */

import { useState } from 'react';
import { useSystemHealthCtx } from '../../contexts/SystemHealthContext';
import {
    Box, Alert, AlertTitle, Button, Collapse, Chip,
} from '@mui/material';
import {
    AlertTriangle, X, RefreshCw, MessageCircleOff, Clock,
} from 'lucide-react';

export default function WhatsAppCriticalBanner() {
    const { whatsappHealth, loadingWhatsapp, refresh } = useSystemHealthCtx();
    const [dismissed, setDismissed] = useState(false);

    if (loadingWhatsapp) return null;
    if (!whatsappHealth) return null;
    if (whatsappHealth.status === 'healthy') return null;
    if (dismissed) return null;

    const isCritical = whatsappHealth.status === 'critical';
    const isWarning = whatsappHealth.status === 'warning';
    const { checks } = whatsappHealth;

    // Usa critical count se disponível, senão warning count
    const pendingCount = checks.pendingEventsCritical ?? checks.pendingEventsWarning ?? 0;
    const hasPendingEvents = pendingCount > 0;
    const workersOff = !checks.workersEnabled;
    const redisDown = !checks.redisConnected;

    let title = isCritical ? '🚨 WhatsApp offline' : '⚠️ WhatsApp lento';
    let message = isCritical
        ? 'Mensagens de leads não estão sendo processadas.'
        : 'Mensagens de leads estão com atraso no processamento.';

    if (redisDown) {
        title = '🚨 Redis desconectado';
        message = 'O sistema não consegue acessar as filas de processamento.';
    } else if (workersOff && (checks.inboundCounts?.waiting || 0) > 5) {
        title = '🚨 Workers inativos';
        message = 'O crm-worker não está consumindo as filas. Mensagens estão acumulando.';
    } else if (hasPendingEvents) {
        title = isCritical
            ? `🚨 ${pendingCount} mensagens paradas`
            : `⚠️ ${pendingCount} mensagens atrasadas`;
        message = isCritical
            ? 'Mensagens de leads estão acumuladas há mais de 5 minutos sem processamento.'
            : 'Mensagens de leads estão acumuladas há 2-5 minutos.';
    }

    // Formata timestamp
    const lastUpdate = whatsappHealth.timestamp
        ? new Date(whatsappHealth.timestamp).toLocaleTimeString('pt-BR', { hour12: false })
        : '--:--:--';

    return (
        <Collapse in={!dismissed}>
            <Alert
                severity={isCritical ? 'error' : 'warning'}
                variant="filled"
                sx={{
                    borderRadius: 0,
                    position: 'sticky',
                    top: 0,
                    zIndex: 9999,
                    py: 1.5,
                    px: 2,
                    alignItems: 'center',
                    '& .MuiAlert-message': { width: '100%' },
                }}
                icon={<AlertTriangle size={22} />}
                action={
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button
                            size="small"
                            color="inherit"
                            variant="outlined"
                            startIcon={<RefreshCw size={14} />}
                            onClick={refresh}
                            sx={{ borderColor: 'rgba(255,255,255,0.5)', color: '#fff' }}
                        >
                            Atualizar
                        </Button>
                        <Button
                            size="small"
                            color="inherit"
                            onClick={() => setDismissed(true)}
                            sx={{ minWidth: 32, p: 0.5 }}
                        >
                            <X size={18} />
                        </Button>
                    </Box>
                }
            >
                <AlertTitle sx={{ fontWeight: 700, fontSize: '1rem', mb: 0.5 }}>
                    {title}
                </AlertTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <span>{message}</span>
                    {hasPendingEvents && (
                        <Chip
                            label={`${pendingCount} pendentes`}
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                            }}
                        />
                    )}
                    {workersOff && (
                        <Chip
                            icon={<MessageCircleOff size={14} />}
                            label="Workers OFF"
                            size="small"
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: '#fff',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                            }}
                        />
                    )}
                    <Chip
                        icon={<Clock size={12} />}
                        label={`Atualizado: ${lastUpdate}`}
                        size="small"
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.15)',
                            color: 'rgba(255,255,255,0.9)',
                            fontWeight: 500,
                            fontSize: '0.7rem',
                        }}
                    />
                </Box>
            </Alert>
        </Collapse>
    );
}
