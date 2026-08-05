// src/pages/Financial/components/DocumentSendDrawer.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import {
    Box,
    Drawer,
    IconButton,
    Typography,
    Button,
    TextField,
    Checkbox,
    CircularProgress,
    Divider,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip
} from '@mui/material';
import { X, Send, Upload, Clipboard, FileText, History, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getCommunication,
    getPatientDocuments,
    uploadPatientDocument,
    pastePatientDocument,
    setCommunicationPackage,
    sendCommunication,
    getCommunicationJobStatus,
    CommunicationDetail,
    CommunicationRequest,
    PatientDocument,
    CommunicationPurpose,
    CommunicationEmailType,
    CommunicationEmailTypeLabels
} from '../../../services/communicationService';
import { extractErrorMessage } from '../../../utils/errorUtils';

interface DocumentSendDrawerProps {
    open: boolean;
    communication: CommunicationRequest | null;
    onClose: () => void;
    onSent: () => void;
    purpose?: CommunicationPurpose;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
    guide: 'Guia',
    medical_order: 'Pedido Médico',
    insurance_card: 'Carteirinha',
    id_document: 'RG',
    cpf: 'CPF',
    print_portal: 'Print Portal',
    report: 'Relatório',
    attendance_list: 'Lista de Presença',
    invoice: 'Nota Fiscal',
    other: 'Outro'
};

const PURPOSE_LABELS: Record<CommunicationPurpose, { title: string; action: string; defaultSubject: string }> = {
    authorization: {
        title: 'Autorização',
        action: 'Enviar Autorização',
        defaultSubject: 'Solicitação de Autorização de Atendimento'
    },
    billing: {
        title: 'Faturamento',
        action: 'Enviar Documentação',
        defaultSubject: 'Documentação para Faturamento'
    },
    appeal: {
        title: 'Recurso',
        action: 'Enviar Recurso',
        defaultSubject: 'Recurso de Glosa'
    },
    documentation: {
        title: 'Documentação',
        action: 'Enviar Documentos',
        defaultSubject: 'Envio de Documentação'
    }
};

const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR');

