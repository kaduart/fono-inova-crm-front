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
    FormControlLabel,
    IconButton,
    InputAdornment,
    LinearProgress,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import { AlertCircle, CheckCircle, FileText, Mail, Send, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    createCommunication,
    getCommunication,
    getCommunicationJobStatus,
    sendCommunication,
    setCommunicationPackage,
    uploadPatientDocument
} from '../../../../services/communicationService';
import {
    BillingAllocationInput,
    BillingSubmission,
    BillingSubmissionAllocation,
    BillingSubmissionSession,
    finalizeBillingSubmission,
    getBillingSubmission,
    updateBillingSubmission
} from '../../../../services/billingSubmissionService';
import { getConvenio } from '../../../../services/insuranceService';
import { extractErrorMessage } from '../../../../utils/errorUtils';

interface BillingCommunicationWizardProps {
    open: boolean;
    submissionId: string | null;
    onClose: () => void;
    onChanged: () => void;
}

interface DocSlot {
    type: string;
    label: string;
    required: boolean;
    documentId?: string;
    filename?: string;
}

type AllocationMode = 'grouped' | 'per_guide';

const DEFAULT_SLOTS: DocSlot[] = [
    { type: 'guide', label: 'Guia', required: true },
    { type: 'attendance_list', label: 'Lista de Presença', required: true },
    { type: 'report', label: 'Relatório', required: false },
    { type: 'other', label: 'Outro', required: false }
];

function idOf(value: unknown): string {
    if (typeof value === 'string') return value;
    return String((value as { _id?: string } | null)?._id || '');
}

function patientName(submission: BillingSubmission | null): string {
    if (!submission || typeof submission.patientId === 'string') return 'Paciente';
    return submission.patientId.fullName || 'Paciente';
}

function initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function provider(submission: BillingSubmission | null) {
    if (!submission || typeof submission.insuranceProviderId === 'string') {
        return { id: '', code: '', name: 'Convênio' };
    }
    return {
        id: submission.insuranceProviderId._id,
        code: submission.insuranceProviderId.code,
        name: submission.insuranceProviderId.name
    };
}

function populatedSessions(submission: BillingSubmission | null): BillingSubmissionSession[] {
    return (submission?.sessionIds || []).filter((session): session is BillingSubmissionSession => typeof session !== 'string');
}

function allocationInput(allocation: BillingSubmissionAllocation): BillingAllocationInput {
    const documentId = allocation.invoice?.documentId;
    return {
        _id: allocation._id,
        sessionIds: allocation.sessionIds.map(idOf),
        invoice: allocation.invoice ? {
            invoiceNumber: allocation.invoice.invoiceNumber || null,
            invoiceDate: allocation.invoice.invoiceDate || null,
            documentId: typeof documentId === 'string' ? documentId : documentId?._id || null
        } : null
    };
}

function sameIds(left: string[], right: string[]) {
    if (left.length !== right.length) return false;
    const expected = new Set(left);
    return right.every(id => expected.has(id));
}

function inferMode(submission: BillingSubmission): AllocationMode {
    return submission.billingAllocations.length === 1
        && sameIds(submission.billingAllocations[0].sessionIds.map(idOf), submission.sessionIds.map(idOf))
        ? 'grouped'
        : 'per_guide';
}

function allocationTitle(allocation: BillingSubmissionAllocation, sessions: BillingSubmissionSession[], index: number) {
    const selected = new Set(allocation.sessionIds.map(idOf));
    const guides = [...new Set(sessions
        .filter(session => selected.has(session._id))
        .map(session => session.insuranceGuide?.number)
        .filter(Boolean))];
    return guides.length ? `NF ${index + 1} · guia${guides.length > 1 ? 's' : ''} ${guides.join(', ')}` : `NF ${index + 1}`;
}

