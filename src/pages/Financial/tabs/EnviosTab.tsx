// src/pages/Financial/tabs/EnviosTab.tsx
// Aba "Envios" — histórico/auditoria de cada TENTATIVA de e-mail disparada aos convênios
// (1º envio, reenvio, complemento), com destinatário, assunto, anexos e protocolo. Antes
// disso a única forma de saber o que foi enviado era abrir o painel do Resend (que não
// lista anexos) ou consultar o banco direto — e mesmo dentro do CRM só se via o último
// envio de cada comunicação, não cada tentativa (achado 2026-08-04).
import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Chip,
    Skeleton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Pagination
} from '@mui/material';
import { CheckCircle, XCircle, Mail, FileText, ChevronRight, Clock, Send, AlertCircle } from 'lucide-react';
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

function fmtMonthLabel(key: string) {
    const [y, m] = key.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

// Os últimos 12 meses, gerados a partir de hoje. Antes essa lista era derivada dos
// logs da página atual — o que fazia o próprio filtro de período depender de quais
// envios tinham calhado de cair na página aberta.
const LAST_12_MONTHS = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
});

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'all', label: 'Enviados e não enviados' },
    { value: 'unsent', label: 'Não enviados' },
    { value: 'success', label: 'Somente enviados' },
    { value: 'error', label: 'Somente falhas de envio' },
    { value: 'pending', label: 'Em processamento' }
];

// 'pending' = marcador gravado antes de chamar o provedor de e-mail, ainda não
// confirmado — nunca deve aparecer como "Enviado" (seria enganoso, o resultado real
// é desconhecido até o job terminar ou ser investigado manualmente).
//
// 'not_sent' não vem de um log: é uma comunicação pronta que nunca teve tentativa de
// envio. Distinto de 'error' de propósito — "falhou" e "nunca saiu" pedem leituras
// diferentes de quem opera a tela.
const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
    success: { label: 'Enviado', bg: '#D1FAE5', color: '#065F46' },
    error: { label: 'Falha no envio', bg: '#FEE2E2', color: '#B91C1C' },
    pending: { label: 'Processando…', bg: '#FEF3C7', color: '#92400E' },
    not_sent: { label: 'Não enviado', bg: '#FFEDD5', color: '#9A3412' }
};