export function DocumentSendDrawer({
    open,
    communication,
    onClose,
    onSent,
    purpose: purposeProp
}: DocumentSendDrawerProps) {
    const [detail, setDetail] = useState<CommunicationDetail | null>(null);
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [reasonText, setReasonText] = useState('');
    // Snapshot do último envio real, capturado no load() — usado só pra decidir se um
    // clique em "Reenviar" conta como RESEND (nada mudou) ou COMPLEMENT (mudou algo),
    // sem expor essa escolha como dois botões separados pro usuário.
    const [originalSnapshot, setOriginalSnapshot] = useState<{ to: string; subject: string; message: string; documentIds: string[] } | null>(null);
    const [pasting, setPasting] = useState(false);
    const [uploadType, setUploadType] = useState('other');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const drawerRef = useRef<HTMLDivElement>(null);

    const purpose = purposeProp || communication?.purpose || 'authorization';
    const purposeLabels = PURPOSE_LABELS[purpose] || PURPOSE_LABELS.authorization;

    const load = useCallback(async () => {
        if (!communication) return;
        setLoading(true);
        try {
            const [detailRes, docsRes] = await Promise.all([
                getCommunication(communication._id),
                getPatientDocuments(communication.patientId)
            ]);

            const detailData = detailRes.data.data;
            setDetail(detailData);
            setDocuments(docsRes.data.data || []);

            // Pré-selecionar documentos do pacote existente
            const existingIds = new Set<string>(
                detailData.package?.attachments.map((a: { documentId: string | { _id: string } }) =>
                    typeof a.documentId === 'string' ? a.documentId : a.documentId?._id
                ).filter(Boolean) || []
            );
            setSelectedDocumentIds(existingIds);

            // emailLogs vem ordenado do mais recente pro mais antigo — reenvio/complemento
            // parte do que foi de fato enviado da última vez, não do default genérico do
            // convênio (que só faz sentido pro 1º envio, quando ainda não existe log).
            const latestLog = detailData.emailLogs?.[0];
            const initialTo = latestLog?.to || detailData.communicationRules?.defaultEmail || '';
            const initialSubject = latestLog?.subject || detailData.communicationRules?.defaultSubject || purposeLabels.defaultSubject;
            const initialMessage = latestLog?.message || '';
            setTo(initialTo);
            setSubject(initialSubject);
            setMessage(initialMessage);
            setReasonText('');
            setOriginalSnapshot({
                to: initialTo,
                subject: initialSubject,
                message: initialMessage,
                documentIds: [...existingIds].sort()
            });
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar detalhes'));
        } finally {
            setLoading(false);
        }
    }, [communication, purposeLabels.defaultSubject]);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    // Listener global de colar (Ctrl+V)
    useEffect(() => {
        if (!open) return;

        const handlePaste = async (e: ClipboardEvent) => {
            if (!communication) return;
            // Ignora colar em campos de texto para não interceptar assunto/mensagem
            const target = e.target as HTMLElement;
            if (target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            )) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (!file) continue;

                    setPasting(true);
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const base64 = reader.result as string;
                            const res = await pastePatientDocument({
                                patientId: communication.patientId,
                                type: 'print_portal',
                                name: `print-${Date.now()}`,
                                base64Image: base64,
                                mimeType: file.type
                            });
                            setDocuments(prev => [res.data.data, ...prev]);
                            setSelectedDocumentIds(prev => new Set([...prev, res.data.data._id]));
                            toast.success('Print adicionado!');
                        } catch (error) {
                            toast.error(extractErrorMessage(error, 'Erro ao colar print'));
                        } finally {
                            setPasting(false);
                        }
                    };
                    reader.onerror = () => {
                        toast.error('Erro ao ler imagem colada');
                        setPasting(false);
                    };
                    reader.readAsDataURL(file);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [open, communication]);

    const toggleDocument = (id: string) => {
        setSelectedDocumentIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!communication || !e.target.files?.[0]) return;
        const file = e.target.files[0];

        // PDF é bem mais leve que imagem de print/foto e evita o problema de upload
        // lento (achado em produção 2026-07-27). O paste de print (Ctrl+V) continua
        // aceitando imagem, porque não existe como colar print já em PDF.
        if (file.type !== 'application/pdf') {
            toast.warn('Envie o documento em PDF (mais leve e rápido). Use "Colar print" se só tiver a imagem.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', communication.patientId);
        formData.append('type', uploadType);

        try {
            const res = await uploadPatientDocument(formData);
            setDocuments(prev => [res.data.data, ...prev]);
            setSelectedDocumentIds(prev => new Set([...prev, res.data.data._id]));
            toast.success('Documento adicionado!');
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao enviar documento'));
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const isAlreadySent = communication?.status === 'sent' || communication?.status === 'approved';

    const handleSend = async (
        sendType?: typeof CommunicationEmailType.RESEND | typeof CommunicationEmailType.COMPLEMENT,
        subjectOverride?: string
    ) => {
        if (!communication) return;
        if (!to) return toast.warn('Informe o destinatário');
        if (selectedDocumentIds.size === 0) return toast.warn('Selecione pelo menos um documento');

        setSending(true);
        let jobId: string | null = null;
        try {
            await setCommunicationPackage(communication._id, Array.from(selectedDocumentIds));
            const res = await sendCommunication(communication._id, {
                to,
                subject: subjectOverride ?? subject,
                message,
                sendType,
                reason: sendType ? (reasonText.trim() || undefined) : undefined
            });
            jobId = res.data.data.jobId;
            toast.info('Comunicação enfileirada. Aguardando confirmação de envio...');

            // Polling: aguarda até 30s o job terminar
            const maxAttempts = 30;
            let attempts = 0;
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const statusRes = await getCommunicationJobStatus(communication._id, jobId!);
                    const { state, failedReason } = statusRes.data.data;

                    if (state === 'completed') {
                        clearInterval(interval);
                        toast.success('E-mail enviado com sucesso!');
                        setSending(false);
                        onSent();
                        return;
                    }

                    if (state === 'failed') {
                        clearInterval(interval);
                        toast.error(`Falha no envio: ${failedReason || 'Erro desconhecido'}`);
                        setSending(false);
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        toast.warn('Envio ainda em processamento. Verifique o histórico em breve.');
                        setSending(false);
                        onSent();
                    }
                } catch (pollError) {
                    clearInterval(interval);
                    toast.error(extractErrorMessage(pollError, 'Erro ao consultar status do envio'));
                    setSending(false);
                }
            }, 1000);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao enviar comunicação'));
            setSending(false);
        }
    };

    // Único botão pro usuário ("Reenviar") — o tipo (resend/complement) é decidido
    // sozinho comparando com o que foi de fato enviado da última vez: nada mudou =
    // reenvio; mudou mensagem/assunto/anexos/destinatário = complemento. Dois botões
    // separados só aumentavam a dúvida de qual escolher sem mudar o que acontece.
    const handleReenviar = () => {
        if (!originalSnapshot) {
            handleSend();
            return;
        }
        const currentIds = [...selectedDocumentIds].sort().join('|');
        const originalIds = originalSnapshot.documentIds.join('|');
        const changed =
            to !== originalSnapshot.to ||
            subject !== originalSnapshot.subject ||
            message !== originalSnapshot.message ||
            currentIds !== originalIds;

        if (!changed) {
            handleSend(CommunicationEmailType.RESEND);
            return;
        }

        // Complemento mantém o mesmo subject do e-mail original (ou o que o usuário
        // editou). Adicionar prefixo "Complemento - " quebra o threading no Gmail,
        // que dá peso grande ao subject igual para agrupar conversas.
        handleSend(CommunicationEmailType.COMPLEMENT, subject);
    };

    const requiredDocuments = detail?.communicationRules?.requiredDocuments || [];

    const groupedByType = documents.reduce((acc, doc) => {
        if (!acc[doc.type]) acc[doc.type] = [];
        acc[doc.type].push(doc);
        return acc;
    }, {} as Record<string, PatientDocument[]>);

    const missingRequiredDocuments = requiredDocuments
        .filter(req => req.required)
        .filter(req => !(groupedByType[req.type] || []).some(d => selectedDocumentIds.has(d._id)));

    // Documentos obrigatórios só fazem sentido pro 1º envio — reenvio/complemento usa
    // anexos que já foram aceitos e enviados com sucesso antes, então não faz sentido
    // travar o botão exigindo um tipo de documento que nem estava lá da primeira vez
    // (achado 2026-08-04: paciente com guia já enviada sem "Guia" anexada tinha o
    // Reenviar sempre desabilitado).
    const isReadyToSend = to.trim() !== '' && selectedDocumentIds.size > 0 && (isAlreadySent || missingRequiredDocuments.length === 0);

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100vw', sm: 520 }, display: 'flex', flexDirection: 'column' } }}
        >
            <div ref={drawerRef} className="flex flex-col h-full">
                {/* Header */}
                <Box sx={{
                    px: 3, pt: 3, pb: 2.5,
                    background: 'linear-gradient(135deg, #EDE9FE 0%, #fff 100%)',
                    borderBottom: '2px solid #DDD6FE',
                    position: 'relative'
                }}>
                    <IconButton
                        size="small" onClick={onClose}
                        sx={{ position: 'absolute', top: 12, right: 12, bgcolor: 'rgba(0,0,0,0.05)', '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' } }}
                    >
                        <X size={18} />
                    </IconButton>

                    <Typography fontWeight="800" fontSize="1.15rem" color="#0F172A" lineHeight={1.2}>
                        {communication?.patientName || 'Paciente'}
                    </Typography>
                    <Typography fontSize="0.82rem" color="#7C3AED" fontWeight={700}>
                        {communication?.insuranceName || communication?.insuranceProvider}
                    </Typography>
                    {communication?.specialty && (
                        <Typography fontSize="0.75rem" color="#64748B">
                            {communication.specialty} {communication.requestedSessions ? `· ${communication.requestedSessions} sessões` : ''}
                        </Typography>
                    )}
                    <Chip
                        size="small"
                        label={purposeLabels.title}
                        sx={{
                            mt: 1,
                            bgcolor: '#DDD6FE',
                            color: '#7C3AED',
                            fontWeight: 700,
                            fontSize: '0.65rem'
                        }}
                    />
                </Box>

                {loading ? (
                    <Box className="flex-1 flex items-center justify-center">
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <Box className="flex-1 overflow-y-auto p-4 space-y-5">
                        {/* Checklist de documentos obrigatórios — só no 1º envio; no reenvio/complemento
                            os anexos já foram aceitos antes, então "Faltando" aqui seria enganoso. */}
                        {!isAlreadySent && requiredDocuments.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <Typography fontWeight={700} fontSize="0.85rem" color="#0F172A" className="mb-2">
                                    Documentos obrigatórios
                                </Typography>
                                <div className="space-y-1">
                                    {requiredDocuments.map((req) => {
                                        const hasDoc = (groupedByType[req.type] || []).length > 0;
                                        const selected = (groupedByType[req.type] || []).some(d => selectedDocumentIds.has(d._id));
                                        return (
                                            <div key={req.type} className="flex items-center justify-between text-sm">
                                                <span className={req.required ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                                                    {req.label} {req.required ? '*' : '(sugerido)'}
                                                </span>
                                                <Chip
                                                    size="small"
                                                    label={selected ? 'Incluído' : hasDoc ? 'Disponível' : 'Faltando'}
                                                    sx={{
                                                        bgcolor: selected ? '#D1FAE5' : hasDoc ? '#FEF3C7' : '#FEE2E2',
                                                        color: selected ? '#065F46' : hasDoc ? '#B45309' : '#B91C1C',
                                                        fontWeight: 600,
                                                        fontSize: '0.65rem'
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ações de upload/colar */}
                        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel id="upload-type-label">Tipo do documento</InputLabel>
                                <Select
                                    labelId="upload-type-label"
                                    value={uploadType}
                                    label="Tipo do documento"
                                    onChange={(e) => setUploadType(e.target.value)}
                                >
                                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                                        <MenuItem key={type} value={type}>{label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <input
                                type="file"
                                accept="application/pdf"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<Upload size={16} />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                                Adicionar arquivo
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={pasting ? <CircularProgress size={14} /> : <Clipboard size={16} />}
                                disabled={pasting}
                                sx={{ borderRadius: 2, textTransform: 'none' }}
                            >
                                Colar print (Ctrl+V)
                            </Button>
                        </div>

                        {/* Documentos do paciente */}
                        <div>
                            <Typography fontWeight={700} fontSize="0.85rem" color="#0F172A" className="mb-2">
                                Documentos do paciente
                            </Typography>
                            {documents.length === 0 ? (
                                <Typography fontSize="0.8rem" color="#94A3B8">
                                    Nenhum documento encontrado. Adicione ou cole um print.
                                </Typography>
                            ) : (
                                <div className="space-y-2">
                                    {Object.entries(groupedByType).map(([type, docs]) => (
                                        <div key={type} className="border border-gray-200 rounded-xl p-2">
                                            <Typography fontSize="0.75rem" fontWeight={700} color="#64748B" className="mb-1 uppercase tracking-wider">
                                                {DOCUMENT_TYPE_LABELS[type] || type}
                                            </Typography>
                                            {docs.map(doc => (
                                                <label
                                                    key={doc._id}
                                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={selectedDocumentIds.has(doc._id)}
                                                        onChange={() => toggleDocument(doc._id)}
                                                        size="small"
                                                    />
                                                    <FileText size={16} className="text-gray-400" />
                                                    <div className="flex-1 min-w-0">
                                                        <Typography fontSize="0.8rem" fontWeight={500} noWrap>
                                                            {doc.name}
                                                        </Typography>
                                                        <Typography fontSize="0.65rem" color="#94A3B8">
                                                            {formatDate(doc.createdAt)}
                                                        </Typography>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Divider />

                        {/* Preview do e-mail */}
                        <div>
                            <Typography fontWeight={700} fontSize="0.85rem" color="#0F172A" className="mb-2">
                                E-mail a ser enviado
                            </Typography>
                            <TextField
                                fullWidth
                                label="Destinatário"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                size="small"
                                sx={{ mb: 2 }}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Assunto"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                size="small"
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Mensagem"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                multiline
                                rows={4}
                                size="small"
                                placeholder="Mensagem opcional a ser incluída no corpo do e-mail..."
                            />
                            {isAlreadySent && (
                                <TextField
                                    fullWidth
                                    label="Motivo do reenvio/complemento (opcional)"
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    size="small"
                                    sx={{ mt: 2 }}
                                    placeholder='Ex.: "Convênio informou que não recebeu" ou "Relatório assinado"'
                                />
                            )}
                        </div>

                        {/* Histórico de envios */}
                        {detail?.emailLogs && detail.emailLogs.length > 0 && (
                            <div>
                                <Typography fontWeight={700} fontSize="0.85rem" color="#0F172A" className="mb-2 flex items-center gap-1">
                                    <History size={16} /> Histórico de envios
                                </Typography>
                                <div className="space-y-2">
                                    {detail.emailLogs.map(log => (
                                        <div key={log._id} className="bg-gray-50 rounded-lg p-2 text-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-700 font-medium">{log.to}</span>
                                                <div className="flex items-center gap-1">
                                                    {log.type && log.type !== CommunicationEmailType.FIRST_SEND && (
                                                        <Chip
                                                            size="small"
                                                            label={CommunicationEmailTypeLabels[log.type] || log.type}
                                                            sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', fontSize: '0.65rem', fontWeight: 700 }}
                                                        />
                                                    )}
                                                    <Chip
                                                        size="small"
                                                        label={log.status === 'success' ? 'Enviado' : log.status === 'pending' ? 'Processando…' : 'Erro'}
                                                        sx={{
                                                            bgcolor: log.status === 'success' ? '#D1FAE5' : log.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                                                            color: log.status === 'success' ? '#065F46' : log.status === 'pending' ? '#92400E' : '#B91C1C',
                                                            fontSize: '0.65rem'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatDate(log.sentAt)} · {log.attachments.length} anexo(s)
                                                {log.attempt > 1 ? ` · tentativa ${log.attempt}` : ''}
                                            </div>
                                            {log.reason && (
                                                <div className="text-xs text-gray-500 italic mt-0.5">"{log.reason}"</div>
                                            )}
                                            {log.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {log.attachments.map((att, i) => (
                                                        <span
                                                            key={att.documentId || i}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-white border border-gray-200 text-gray-600"
                                                            title={att.size ? `${(att.size / 1024).toFixed(0)} KB` : undefined}
                                                        >
                                                            {att.name || 'anexo'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Box>
                )}

                {/* Footer */}
                <Box className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outlined"
                            onClick={onClose}
                            disabled={sending}
                            sx={{ borderRadius: 2, textTransform: 'none' }}
                        >
                            Cancelar
                        </Button>
                        {isAlreadySent ? (
                            <Tooltip
                                arrow
                                placement="top"
                                title={
                                    <span style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                                        Manda um novo e-mail pra este destinatário. Se você não mudar nada,
                                        fica registrado como <strong>reenvio</strong>. Se alterar a mensagem, o
                                        assunto ou os anexos, fica registrado como <strong>complemento</strong> —
                                        nada do que já foi enviado é apagado, cada envio vira uma linha nova no
                                        histórico.
                                    </span>
                                }
                            >
                                <span>
                                    <Button
                                        variant="contained"
                                        onClick={handleReenviar}
                                        disabled={sending || !isReadyToSend}
                                        startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                                        endIcon={<Info size={14} style={{ opacity: 0.7 }} />}
                                        sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, borderRadius: 2, textTransform: 'none' }}
                                    >
                                        {sending ? 'Enviando...' : 'Reenviar'}
                                    </Button>
                                </span>
                            </Tooltip>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={() => handleSend()}
                                disabled={sending || !isReadyToSend}
                                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
                                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, borderRadius: 2, textTransform: 'none' }}
                            >
                                {sending ? 'Enviando...' : purposeLabels.action}
                            </Button>
                        )}
                    </div>
                </Box>
            </div>
        </Drawer>
    );
}

export default DocumentSendDrawer;