export function BillingCommunicationWizard({
    open,
    submissionId,
    onClose,
    onChanged
}: BillingCommunicationWizardProps) {
    const [submission, setSubmission] = useState<BillingSubmission | null>(null);
    const [allocations, setAllocations] = useState<BillingSubmissionAllocation[]>([]);
    const [mode, setMode] = useState<AllocationMode>('grouped');
    const [slots, setSlots] = useState<DocSlot[]>(DEFAULT_SLOTS.map(slot => ({ ...slot })));
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Documentação para Faturamento');
    const [message, setMessage] = useState('');
    const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'external'>('email');
    const [externalReason, setExternalReason] = useState('');
    const [communicationId, setCommunicationId] = useState<string | null>(null);
    const [documentsAlreadySent, setDocumentsAlreadySent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);

    const sessions = useMemo(() => populatedSessions(submission), [submission]);
    const providerInfo = provider(submission);
    const isEditable = submission?.status === 'draft';
    const packageDocumentsFor = (source: BillingSubmissionAllocation[]) => [...new Set([
        ...slots.map(slot => slot.documentId).filter(Boolean) as string[],
        ...source
            .map(allocation => allocation.invoice?.documentId)
            .filter(Boolean)
            .map(document => typeof document === 'string' ? document : document!._id)
    ])];

    useEffect(() => {
        if (!open || !submissionId) return;
        let active = true;
        setLoading(true);
        setSlots(DEFAULT_SLOTS.map(slot => ({ ...slot })));
        getBillingSubmission(submissionId)
            .then(async response => {
                if (!active) return;
                const detail = response.data.data;
                const current = detail.submission;
                setSubmission(current);
                setAllocations(current.billingAllocations);
                setMode(inferMode(current));
                const latestCommunication = detail.communications.at(-1);
                setCommunicationId(latestCommunication?._id || null);
                setDocumentsAlreadySent(Boolean(latestCommunication && (
                    ['sent', 'approved'].includes(latestCommunication.status)
                    || ['sent', 'resent'].includes(latestCommunication.packageStatus || '')
                    || latestCommunication.lastEmailStatus === 'success'
                )));

                if (latestCommunication?._id) {
                    try {
                        const communicationResponse = await getCommunication(latestCommunication._id);
                        if (active) {
                            const attachments = communicationResponse.data.data.package?.attachments || [];
                            setSlots(DEFAULT_SLOTS.map(slot => {
                                const attachment = attachments.find(item => item.type === slot.type);
                                if (!attachment) return { ...slot };
                                return {
                                    ...slot,
                                    documentId: idOf(attachment.documentId),
                                    filename: attachment.filename
                                };
                            }));
                        }
                    } catch {
                        // A NF continua canônica no submission. Falha ao recuperar um
                        // pacote anterior não deve impedir a edição do rascunho.
                    }
                }
                const name = patientName(current);
                const payer = provider(current);
                setSubject(`Documentação para Faturamento - ${name} - ${current.billingCompetence}`);
                setMessage(`Prezados,\n\nSegue a documentação de faturamento de ${name}, competência ${current.billingCompetence}.\n\nAtenciosamente,\nFono Inova`);
                try {
                    const convenio = await getConvenio(payer.code);
                    if (active) setTo(convenio.guidePolicy?.billingEmail?.trim() || '');
                } catch {
                    if (active) setTo('');
                }
            })
            .catch(error => toast.error(extractErrorMessage(error, 'Erro ao carregar o envio de faturamento')))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [open, submissionId]);

    useEffect(() => {
        if (!open) {
            setSubmission(null);
            setAllocations([]);
            setSlots(DEFAULT_SLOTS.map(slot => ({ ...slot })));
            setCommunicationId(null);
            setDocumentsAlreadySent(false);
        }
    }, [open]);

    const persistAllocations = async (nextAllocations = allocations) => {
        if (!submission || submission.status !== 'draft') return submission;
        setSaving(true);
        try {
            const response = await updateBillingSubmission(submission._id, {
                billingAllocations: nextAllocations.map(allocationInput),
                expectedVersion: submission.__v
            });
            const updated = response.data.data;
            const merged: BillingSubmission = {
                ...updated,
                patientId: submission.patientId,
                insuranceProviderId: submission.insuranceProviderId,
                sessionIds: submission.sessionIds
            };
            setSubmission(merged);
            setAllocations(updated.billingAllocations);
            return merged;
        } finally {
            setSaving(false);
        }
    };

    const handleModeChange = async (nextMode: AllocationMode) => {
        if (!submission || !isEditable || nextMode === mode) return;
        const allSessionIds = submission.sessionIds.map(idOf);
        let next: BillingSubmissionAllocation[];
        if (nextMode === 'grouped') {
            next = [{
                _id: allocations.length === 1 ? allocations[0]._id : '',
                sessionIds: allSessionIds,
                invoice: allocations.length === 1 ? allocations[0].invoice : null
            }];
        } else {
            const byGuide = new Map<string, string[]>();
            for (const session of sessions) {
                const key = session.insuranceGuide?._id || `without-guide-${session._id}`;
                if (!byGuide.has(key)) byGuide.set(key, []);
                byGuide.get(key)!.push(session._id);
            }
            next = [...byGuide.values()].map(ids => {
                const existing = allocations.find(allocation => sameIds(allocation.sessionIds.map(idOf), ids));
                return existing || { _id: '', sessionIds: ids, invoice: null };
            });
        }
        setMode(nextMode);
        setAllocations(next);
        try {
            await persistAllocations(next);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao salvar o agrupamento'));
        }
    };

    const updateInvoice = (allocationId: string, field: 'invoiceNumber' | 'invoiceDate', value: string) => {
        setAllocations(current => current.map(allocation => allocation._id === allocationId ? {
            ...allocation,
            invoice: {
                invoiceNumber: allocation.invoice?.invoiceNumber || null,
                invoiceDate: allocation.invoice?.invoiceDate || null,
                documentId: allocation.invoice?.documentId || null,
                [field]: value || null
            }
        } : allocation));
    };

    const uploadDocument = async (file: File, type: string, allocationId?: string) => {
        if (!submission) return;
        if (file.type !== 'application/pdf') {
            toast.warn('Envie o documento em PDF');
            return;
        }
        const patientId = idOf(submission.patientId);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', patientId);
        formData.append('type', type);
        const key = allocationId || type;
        setUploadingKey(key);
        try {
            const response = await uploadPatientDocument(formData);
            const document = response.data.data;
            if (allocationId) {
                const next = allocations.map(allocation => allocation._id === allocationId ? {
                    ...allocation,
                    invoice: {
                        invoiceNumber: allocation.invoice?.invoiceNumber || null,
                        invoiceDate: allocation.invoice?.invoiceDate || null,
                        documentId: document._id
                    }
                } : allocation);
                setAllocations(next);
                await persistAllocations(next);
            } else {
                setSlots(current => current.map(slot => slot.type === type
                    ? { ...slot, documentId: document._id, filename: document.originalName || document.name }
                    : slot));
            }
            toast.success(`${file.name} anexado`);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao anexar documento'));
        } finally {
            setUploadingKey(null);
        }
    };

    const waitForJob = (currentCommunicationId: string, jobId: string) => new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const startedAt = Date.now();
        const poll = async () => {
            attempts += 1;
            try {
                const response = await getCommunicationJobStatus(currentCommunicationId, jobId);
                const state = response.data.data.state;
                if (state === 'completed') return resolve();
                if (state === 'failed') return reject(new Error(response.data.data.failedReason || 'Falha no envio'));
                if (attempts >= 30 || Date.now() - startedAt >= 30000) {
                    return reject(new Error('Envio ainda em processamento após 30s; consulte o histórico'));
                }
                setTimeout(poll, state === 'active' ? 500 : 1000);
            } catch (error) {
                reject(error);
            }
        };
        setTimeout(poll, 700);
    });

    const sendDocuments = async ({
        skipPersist = false,
        submissionOverride
    }: { skipPersist?: boolean; submissionOverride?: BillingSubmission } = {}) => {
        const currentSubmission = submissionOverride || submission;
        if (!currentSubmission) throw new Error('Submission não carregado');
        const saved = skipPersist ? currentSubmission : await persistAllocations();
        if (!saved) throw new Error('Submission não carregado');
        const effectiveAllocations = saved.billingAllocations;
        const packageDocumentIds = packageDocumentsFor(effectiveAllocations);
        if (deliveryMethod === 'email' && !to.trim()) throw new Error('Informe o e-mail do destinatário');
        if (deliveryMethod === 'email' && packageDocumentIds.length === 0) throw new Error('Anexe pelo menos um documento');
        if (deliveryMethod === 'external' && !externalReason.trim()) throw new Error('Informe o motivo do envio externo');

        setSending(true);
        try {
            let currentCommunicationId = communicationId;
            if (!currentCommunicationId) {
                const response = await createCommunication({
                    patientId: idOf(currentSubmission.patientId),
                    insuranceProvider: providerInfo.code,
                    purpose: 'billing',
                    billingSubmissionId: currentSubmission._id,
                    billingAllocationIds: effectiveAllocations.map(allocation => allocation._id),
                    notes: `Envio da competência ${currentSubmission.billingCompetence}`
                });
                currentCommunicationId = response.data.data._id;
                setCommunicationId(currentCommunicationId);
            }
            // O pacote é um snapshot por tentativa. Atualiza também em reenvios
            // para incluir documentos adicionados depois da primeira comunicação.
            await setCommunicationPackage(currentCommunicationId, packageDocumentIds);

            const response = await sendCommunication(currentCommunicationId, {
                to: deliveryMethod === 'email' ? to.trim() : undefined,
                subject: subject.trim(),
                message: message.trim(),
                deliveryMethod,
                reason: deliveryMethod === 'external' ? externalReason.trim() : undefined
            });
            const jobId = response.data.data.jobId;
            if (response.data.data.status !== 'sent' && jobId) await waitForJob(currentCommunicationId, jobId);
            setDocumentsAlreadySent(true);
            toast.success('Documentos enviados. Nenhum estado financeiro foi alterado.');
            onChanged();
        } finally {
            setSending(false);
        }
    };

    const finalize = async (): Promise<BillingSubmission> => {
        if (!submission) throw new Error('Submission não carregado');
        setFinalizing(true);
        try {
            await persistAllocations();
            const response = await finalizeBillingSubmission(submission._id);
            const finalizedSubmission = response.data.data.submission;
            setSubmission(finalizedSubmission);
            setAllocations(finalizedSubmission.billingAllocations);
            toast.success('Faturamento concluído e lotes criados');
            onChanged();
            return finalizedSubmission;
        } finally {
            setFinalizing(false);
        }
    };

    const runAction = async (action: 'send' | 'finalize' | 'finalize_send') => {
        try {
            if (action === 'send') {
                await sendDocuments();
            } else if (action === 'finalize') {
                await finalize();
            } else {
                const finalizedSubmission = await finalize();
                try {
                    await sendDocuments({ skipPersist: true, submissionOverride: finalizedSubmission });
                } catch (sendError) {
                    toast.error(`Faturamento concluído, mas o envio falhou: ${extractErrorMessage(sendError, 'erro no envio')}`);
                }
            }
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Não foi possível concluir a operação'));
        }
    };

    const busy = loading || saving || sending || finalizing;

    const handleClose = async () => {
        if (busy) return;
        if (submission?.status === 'draft') {
            try {
                await persistAllocations();
            } catch (error) {
                toast.error(extractErrorMessage(error, 'Não foi possível salvar o rascunho'));
                return;
            }
        }
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
        >
            <DialogTitle sx={{ pb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: '#fff'
                        }}>
                            <Send size={20} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
                                    Preparar faturamento
                                </Typography>
                                {submission && (
                                    <Chip
                                        size="small"
                                        color={submission.status === 'draft' ? 'warning' : 'success'}
                                        label={submission.status === 'draft' ? 'Rascunho' : 'Faturado'}
                                        sx={{ height: 22, fontWeight: 700 }}
                                    />
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" noWrap>
                                {patientName(submission)} · {providerInfo.name} · competência {submission?.billingCompetence || '—'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton onClick={handleClose} disabled={busy} size="small"><X size={18} /></IconButton>
                </Box>
            </DialogTitle>

            {busy && <LinearProgress />}

            <DialogContent dividers>
                {loading || !submission ? (
                    <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
                ) : (
                    <Stack spacing={2.5}>
                        <Box sx={{
                            display: 'flex', alignItems: 'flex-start', gap: 1.25,
                            bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 2, p: 1.5
                        }}>
                            <AlertCircle size={17} style={{ color: '#B45309', marginTop: 2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: '#92400E' }}>
                                <strong>Enviar documentos não fatura.</strong> Somente as ações “Faturar” criam os lotes e alteram o estado financeiro das sessões.
                            </Typography>
                        </Box>

                        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#E0E7FF', bgcolor: '#F8FAFF' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 38, height: 38, fontSize: '0.8rem', fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5' }}>
                                        {initials(patientName(submission))}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography fontWeight={700}>{patientName(submission)}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {submission.sessionIds.length} sessões · {new Set(sessions.map(session => session.insuranceGuide?._id).filter(Boolean)).size} guias
                                        </Typography>
                                    </Box>
                                    <Chip size="small" variant="outlined" color="primary" label={submission.billingCompetence} sx={{ fontWeight: 700 }} />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
                                    {sessions.map(session => session.sessionType).filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(' · ') || 'Sessões de convênio'}
                                </Typography>
                            </CardContent>
                        </Card>

                        <Box sx={{
                            bgcolor: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 2, p: 1.75
                        }}>
                            <Typography fontWeight={700} mb={0.5}>Como as sessões serão faturadas?</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Defina se uma única NF cobre todas as guias ou se cada guia terá sua própria NF.
                            </Typography>
                            <RadioGroup row value={mode} onChange={event => handleModeChange(event.target.value as AllocationMode)} sx={{ mt: 0.5 }}>
                                <FormControlLabel value="grouped" control={<Radio size="small" />} label={<Typography variant="body2">Uma NF agrupada</Typography>} disabled={!isEditable || busy} />
                                <FormControlLabel value="per_guide" control={<Radio size="small" />} label={<Typography variant="body2">Uma NF por guia</Typography>} disabled={!isEditable || busy} />
                            </RadioGroup>
                        </Box>

                        <Stack spacing={2}>
                            {allocations.map((allocation, index) => {
                                const document = allocation.invoice?.documentId;
                                const filename = typeof document === 'string' ? 'NF anexada' : document?.originalName || document?.name;
                                return (
                                    <Card key={allocation._id || index} variant="outlined" sx={{ borderRadius: 3, borderColor: allocation.invoice?.documentId ? '#BBF7D0' : '#E5E7EB' }}>
                                      <CardContent sx={{ p: 2.25, '&:last-child': { pb: 2.25 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                            <Box>
                                                <Typography fontWeight={700}>{allocationTitle(allocation, sessions, index)}</Typography>
                                                <Typography variant="caption" color="text.secondary">{allocation.sessionIds.length} sessão(ões) nesta alocação</Typography>
                                            </Box>
                                            {allocation.invoice?.documentId && <Chip size="small" icon={<CheckCircle size={14} />} color="success" label="NF anexada" sx={{ fontWeight: 600 }} />}
                                        </Box>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                                            <TextField
                                                fullWidth label="Número da NF" size="small"
                                                value={allocation.invoice?.invoiceNumber || ''}
                                                disabled={!isEditable || busy}
                                                onChange={event => updateInvoice(allocation._id, 'invoiceNumber', event.target.value)}
                                            />
                                            <TextField
                                                fullWidth label="Data da NF" type="date" size="small" InputLabelProps={{ shrink: true }}
                                                value={allocation.invoice?.invoiceDate?.slice(0, 10) || ''}
                                                disabled={!isEditable || busy}
                                                onChange={event => updateInvoice(allocation._id, 'invoiceDate', event.target.value)}
                                            />
                                            <Button component="label" variant="outlined" startIcon={uploadingKey === allocation._id ? <CircularProgress size={14} /> : <Upload size={15} />} disabled={!isEditable || busy} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                {filename || 'Anexar NF'}
                                                <input hidden type="file" accept="application/pdf" onChange={event => {
                                                    const file = event.target.files?.[0];
                                                    if (file) uploadDocument(file, 'invoice', allocation._id);
                                                    event.target.value = '';
                                                }} />
                                            </Button>
                                        </Stack>
                                      </CardContent>
                                    </Card>
                                );
                            })}
                        </Stack>

                        <Divider><Typography variant="caption" color="text.secondary" fontWeight={700}>DOCUMENTOS COMPLEMENTARES</Typography></Divider>
                        <Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                                {slots.map(slot => (
                                    <Box key={slot.type} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.25, borderRadius: 2, bgcolor: slot.documentId ? '#F0FDF4' : '#F8FAFC', border: '1px solid', borderColor: slot.documentId ? '#BBF7D0' : '#F1F5F9' }}>
                                        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
                                            <FileText size={16} style={{ color: slot.documentId ? '#16A34A' : '#64748B', flexShrink: 0 }} />
                                            <Box minWidth={0}>
                                                <Typography variant="body2" fontWeight={600}>{slot.label}{slot.required ? ' *' : ''}</Typography>
                                                {slot.filename && <Typography variant="caption" color="text.secondary" noWrap display="block">{slot.filename}</Typography>}
                                            </Box>
                                        </Box>
                                        <Button component="label" size="small" variant="outlined" disabled={busy} startIcon={uploadingKey === slot.type ? <CircularProgress size={13} /> : <Upload size={14} />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0 }}>
                                            {slot.documentId ? 'Trocar' : 'Anexar'}
                                            <input hidden type="file" accept="application/pdf" onChange={event => {
                                                const file = event.target.files?.[0];
                                                if (file) uploadDocument(file, slot.type);
                                                event.target.value = '';
                                            }} />
                                        </Button>
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Box sx={{ bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 2, p: 1.75 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: '#166534', mb: 0.5 }}>Canal de envio</Typography>
                            <RadioGroup row value={deliveryMethod} onChange={event => setDeliveryMethod(event.target.value as 'email' | 'external')}>
                                <FormControlLabel value="email" control={<Radio size="small" />} label={<Typography variant="body2">E-mail pela aplicação</Typography>} disabled={busy} />
                                <FormControlLabel value="external" control={<Radio size="small" />} label={<Typography variant="body2">Registrar envio externo</Typography>} disabled={busy} />
                            </RadioGroup>
                            <Stack spacing={1.5} sx={{ mt: 1 }}>
                                {deliveryMethod === 'email' ? (
                                    <>
                                        <TextField label="Destinatário (convênio) *" value={to} onChange={event => setTo(event.target.value)} fullWidth size="small" disabled={busy} InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={16} color="#9CA3AF" /></InputAdornment> }} />
                                        <TextField label="Assunto" value={subject} onChange={event => setSubject(event.target.value)} fullWidth size="small" disabled={busy} />
                                        <TextField label="Corpo do e-mail" value={message} onChange={event => setMessage(event.target.value)} fullWidth multiline minRows={4} size="small" disabled={busy} />
                                    </>
                                ) : (
                                    <TextField label="Motivo/Protocolo do envio externo *" value={externalReason} onChange={event => setExternalReason(event.target.value)} fullWidth size="small" multiline minRows={2} disabled={busy} />
                                )}
                            </Stack>
                        </Box>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Box>
                    <Button onClick={handleClose} disabled={busy} sx={{ textTransform: 'none' }}>Fechar</Button>
                    {isEditable && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>O rascunho é salvo ao fechar</Typography>}
                </Box>
                {isEditable && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                        {!documentsAlreadySent && (
                            <Button onClick={() => runAction('send')} disabled={busy} variant="outlined" startIcon={<Mail size={16} />} sx={{ textTransform: 'none', fontWeight: 600 }}>
                                Enviar documentos sem faturar
                            </Button>
                        )}
                        <Button
                            onClick={() => runAction(documentsAlreadySent ? 'finalize' : 'finalize_send')}
                            disabled={busy}
                            variant="contained"
                            color="success"
                            startIcon={documentsAlreadySent ? <CheckCircle size={16} /> : <Send size={16} />}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {documentsAlreadySent ? 'Finalizar faturamento' : 'Faturar e enviar documentos'}
                        </Button>
                    </Stack>
                )}
            </DialogActions>
        </Dialog>
    );
}

export default BillingCommunicationWizard;