export default function EnviosTab() {
    const [items, setItems] = useState<CommunicationEmailLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [purpose, setPurpose] = useState<CommunicationPurpose | 'all'>('all');
    const [insurance, setInsurance] = useState('all');
    const [periodFilter, setPeriodFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selected, setSelected] = useState<CommunicationRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'send' | 'history'>('history');
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [pages, setPages] = useState(0);

    const { convenios } = useConvenios({ includeInactive: false });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchText), 350);
        return () => clearTimeout(t);
    }, [searchText]);

    // Nenhum recorte de período por padrão — "Envios" é um histórico/auditoria de CADA
    // tentativa (CommunicationEmailLog), não um resumo por comunicação. Escopar por mês
    // (como o resto do dashboard faz) escondia envios antigos (achado 2026-08-04, mesma
    // classe de bug já corrigida antes em "A Faturar").
    //
    // Busca, período e status vão para o backend: filtrar no cliente só alcançava os 25
    // logs da página aberta, então um envio antigo não aparecia na busca mesmo existindo.
    const load = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const res = await getCommunicationEmailLogs({
                purpose: purpose === 'all' ? undefined : purpose,
                insurance: insurance === 'all' ? undefined : insurance,
                status: statusFilter === 'all' ? undefined : (statusFilter as 'success' | 'error' | 'pending' | 'unsent'),
                search: debouncedSearch.trim() || undefined,
                month: periodFilter === 'all' ? undefined : periodFilter,
                page: targetPage,
                limit
            });
            setItems(res.data.data || []);
            setTotal(res.data.pagination?.total || 0);
            setPages(res.data.pagination?.pages || 0);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar envios'));
        } finally {
            setLoading(false);
        }
    }, [purpose, insurance, statusFilter, debouncedSearch, periodFilter, page, limit]);

    useEffect(() => {
        load();
    }, [load]);

    // Todo filtro volta para a página 1 no mesmo handler que o altera: continuar na
    // página 3 de um resultado que agora tem uma única página devolvia a tela vazia.
    // (Feito no setter, e não num useEffect, para não disparar duas buscas concorrentes.)
    const filtered = items;

    // O drawer trabalha com uma "comunicação" (o botão Reenviar age sobre ela, não
    // sobre um log isolado) — montamos um objeto mínimo a partir do contexto já embutido
    // no log; o drawer busca os detalhes completos (histórico, documentos) por conta própria.
    //
    // `tab` separa as duas intenções da linha: "Enviar/Reenviar" abre o formulário de
    // envio, "Ver detalhes" abre o histórico da comunicação. Sem isso os dois botões
    // (e o clique no card) disparavam exatamente a mesma tela.
    const handleOpenDrawer = (log: CommunicationEmailLogEntry, tab: 'send' | 'history' = 'history') => {
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
        setDrawerTab(tab);
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
                    onChange={e => { setSearchText(e.target.value); setPage(1); }}
                    sx={{ minWidth: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 210 }}>
                    <InputLabel>Situação</InputLabel>
                    <Select value={statusFilter} label="Situação" onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                        {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Motivo</InputLabel>
                    <Select value={purpose} label="Motivo" onChange={e => { setPurpose(e.target.value as CommunicationPurpose | 'all'); setPage(1); }}>
                        {PURPOSE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Convênio</InputLabel>
                    <Select value={insurance} label="Convênio" onChange={e => { setInsurance(e.target.value); setPage(1); }}>
                        <MenuItem value="all">Todos os convênios</MenuItem>
                        {convenios.map(c => <MenuItem key={c._id} value={c.code}>{c.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Período</InputLabel>
                    <Select value={periodFilter} label="Período" onChange={e => { setPeriodFilter(e.target.value); setPage(1); }}>
                        <MenuItem value="all">Todos os períodos</MenuItem>
                        {LAST_12_MONTHS.map(k => (
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
                        const neverSent = log.status === 'not_sent';
                        const accent = log.status === 'success' ? '#059669'
                            : log.status === 'pending' ? '#D97706'
                            : neverSent ? '#EA580C'
                            : '#E11D48';
                        const typeLabel = log.type ? CommunicationEmailTypeLabels[log.type] : undefined;
                        const channelLabel = log.channel === 'external' ? 'Externo' : log.channel === 'portal' ? 'Portal' : 'E-mail';
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
                                                label={channelLabel}
                                                sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: '0.68rem', height: 22 }}
                                            />
                                            <Chip
                                                size="small"
                                                icon={log.status === 'success' ? <CheckCircle size={13} /> : log.status === 'pending' ? <Clock size={13} /> : neverSent ? <AlertCircle size={13} /> : <XCircle size={13} />}
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
                                        <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-slate-600 pl-[52px]">
                                            <FileText size={12} className="text-slate-400 shrink-0" />
                                            <span className="truncate italic">{log.subject}</span>
                                        </div>
                                    )}

                                    {/* Rodapé compacto — data + anexos, resto fica atrás do clique */}
                                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 pl-[52px]">
                                        <span className="text-2xs text-slate-400 truncate">
                                            {/* Sem envio não existe "enviado em" — a data é de quando ficou pronta. */}
                                            {neverSent && sentAt ? <>pronta desde {sentAt}</> : sentAt}
                                            {log.attachments && log.attachments.length > 0 && (
                                                <> · {log.attachments.length} anexo{log.attachments.length !== 1 ? 's' : ''}</>
                                            )}
                                        </span>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {(log.status === 'error' || neverSent) && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenDrawer(log, 'send'); }}
                                                    className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-2xs font-bold text-violet-700 transition hover:bg-violet-100"
                                                >
                                                    <Send size={11} /> {neverSent ? 'Enviar' : 'Reenviar'}
                                                </button>
                                            )}
                                            <span className="inline-flex items-center gap-0.5 text-2xs font-bold text-violet-600 group-hover:text-violet-700">
                                                Ver detalhes <ChevronRight size={12} />
                                            </span>
                                            {/* "Ver detalhes" não tem onClick próprio: é o rótulo do clique
                                                no card inteiro, que abre o histórico. Duplicar o handler aqui
                                                só criaria dois caminhos para a mesma coisa. */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
                        {total} envio{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
                    </Typography>
                    <Pagination
                        count={pages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        size="small"
                        shape="rounded"
                    />
                </div>
            )}

            <DocumentSendDrawer
                open={drawerOpen}
                communication={selected}
                initialTab={drawerTab}
                onClose={handleCloseDrawer}
                onSent={() => { handleCloseDrawer(); load(); }}
            />
        </Box>
    );
}
