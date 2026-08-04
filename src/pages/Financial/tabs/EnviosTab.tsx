// src/pages/Financial/tabs/EnviosTab.tsx
// Aba "Envios" — histórico/auditoria de cada TENTATIVA de e-mail disparada aos convênios
// (1º envio, reenvio, complemento), com destinatário, assunto, anexos e protocolo. Antes
// disso a única forma de saber o que foi enviado era abrir o painel do Resend (que não
// lista anexos) ou consultar o banco direto — e mesmo dentro do CRM só se via o último
// envio de cada comunicação, não cada tentativa (achado 2026-08-04).
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Chip,
    Skeleton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { CheckCircle, XCircle, Mail, Clock, Hash, FileText, MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getCommunicationEmailLogs,
    CommunicationEmailLogEntry,
    CommunicationEmailTypeLabels,
    CommunicationRequest,
    CommunicationPurpose
} from '../../../services/communicationService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { DocumentSendDrawer } from '../components/DocumentSendDrawer';
import { useConvenios } from '../../../hooks/useConvenios';

const PURPOSE_LABELS: Record<CommunicationPurpose, string> = {
    authorization: 'Autorização',
    billing: 'Faturamento',
    appeal: 'Recurso',
    documentation: 'Documentação'
};

const PURPOSE_OPTIONS: Array<{ value: CommunicationPurpose | 'all'; label: string }> = [
    { value: 'all', label: 'Todos os motivos' },
    { value: 'billing', label: 'Faturamento' },
    { value: 'documentation', label: 'Documentação' },
    { value: 'appeal', label: 'Recurso' },
    { value: 'authorization', label: 'Autorização' }
];

function formatDateTime(iso?: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtSize(bytes?: number) {
    if (!bytes) return null;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function monthKeyOf(log: CommunicationEmailLogEntry) {
    return log.sentAt ? log.sentAt.slice(0, 7) : null; // 'YYYY-MM'
}

function fmtMonthLabel(key: string) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// 'pending' = marcador gravado antes de chamar o provedor de e-mail, ainda não
// confirmado — nunca deve aparecer como "Enviado" (seria enganoso, o resultado real
// é desconhecido até o job terminar ou ser investigado manualmente).
const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
    success: { label: 'Enviado', bg: '#D1FAE5', color: '#065F46' },
    error: { label: 'Falha no envio', bg: '#FEE2E2', color: '#B91C1C' },
    pending: { label: 'Processando…', bg: '#FEF3C7', color: '#92400E' }
};

// Cada extensão ganha uma cor de identificação — ajuda a escanear um lote de
// anexos sem precisar ler cada nome (o mesmo princípio de um selo de correio).
const EXT_STYLE: Record<string, { bg: string; color: string }> = {
    pdf: { bg: '#FEE2E2', color: '#B91C1C' },
    doc: { bg: '#DBEAFE', color: '#1D4ED8' },
    docx: { bg: '#DBEAFE', color: '#1D4ED8' },
    jpg: { bg: '#EDE9FE', color: '#6D28D9' },
    jpeg: { bg: '#EDE9FE', color: '#6D28D9' },
    png: { bg: '#EDE9FE', color: '#6D28D9' },
    xls: { bg: '#D1FAE5', color: '#047857' },
    xlsx: { bg: '#D1FAE5', color: '#047857' }
};
const DEFAULT_EXT_STYLE = { bg: '#F1F5F9', color: '#475569' };

function extOf(name: string) {
    const match = name.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : '';
}

function AttachmentChip({ name, size }: { name: string; size?: number }) {
    const ext = extOf(name);
    const style = EXT_STYLE[ext] || DEFAULT_EXT_STYLE;
    const label = name.replace(/\.[^.]+$/, '');
    const sizeLabel = fmtSize(size);
    return (
        <span
            className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 max-w-[220px] transition-colors hover:border-slate-300 hover:bg-white"
            title={sizeLabel ? `${name} · ${sizeLabel}` : name}
        >
            <span
                className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wide"
                style={{ background: style.bg, color: style.color }}
            >
                {ext ? ext.toUpperCase() : 'DOC'}
            </span>
            <span className="truncate text-[12px] font-medium text-slate-700">{label}</span>
            {sizeLabel && <span className="shrink-0 text-[10.5px] text-slate-400 font-medium">{sizeLabel}</span>}
        </span>
    );
}

function MetaField({ icon: Icon, label, value, mono, title }: {
    icon: typeof Mail;
    label: string;
    value?: string | null;
    mono?: boolean;
    title?: string;
}) {
    if (!value) return null;
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                <Icon size={10} strokeWidth={2.5} />
                {label}
            </div>
            <div
                className={`text-[12.5px] font-semibold text-slate-700 truncate ${mono ? 'font-mono tracking-tight' : ''}`}
                title={title || value}
            >
                {value}
            </div>
        </div>
    );
}

