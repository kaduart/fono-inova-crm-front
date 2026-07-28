// src/pages/Financial/components/BillingCommunicationWizard/index.tsx
import { useEffect, useMemo, useState } from 'react';
import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputAdornment,
    LinearProgress,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { CheckCircle, X, AlertCircle, Send, Upload, FileText, Mail, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { PendingGuide } from '../../tabs/GuidePendingBillingSection';
import {
    createCommunication,
    setCommunicationPackage,
    sendCommunication,
    getCommunicationJobStatus,
    uploadPatientDocument
} from '../../../../services/communicationService';
import { getConvenio } from '../../../../services/insuranceService';
import { extractErrorMessage } from '../../../../utils/errorUtils';

interface BillingCommunicationWizardProps {
    open: boolean;
    selectedGuides: PendingGuide[];
    onClose: () => void;
    onAllSent: () => void;
}

interface DocSlot {
    type: string;
    label: string;
    required: boolean;
    documentId?: string;
    filename?: string;
}

interface PatientGroup {
    patientKey: string;
    patientName: string;
    insuranceProvider: string;
    guideIds: string[];
    slots: DocSlot[];
    sending: boolean;
    sendStatus: 'idle' | 'sending' | 'sent' | 'failed';
    sendError: string | null;
    communicationId?: string;
}

const DEFAULT_SLOT_TYPES = [
    { type: 'guide', label: 'Guia', required: true },
    { type: 'attendance_list', label: 'Lista de Presença', required: true },
    { type: 'invoice', label: 'Nota Fiscal', required: false },
    { type: 'report', label: 'Relatório', required: false },
    { type: 'other', label: 'Outro', required: false }
];

function getPatientKey(guide: PendingGuide): string {
    if (typeof guide.patient === 'string') return guide.patient;
    if ((guide.patient as any)?._id) return (guide.patient as any)._id;
    return guide.patient?.fullName || guide.guideId;
}

function getPatientName(guide: PendingGuide): string {
    return guide.patient?.fullName || 'Paciente';
}

function getInitials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function groupGuidesByPatient(guides: PendingGuide[]): PatientGroup[] {
    const map = new Map<string, PatientGroup>();
    for (const guide of guides) {
        const key = getPatientKey(guide);
        if (!map.has(key)) {
            map.set(key, {
                patientKey: key,
                patientName: getPatientName(guide),
                insuranceProvider: guide.insurance,
                guideIds: [],
                slots: DEFAULT_SLOT_TYPES.map(s => ({ ...s })),
                sending: false,
                sendStatus: 'idle',
                sendError: null
            });
        }
        const group = map.get(key)!;
        group.guideIds.push(guide.guideId);
    }
    return Array.from(map.values());
}

export function BillingCommunicationWizard({
    open,
    selectedGuides,
    onClose,
    onAllSent
}: BillingCommunicationWizardProps) {
    const [groups, setGroups] = useState<PatientGroup[]>([]);
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Documentação para Faturamento');
    const [message, setMessage] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState('');
    const [overallSending, setOverallSending] = useState(false);
    const [sentCount, setSentCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [uploadingSlot, setUploadingSlot] = useState<{ patientKey: string; type: string } | null>(null);
    const [convenioEmails, setConvenioEmails] = useState<{ label: string; email: string }[]>([]);

    useEffect(() => {
        if (!open || selectedGuides.length === 0) return;
        const grouped = groupGuidesByPatient(selectedGuides);
        setGroups(grouped);
        setTo('');
        setConvenioEmails([]);
        setInvoiceNumber('');
        setInvoiceDate('');

        // Tenta montar assunto e corpo padrão com base na primeira guia/paciente
        const firstGuide = selectedGuides[0];
        const patientName = firstGuide.patient?.fullName || 'Paciente';
        const guideNumber = firstGuide.number || '';
        const insurance = firstGuide.insurance || 'Convênio';

        setSubject(`Documentação para Faturamento - ${patientName}${guideNumber ? ` - Guia ${guideNumber}` : ''}`);
        setMessage(
            `Prezados,\n\n` +
            `Segue em anexo a documentação para faturamento do paciente ${patientName}.` +
            `${guideNumber ? `\nGuia: ${guideNumber}.` : ''}` +
            `\n\n` +
            `Atenciosamente,\n` +
            `Fono Inova`
        );

        setSentCount(0);
        setFailedCount(0);

        // Todas as guias selecionadas pertencem ao mesmo convênio (InsuranceTab bloqueia
        // seleção mista), então buscamos os e-mails cadastrados no perfil desse convênio
        // pra sugerir como destinatário em vez de exigir digitação manual.
        getConvenio(insurance)
            .then(convenio => {
                const emails: { label: string; email: string }[] = [];
                const billingEmail = convenio.guidePolicy?.billingEmail?.trim();
                const priorAuthEmail = convenio.guidePolicy?.priorAuthEmail?.trim();
                if (billingEmail) emails.push({ label: 'Faturamento', email: billingEmail });
                if (priorAuthEmail && priorAuthEmail !== billingEmail) {
                    emails.push({ label: 'Autorização prévia', email: priorAuthEmail });
                }
                setConvenioEmails(emails);
                if (billingEmail) setTo(billingEmail);
            })
            .catch(() => {
                // Sem e-mail cadastrado no convênio: mantém o campo manual, sem bloquear o fluxo
            });
    }, [open, selectedGuides]);

    useEffect(() => {
        if (!open) {
            setGroups([]);
            setConvenioEmails([]);
        }
    }, [open]);

    const allSent = useMemo(() => groups.every(g => g.sendStatus === 'sent' || g.sendStatus === 'failed'), [groups]);
    const allSuccessful = useMemo(() => groups.every(g => g.sendStatus === 'sent'), [groups]);
    const hasFailures = useMemo(() => groups.some(g => g.sendStatus === 'failed'), [groups]);
    const hasAnyDoc = useMemo(() => groups.some(g => g.slots.some(s => s.documentId)), [groups]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, patientKey: string, type: string) => {
        const group = groups.find(g => g.patientKey === patientKey);
        if (!group || !e.target.files?.[0]) return;

        const file = e.target.files[0];

        // PDF é bem mais leve que imagem de print/foto e evita o problema de upload
        // lento (achado em produção 2026-07-27). O paste de print (Ctrl+V) continua
        // aceitando imagem, porque não existe como colar print já em PDF.
        if (file.type !== 'application/pdf') {
            toast.warn('Envie o documento em PDF (mais leve e rápido). Use "Colar print" se só tiver a imagem.');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', patientKey);
        formData.append('type', type);

        setUploadingSlot({ patientKey, type });
        try {
            const res = await uploadPatientDocument(formData);
            const doc = res.data.data;
            setGroups(prev => prev.map(g => {
                if (g.patientKey !== patientKey) return g;
                return {
                    ...g,
                    slots: g.slots.map(s => s.type === type ? {
                        ...s,
                        documentId: doc._id,
                        filename: doc.originalName || doc.name
                    } : s)
                };
            }));
            toast.success(`${group.patientName}: ${file.name} anexado`);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao anexar arquivo'));
        } finally {
            setUploadingSlot(null);
        }
    };

    const removeDoc = (patientKey: string, type: string) => {
        setGroups(prev => prev.map(g => {
            if (g.patientKey !== patientKey) return g;
            return {
                ...g,
                slots: g.slots.map(s => s.type === type ? { ...s, documentId: undefined, filename: undefined } : s)
            };
        }));
    };

    // Envia (ou reenvia) um único grupo. Se o grupo já tem communicationId (retry de uma
    // falha anterior), reaproveita a comunicação e o pacote já criados — só dispara o
    // envio de novo, sem recriar tudo do zero nem exigir que o usuário digite os dados
    // de novo (achado em produção 2026-07-28: reabrir o wizard perdia nome/anexos/NF).
    const sendGroup = async (group: PatientGroup) => {
        const documentIds = group.slots.map(s => s.documentId).filter(Boolean) as string[];

        setGroups(prev => prev.map(g => g.patientKey === group.patientKey ? { ...g, sending: true, sendStatus: 'sending', sendError: null } : g));

        try {
            let communicationId = group.communicationId;

            if (!communicationId) {
                const createRes = await createCommunication({
                    patientId: group.patientKey,
                    insuranceProvider: group.insuranceProvider,
                    guideId: group.guideIds[0],
                    purpose: 'billing',
                    notes: `Envio de faturamento para ${group.patientName}`,
                    invoiceNumber: invoiceNumber || undefined,
                    invoiceDate: invoiceDate || undefined
                });
                communicationId = createRes.data.data._id;
                await setCommunicationPackage(communicationId, documentIds);
            }

            const sendRes = await sendCommunication(communicationId, {
                to: to.trim(),
                subject: subject.trim() || 'Documentação para Faturamento',
                message: message.trim()
            });

            const jobId = sendRes.data.data.jobId;

            await new Promise<void>((resolve, reject) => {
                let attempts = 0;
                const maxAttempts = 30;
                const elapsedLimitMs = 30000;
                const startedAt = Date.now();

                const poll = async () => {
                    attempts++;
                    try {
                        const statusRes = await getCommunicationJobStatus(communicationId!, jobId);
                        const state = statusRes.data.data.state;

                        if (state === 'completed') {
                            resolve();
                            return;
                        }
                        if (state === 'failed') {
                            reject(new Error(statusRes.data.data.failedReason || 'Falha no envio'));
                            return;
                        }
                        if (attempts >= maxAttempts || Date.now() - startedAt >= elapsedLimitMs) {
                            // Timeout de polling NUNCA pode virar sucesso — o job pode estar
                            // travado (ex.: fila sem worker consumindo) e isso precisa aparecer
                            // como falha visível, não como "Enviado" (achado em produção 2026-07-27).
                            reject(new Error('Envio ainda em processamento após 30s — verifique o histórico antes de tentar novamente'));
                            return;
                        }

                        // Job ainda na fila: consulta a cada 1s. Já em processamento (worker pegou
                        // o job): consulta a cada 500ms — fecha o modal mais rápido assim que
                        // completar, sem aumentar muito a carga de polling.
                        const nextDelay = state === 'active' ? 500 : 1000;
                        setTimeout(poll, nextDelay);
                    } catch (pollError) {
                        reject(pollError);
                    }
                };

                setTimeout(poll, 1000);
            });

            setGroups(prev => prev.map(g => g.patientKey === group.patientKey ? {
                ...g,
                sending: false,
                sendStatus: 'sent',
                sendError: null,
                communicationId
            } : g));
            setSentCount(prev => prev + 1);
        } catch (err) {
            setGroups(prev => prev.map(g => g.patientKey === group.patientKey ? {
                ...g,
                sending: false,
                sendStatus: 'failed',
                sendError: extractErrorMessage(err, 'Erro ao enviar')
            } : g));
            setFailedCount(prev => prev + 1);
        }
    };

    const handleSendAll = async () => {
        if (!to.trim()) {
            toast.warn('Informe o e-mail do destinatário');
            return;
        }
        if (!hasAnyDoc) {
            toast.warn('Anexe pelo menos um documento');
            return;
        }
        if (!invoiceNumber.trim()) {
            toast.warn('Informe o número da Nota Fiscal');
            return;
        }
        if (!invoiceDate.trim()) {
            toast.warn('Informe a data da Nota Fiscal');
            return;
        }

        setOverallSending(true);
        setSentCount(0);
        setFailedCount(0);

        for (const group of groups) {
            const documentIds = group.slots.map(s => s.documentId).filter(Boolean) as string[];
            if (group.sendStatus !== 'idle' || documentIds.length === 0) continue;
            await sendGroup(group);
        }

        setOverallSending(false);
    };

    // Tenta de novo só o grupo que falhou, sem fechar o wizard nem pedir pra redigitar
    // nada — reaproveita o communicationId/pacote já criados na tentativa anterior.
    const handleRetry = async (patientKey: string) => {
        const group = groups.find(g => g.patientKey === patientKey);
        if (!group || overallSending) return;

        setOverallSending(true);
        setFailedCount(prev => Math.max(0, prev - 1));
        await sendGroup(group);
        setOverallSending(false);
    };

    const handleFinish = () => {
        if (!allSent) return;
        onClose();
        if (allSuccessful) onAllSent();
    };

    // Ponto único de saída do wizard (X, backdrop/Esc, botão Cancelar/Fechar).
    // Se os e-mails já saíram com sucesso, sair "sem querer" não pode pular o
    // próximo passo (abrir o lote de faturamento) — foi exatamente isso que
    // aconteceu no teste do dia 18/07 (guia 16007195: comunicação marcada como
    // "sent", mas nenhum lote criado porque o fechamento pelo X ignorava onAllSent).
    const handleDialogClose = () => {
        if (allSent && allSuccessful) {
            onClose();
            onAllSent();
        } else {
            onClose();
        }
    };

    // Fecha sozinho quando todos os e-mails saíram com sucesso — sem falha, não faz
    // sentido exigir um segundo clique em "Concluir e Faturar" pra confirmar algo que
    // já está confirmado. Com falha, mantém manual (usuário decide "continuar com
    // sucessos" ou corrigir e tentar de novo).
    useEffect(() => {
        if (open && groups.length > 0 && allSent && allSuccessful && !overallSending) {
            const timer = setTimeout(() => {
                onClose();
                onAllSent();
            }, 900);
            return () => clearTimeout(timer);
        }
    }, [open, groups, allSent, allSuccessful, overallSending]);

    if (!open) return null;

    return (
        <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                            color: '#fff'
                        }}>
                            <Send size={20} />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
                                Enviar Documentos para Faturamento
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {groups.length} paciente{groups.length !== 1 ? 's' : ''} selecionado{groups.length !== 1 ? 's' : ''}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleDialogClose} disabled={overallSending} size="small">
                        <X size={18} />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Box sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.25,
                    bgcolor: '#EEF2FF', border: '1px solid #E0E7FF', borderRadius: 2,
                    p: 1.5, mb: 2.5
                }}>
                    <Mail size={16} style={{ color: '#4F46E5', marginTop: 2, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: '#3730A3' }}>
                        O convênio receberá um e-mail individual para cada paciente selecionado, com os documentos anexados.
                    </Typography>
                </Box>

                <Box sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.25,
                    bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2,
                    p: 1.5, mb: 2.5
                }}>
                    <AlertCircle size={16} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ color: '#92400E' }}>
                        <strong>Importante:</strong> enviar documentos <strong>não realiza o faturamento</strong> e <strong>não encerra a guia</strong>.
                        Após o envio, será possível criar o lote de faturamento ou finalizar a guia separadamente.
                    </Typography>
                </Box>

                <Stack spacing={2} sx={{ mb: 3 }}>
                    <Box>
                        <TextField
                            fullWidth
                            label="Destinatário (convênio) *"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            size="small"
                            placeholder="email@convenio.com.br"
                            disabled={overallSending}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Mail size={16} style={{ color: '#9CA3AF' }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        {convenioEmails.length > 0 && (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.75, rowGap: 0.75 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mr: 0.25 }}>
                                    Cadastrados:
                                </Typography>
                                {convenioEmails.map(({ label, email }) => (
                                    <Chip
                                        key={email}
                                        size="small"
                                        clickable
                                        variant={to.trim() === email ? 'filled' : 'outlined'}
                                        color={to.trim() === email ? 'primary' : 'default'}
                                        label={`${label}: ${email}`}
                                        onClick={() => setTo(email)}
                                        disabled={overallSending}
                                        sx={{ fontWeight: 600 }}
                                    />
                                ))}
                            </Stack>
                        )}
                    </Box>
                    <TextField
                        fullWidth
                        label="Assunto"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        size="small"
                        disabled={overallSending}
                    />
                    <TextField
                        fullWidth
                        label="Corpo do e-mail"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        multiline
                        rows={4}
                        size="small"
                        disabled={overallSending}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Nota Fiscal *"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            size="small"
                            disabled={overallSending}
                            placeholder="Ex: 000456"
                            required
                            sx={{ flex: 3 }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <FileText size={16} style={{ color: '#9CA3AF' }} />
                                    </InputAdornment>
                                )
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Data da Nota Fiscal *"
                            type="date"
                            value={invoiceDate}
                            onChange={(e) => setInvoiceDate(e.target.value)}
                            size="small"
                            disabled={overallSending}
                            InputLabelProps={{ shrink: true }}
                            required
                            sx={{ flex: 2 }}
                        />
                    </Box>
                </Stack>

                <Divider sx={{ mb: 2.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Documentos por paciente
                    </Typography>
                </Divider>

                {groups.map(group => (
                    <Card
                        key={group.patientKey}
                        variant="outlined"
                        sx={{
                            mb: 2,
                            borderRadius: 3,
                            borderColor: group.sendStatus === 'sent' ? '#BBF7D0' : group.sendStatus === 'failed' ? '#FECACA' : '#E5E7EB',
                            transition: 'border-color 0.2s'
                        }}
                    >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                    <Avatar sx={{ width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5' }}>
                                        {getInitials(group.patientName)}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography fontWeight={700} fontSize="0.95rem" lineHeight={1.3} noWrap>
                                            {group.patientName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {group.guideIds.length} guia(s)
                                        </Typography>
                                    </Box>
                                </Box>
                                {group.sendStatus === 'sent' && (
                                    <Chip size="small" icon={<CheckCircle size={14} />} label="Enviado" color="success" sx={{ fontWeight: 600, flexShrink: 0 }} />
                                )}
                                {group.sendStatus === 'failed' && (
                                    <Chip size="small" icon={<AlertCircle size={14} />} label="Falha" color="error" sx={{ fontWeight: 600, flexShrink: 0 }} />
                                )}
                                {group.sendStatus === 'sending' && (
                                    <Chip size="small" icon={<CircularProgress size={12} />} label="Enviando" color="warning" sx={{ fontWeight: 600, flexShrink: 0 }} />
                                )}
                            </Box>

                            {group.sendError && (
                                <Box sx={{ bgcolor: '#FEF2F2', border: '1px solid #FECACA', p: 1.5, borderRadius: 2, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                    <Typography color="error" fontSize="0.85rem">{group.sendError}</Typography>
                                    <Button
                                        size="small"
                                        onClick={() => handleRetry(group.patientKey)}
                                        disabled={overallSending}
                                        sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
                                    >
                                        Tentar novamente
                                    </Button>
                                </Box>
                            )}

                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                                {group.slots.map(slot => {
                                    const isUploading = uploadingSlot?.patientKey === group.patientKey && uploadingSlot?.type === slot.type;
                                    const needsAttention = slot.required && !slot.documentId;
                                    return (
                                        <Box
                                            key={slot.type}
                                            sx={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
                                                p: 1.25, borderRadius: 2,
                                                bgcolor: needsAttention ? '#FFFBEB' : '#F8FAFC',
                                                border: '1px solid',
                                                borderColor: needsAttention ? '#FDE68A' : '#F1F5F9'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
                                                {slot.filename && (
                                                    <Box sx={{
                                                        width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                                                        bgcolor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        <FileText size={14} style={{ color: '#4F46E5' }} />
                                                    </Box>
                                                )}
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography fontSize="0.85rem" fontWeight={600}>
                                                        {slot.label}
                                                        {slot.required ? (
                                                            <Box component="span" sx={{ color: '#DC2626', ml: 0.5 }}>*</Box>
                                                        ) : (
                                                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400, fontSize: '0.75rem', ml: 0.5 }}>
                                                                (opcional)
                                                            </Box>
                                                        )}
                                                    </Typography>
                                                    {slot.filename && (
                                                        <Typography fontSize="0.78rem" color="text.secondary" noWrap>
                                                            {slot.filename}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Box sx={{ flexShrink: 0 }}>
                                                {slot.documentId ? (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => removeDoc(group.patientKey, slot.type)}
                                                        disabled={overallSending || group.sendStatus !== 'idle'}
                                                        title="Remover documento"
                                                        sx={{ color: '#9CA3AF', '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' } }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </IconButton>
                                                ) : (
                                                    <>
                                                        <input
                                                            type="file"
                                                            accept="application/pdf"
                                                            id={`file-${group.patientKey}-${slot.type}`}
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(e, group.patientKey, slot.type)}
                                                        />
                                                        <Button
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={isUploading ? <CircularProgress size={14} /> : <Upload size={16} />}
                                                            onClick={() => document.getElementById(`file-${group.patientKey}-${slot.type}`)?.click()}
                                                            disabled={isUploading || overallSending}
                                                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                                        >
                                                            {isUploading ? 'Anexando...' : 'Anexar'}
                                                        </Button>
                                                    </>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </CardContent>
                    </Card>
                ))}

                {overallSending && (
                    <Box sx={{ mt: 1 }}>
                        <LinearProgress
                            sx={{
                                height: 6, borderRadius: 3, bgcolor: '#E0E7FF',
                                '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#4F46E5' }
                            }}
                        />
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                            Enviando...{' '}
                            <Box component="strong" sx={{ color: '#16A34A' }}>{sentCount} enviados</Box>
                            {failedCount > 0 && (
                                <>, <Box component="strong" sx={{ color: '#DC2626' }}>{failedCount} falhas</Box></>
                            )}
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2.5, gap: 1, borderTop: '1px solid #F1F5F9' }}>
                <Button onClick={handleDialogClose} disabled={overallSending} variant="outlined" sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}>
                    {allSent ? 'Fechar' : 'Cancelar'}
                </Button>
                {allSent ? (
                    <Button
                        onClick={handleFinish}
                        variant="contained"
                        color={hasFailures ? 'warning' : 'primary'}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                        {hasFailures ? 'Continuar com sucessos' : 'Concluir e Faturar'}
                    </Button>
                ) : (
                    <Button
                        onClick={handleSendAll}
                        disabled={!to.trim() || overallSending || !hasAnyDoc || !invoiceNumber.trim() || !invoiceDate.trim()}
                        variant="contained"
                        startIcon={overallSending ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                        sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                    >
                        {overallSending ? 'Enviando...' : `Enviar ${groups.length} e-mail(s)`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default BillingCommunicationWizard;
