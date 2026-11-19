/**
 * Envios incertos (WhatsApp/e-mail): o provedor pode ter aceitado a mensagem, mas a
 * resposta se perdeu. O sistema NÃO reenvia sozinho. Aqui o admin confere no aparelho
 * e registra a decisão:
 *   "Chegou"     → fecha o envio (nunca mais sai com essa chave);
 *   "Não chegou" → libera uma nova tentativa (quem enviou pode mandar de novo).
 * Nada é reenviado por esta tela. Só admin (o back recusa os demais com 403).
 *
 * Back: GET /observability/deliveries/uncertain · POST /observability/deliveries/resolve
 */
import { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
    DialogContent, DialogTitle, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, TextField, Typography,
} from '@mui/material';
import { RefreshCw } from 'lucide-react';
import API from '../../services/api';
import { toast } from '../../utils/toast';
import { notifyApiError } from '../../utils/notifyApiError';

export type UncertainDelivery = {
    key: string;
    kind: string;
    channel: string | null;
    status: 'unknown' | 'abandoned';
    attempts: number;
    createdAt: string | null;
    finishedAt: string | null;
    reason: string | null;
    lastError: string | null;
};

const KIND_LABELS: Record<string, string> = {
    'wa:manual:texto': 'WhatsApp manual (texto)',
    'wa:manual:tpl': 'WhatsApp manual (template)',
    'wa:manual:media': 'WhatsApp manual (mídia)',
    'wa:manual:vps': 'WhatsApp pelo VPS',
    'alert:admin': 'Alerta ao admin',
    'wa:send': 'WhatsApp automático (fila)',
    'wweb:send': 'WhatsApp Web (fila)',
    'email:convenio': 'E-mail de convênio',
};

export function kindLabel(kind: string): string {
    if (KIND_LABELS[kind]) return KIND_LABELS[kind];
    if (kind.startsWith('amanda')) return 'Amanda (resposta automática)';
    return kind;
}

export function reasonLabel(d: Pick<UncertainDelivery, 'status' | 'reason'>): string {
    if (d.status === 'abandoned' || d.reason === 'lease_expired') return 'Tentativa interrompida no meio (queda ou reinício)';
    if (d.reason === 'provider_result_unknown') return 'Provedor não respondeu a tempo';
    return 'Resultado desconhecido';
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

type Pending = { item: UncertainDelivery; as: 'sent' | 'failed' } | null;

export function UncertainDeliveriesPanel() {
    const [items, setItems] = useState<UncertainDelivery[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [pending, setPending] = useState<Pending>(null);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/observability/deliveries/uncertain?limit=100');
            setItems(res.data?.items || []);
            setTotal(res.data?.total || 0);
            setForbidden(false);
        } catch (err: any) {
            if (err?.response?.status === 403) setForbidden(true);
            else notifyApiError(err, 'Não foi possível carregar os envios incertos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const confirm = async () => {
        if (!pending) return;
        setSaving(true);
        try {
            await API.post('/observability/deliveries/resolve', { key: pending.item.key, as: pending.as, note: note.trim() || undefined });
            toast.success(pending.as === 'sent' ? 'Registrado: a mensagem chegou.' : 'Registrado: não chegou. Já pode enviar de novo.');
            setItems((prev) => prev.filter((i) => i.key !== pending.item.key));
            setTotal((t) => Math.max(0, t - 1));
            setPending(null);
            setNote('');
        } catch (err: any) {
            if (err?.response?.status === 409) {
                toast.info('Este envio já não está mais incerto. Atualizando a lista.');
                setPending(null);
                load();
            } else {
                notifyApiError(err, 'Não foi possível registrar a decisão');
            }
        } finally {
            setSaving(false);
        }
    };

    if (forbidden) {
        return <Alert severity="info">Só administradores veem e decidem os envios incertos.</Alert>;
    }

    return (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6">Envios incertos {total > 0 && <Chip size="small" color="warning" label={total} sx={{ ml: 1 }} />}</Typography>
                    <Button size="small" startIcon={<RefreshCw size={14} />} onClick={load} disabled={loading}>Atualizar</Button>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    O sistema não sabe se estas mensagens saíram e não reenvia sozinho. Confira a conversa no WhatsApp e registre o que viu. Nada é reenviado por aqui.
                </Typography>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
                ) : items.length === 0 ? (
                    <Alert severity="success">Nenhum envio incerto.</Alert>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Tipo</TableCell>
                                    <TableCell>Quando</TableCell>
                                    <TableCell>Motivo</TableCell>
                                    <TableCell align="right">Decisão</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((d) => (
                                    <TableRow key={d.key}>
                                        <TableCell>
                                            <Typography variant="body2">{kindLabel(d.kind)}</Typography>
                                            {d.attempts > 1 && <Typography variant="caption" color="text.secondary">{d.attempts} tentativas</Typography>}
                                        </TableCell>
                                        <TableCell>{fmt(d.createdAt)}</TableCell>
                                        <TableCell>
                                            <Typography variant="body2">{reasonLabel(d)}</Typography>
                                            {d.lastError && <Typography variant="caption" color="text.secondary">{d.lastError}</Typography>}
                                        </TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                            <Button size="small" color="success" onClick={() => setPending({ item: d, as: 'sent' })}>Chegou</Button>
                                            <Button size="small" color="warning" onClick={() => setPending({ item: d, as: 'failed' })}>Não chegou</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </CardContent>

            <Dialog open={!!pending} onClose={() => !saving && setPending(null)} fullWidth maxWidth="xs">
                <DialogTitle>{pending?.as === 'sent' ? 'Confirmar que chegou' : 'Confirmar que não chegou'}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        {pending?.as === 'sent'
                            ? 'O envio fica fechado e nunca mais sai com esta chave.'
                            : 'O envio fica liberado: quem mandou pode enviar de novo pela tela. Nada é reenviado agora.'}
                    </Typography>
                    <TextField label="Observação (opcional)" fullWidth size="small" value={note} onChange={(e) => setNote(e.target.value)} inputProps={{ maxLength: 200 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPending(null)} disabled={saving}>Cancelar</Button>
                    <Button variant="contained" onClick={confirm} disabled={saving}>{saving ? 'Salvando…' : 'Confirmar'}</Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
}

export default UncertainDeliveriesPanel;