export default function EnviosTab() {
    const [items, setItems] = useState<CommunicationEmailLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [purpose, setPurpose] = useState<CommunicationPurpose | 'all'>('all');
    const [insurance, setInsurance] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [selected, setSelected] = useState<CommunicationRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const { convenios } = useConvenios({ includeInactive: false });

    // Sem filtro de mês/status no backend por padrão — "Envios" é um histórico/auditoria
    // de CADA tentativa (CommunicationEmailLog), não um resumo por comunicação. Escopar
    // por mês (como o resto do dashboard faz) escondia envios antigos (achado 2026-08-04,
    // mesma classe de bug já corrigida antes em "A Faturar").
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCommunicationEmailLogs({
                purpose: purpose === 'all' ? undefined : purpose,
                insurance: insurance === 'all' ? undefined : insurance,
                limit: 300
            });
            setItems(res.data.data || []);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar envios'));
        } finally {
            setLoading(false);
        }
    }, [purpose, insurance]);

    useEffect(() => {
        load();
    }, [load]);

    const availableMonths = useMemo(() => {
        const seen = new Set<string>();
        items.forEach(log => { const k = monthKeyOf(log); if (k) seen.add(k); });
        return [...seen].sort((a, b) => b.localeCompare(a));
    }, [items]);

    const filtered = useMemo(() => {
        const search = searchText.toLowerCase();
        return items
            .filter(log => !search || (log.patientName || '').toLowerCase().includes(search))
            .filter(log => periodFilter === 'all' || monthKeyOf(log) === periodFilter)
            .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    }, [items, searchText, periodFilter]);

    // O drawer trabalha com uma "comunicação" (o botão Reenviar age sobre ela, não
    // sobre um log isolado) — montamos um objeto mínimo a partir do contexto já embutido
    // no log; o drawer busca os detalhes completos (histórico, documentos) por conta própria.
    const handleOpenDrawer = (log: CommunicationEmailLogEntry) => {
        const communication: CommunicationRequest = {
            _id: log.communicationId,
            patientId: log.patientId || '',
            patientName: log.patientName,
            insuranceProvider: log.insuranceProvider,
            insuranceName: log.insuranceName,
            guideNumber: log.guideNumber,
            purpose: log.purpose,
            status: log.communicationStatus || 'sent',
            createdAt: log.sentAt,
            updatedAt: log.sentAt
        };
        setSelected(communication);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelected(null);
    };

    return (
        <Box>
            {/* Header */}
            <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#0D9488' }}>
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Envios aos Convênios</h2>
                        <p className="text-sm text-gray-500">Histórico completo de tentativas — destinatário, anexos e protocolo</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <TextField
                    size="small"
                    placeholder="Buscar paciente..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    sx={{ minWidth: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Motivo</InputLabel>
                    <Select value={purpose} label="Motivo" onChange={e => setPurpose(e.target.value as CommunicationPurpose | 'all')}>
                        {PURPOSE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Convênio</InputLabel>
                    <Select value={insurance} label="Convênio" onChange={e => setInsurance(e.target.value)}>
                        <MenuItem value="all">Todos os convênios</MenuItem>
                        {convenios.map(c => <MenuItem key={c._id} value={c.code}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Período</InputLabel>
                    <Select value={periodFilter} label="Período" onChange={e => setPeriodFilter(e.target.value)}>
                        <MenuItem value="all">Todos os períodos</MenuItem>
                        {availableMonths.map(k => (
                            <MenuItem key={k} value={k} sx={{ textTransform: 'capitalize' }}>{fmtMonthLabel(k)}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={148} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        Nenhum envio encontrado
                    </Typography>
                    {(purpose !== 'all' || insurance !== 'all' || periodFilter !== 'all' || searchText) && (
                        <Typography variant="body2" color="text.secondary">
                            Tente limpar os filtros de motivo, convênio ou período.
                        </Typography>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(log => {
                        const statusStyle = STATUS_STYLE[log.status] || STATUS_STYLE.error;
                        const sentAt = formatDateTime(log.sentAt);
                        const accent = log.status === 'success' ? '#059669' : log.status === 'pending' ? '#D97706' : '#E11D48';
                        const typeLabel = log.type ? CommunicationEmailTypeLabels[log.type] : undefined;
                        return (
                            <div
                                key={log._id}
                                onClick={() => handleOpenDrawer(log)}
                                className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden cursor-pointer transition-all hover:border-slate-300"
                                style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(15,23,42,0.14)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; }}
                            >
                                {/* Lombada de status — a cor conta a história antes de qualquer texto ser lido */}
                                <div className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />

                                <div className="pl-5 pr-4 py-3.5">
                                    {/* Identidade: paciente, convênio, guia, motivo */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold"
                                                style={{ background: '#CCFBF1', color: '#0F766E' }}
                                            >
                                                {log.patientName?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[14.5px] font-bold text-slate-900 truncate leading-tight">
                                                    {log.patientName || 'Paciente'}
                                                </div>
                                                <div className="text-[12px] text-slate-500 font-medium truncate mt-0.5">
                                                    {log.insuranceName || log.insuranceProvider}
                                                    {log.guideNumber && <> · Guia <span className="font-semibold text-slate-600">{log.guideNumber}</span></>}
                                                    {' · '}{PURPOSE_LABELS[log.purpose] || log.purpose}
                                                    {log.attempt > 1 && <> · tentativa {log.attempt}</>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                                            {typeLabel && (
                                                <Chip
                                                    size="small"
                                                    label={typeLabel}
                                                    sx={{ bgcolor: '#EDE9FE', color: '#7C3AED', fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                                />
                                            )}
                                            <Chip
                                                size="small"
                                                icon={log.status === 'success' ? <CheckCircle size={13} /> : log.status === 'pending' ? <Clock size={13} /> : <XCircle size={13} />}
                                                label={statusStyle.label}
                                                sx={{
                                                    bgcolor: statusStyle.bg,
                                                    color: statusStyle.color,
                                                    fontWeight: 700,
                                                    fontSize: '0.68rem',
                                                    height: 22,
                                                    '& .MuiChip-icon': { color: statusStyle.color }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Assunto — tratado como a "janela do envelope" */}
                                    {log.subject && (
                                        <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-slate-600 pl-[52px]">
                                            <FileText size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate italic">{log.subject}</span>
                                        </div>
                                    )}

                                    {/* Motivo do reenvio/complemento, quando informado */}
                                    {log.reason && (
                                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500 pl-[52px]">
                                            <MessageSquare size={11} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{log.reason}</span>
                                        </div>
                                    )}

                                    {/* Ficha técnica do disparo */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-2.5">
                                        <MetaField icon={Mail} label="Destinatário" value={log.to} />
                                        <MetaField icon={Clock} label="Enviado em" value={sentAt} mono />
                                        <MetaField
                                            icon={Hash}
                                            label="Protocolo"
                                            value={log.protocol ? `${log.protocol.slice(0, 12)}…` : null}
                                            title={log.protocol || undefined}
                                            mono
                                        />
                                    </div>

                                    {/* Anexos */}
                                    {log.attachments && log.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                                            {log.attachments.map((att, i) => (
                                                <AttachmentChip key={att.documentId || i} name={att.name || 'documento'} size={att.size} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <DocumentSendDrawer
                open={drawerOpen}
                communication={selected}
                onClose={handleCloseDrawer}
                onSent={() => { handleCloseDrawer(); load(); }}
            />
        </Box>
    );
}
