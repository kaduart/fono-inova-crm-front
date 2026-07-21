// src/pages/Financial/components/ConvenioManagerModal.tsx
/**
 * Modal para Gerenciamento de Convênios
 * CRUD completo: criar, editar, ativar/desativar convênios
 */

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Typography,
    Tooltip,
    Switch,
    CircularProgress,
    Popover
} from '@mui/material';
import {
    Building2,
    Plus,
    Edit2,
    Trash2,
    RefreshCw,
    Check,
    Info,
    Inbox,
    Mail,
    Landmark
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ConvenioFormModal from './ConvenioFormModal';
import {
    getConvenios,
    deactivateConvenio,
    activateConvenio,
    Convenio
} from '../../../services/insuranceService';
import { extractErrorMessage } from '../../../utils/errorUtils';

interface ConvenioManagerModalProps {
    open: boolean;
    onClose: () => void;
}

const Pill = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
    <Box
        component="span"
        sx={{
            display: 'inline-flex', alignItems: 'center', px: 1.1, py: 0.35,
            borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
            bgcolor: bg, color, whiteSpace: 'nowrap', lineHeight: 1.2
        }}
    >
        {label}
    </Box>
);

const ConvenioManagerModal = ({ open, onClose }: ConvenioManagerModalProps) => {
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    // Modal de formulário (criar/editar) — separado deste modal de listagem
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);

    // Popover de detalhes de envio (e-mail, prazo, dados fiscais) — leitura rápida sem abrir o form
    const [detailsAnchor, setDetailsAnchor] = useState<HTMLElement | null>(null);
    const [detailsConvenio, setDetailsConvenio] = useState<Convenio | null>(null);

    const openDetails = (e: React.MouseEvent<HTMLElement>, convenio: Convenio) => {
        setDetailsAnchor(e.currentTarget);
        setDetailsConvenio(convenio);
    };

    const closeDetails = () => {
        setDetailsAnchor(null);
        setDetailsConvenio(null);
    };

    useEffect(() => {
        if (open) {
            loadConvenios();
        }
    }, [open, showInactive]);

    const loadConvenios = async () => {
        setLoading(true);
        try {
            const data = await getConvenios(showInactive);
            setConvenios(data);
        } catch (error) {
            toast.error('Erro ao carregar convênios');
        } finally {
            setLoading(false);
        }
    };

    const handleNewConvenio = () => {
        setEditingConvenio(null);
        setFormModalOpen(true);
    };

    const handleEdit = (convenio: Convenio) => {
        setEditingConvenio(convenio);
        setFormModalOpen(true);
    };

    const handleDeactivate = async (code: string) => {
        if (!confirm('Deseja desativar este convênio?')) return;

        try {
            setLoading(true);
            await deactivateConvenio(code);
            toast.success('Convênio desativado');
            loadConvenios();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao desativar'));
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (code: string) => {
        try {
            setLoading(true);
            await activateConvenio(code);
            toast.success('Convênio reativado');
            loadConvenios();
        } catch (error) {
            toast.error('Erro ao reativar');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    const renewalTypeInfo = (convenio: Convenio): { label: string; bg: string; color: string } => {
        switch (convenio.guidePolicy?.renewalType) {
            case 'advance_authorization':
                return { label: 'Pré-atendimento', bg: '#8B5CF61A', color: '#5B21B6' };
            case 'until_consumed':
                return { label: 'Até consumir', bg: '#3B82F61A', color: '#1D4ED8' };
            case 'fixed_date':
                return { label: 'Data fixa', bg: '#EF44441A', color: '#B91C1C' };
            case 'authorization_validity':
                return { label: 'Validade da autorização', bg: '#F59E0B1A', color: '#92400E' };
            case 'end_of_month':
            default:
                return { label: 'Fim do mês', bg: '#9CA3AF1F', color: '#4B5563' };
        }
    };

    const columns = [
        { label: 'Código', flex: 1.1 },
        { label: 'Nome', flex: 1.8 },
        { label: 'Valor Sessão', flex: 0.9, align: 'right' as const },
        { label: 'Faturamento', flex: 0.9, align: 'center' as const },
        { label: 'Tipo de Guia', flex: 1.2, align: 'center' as const },
        { label: 'Dia de Envio', flex: 0.8, align: 'center' as const },
        { label: 'Status', flex: 0.7, align: 'center' as const },
        { label: 'Pendentes', flex: 0.9, align: 'right' as const },
        { label: 'Ações', flex: 0.9, align: 'right' as const }
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #F1F5F9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 42, height: 42, borderRadius: 2.5, bgcolor: '#EFF6FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                            Gerenciar Convênios
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: '#94A3B8', mt: 0.25 }}>
                            Faturamento, tipo de guia e prazos de cada convênio
                        </Typography>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, bgcolor: '#FAFBFC' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    {/* Filtros */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#1F2937' }}>
                                Convênios Cadastrados
                            </Typography>
                            <Pill label={String(convenios.length)} bg="#9CA3AF1F" color="#4B5563" />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <Typography sx={{ fontSize: '0.78rem', color: '#6B7280' }}>
                                    Mostrar inativos
                                </Typography>
                                <Switch
                                    checked={showInactive}
                                    onChange={(e) => setShowInactive(e.target.checked)}
                                    size="small"
                                />
                            </Box>

                            <Button
                                variant="outlined"
                                size="small"
                                onClick={loadConvenios}
                                startIcon={<RefreshCw size={15} />}
                                disabled={loading}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#E2E8F0', color: '#475569' }}
                            >
                                Atualizar
                            </Button>

                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleNewConvenio}
                                startIcon={<Plus size={15} />}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                            >
                                Novo Convênio
                            </Button>
                        </Box>
                    </Box>

                    {/* Tabela */}
                    <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #E2E8F0', bgcolor: '#fff' }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1.1, bgcolor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                            {columns.map((col) => (
                                <Typography
                                    key={col.label}
                                    sx={{
                                        flex: col.flex, textAlign: col.align || 'left',
                                        fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8',
                                        textTransform: 'uppercase', letterSpacing: '0.06em'
                                    }}
                                >
                                    {col.label}
                                </Typography>
                            ))}
                        </Box>

                        {/* Corpo */}
                        {loading && convenios.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : convenios.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6, color: '#94A3B8' }}>
                                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <Typography sx={{ fontSize: '0.85rem' }}>Nenhum convênio encontrado</Typography>
                            </Box>
                        ) : (
                            convenios.map((convenio, idx) => {
                                const billing = convenio.billingMode === 'per_guide'
                                    ? { label: 'Por Guia', bg: '#10B9811A', color: '#047857' }
                                    : { label: 'Mensal', bg: '#3B82F61A', color: '#1D4ED8' };
                                const typeInfo = renewalTypeInfo(convenio);
                                const sendDay = convenio.guidePolicy?.renewalType === 'advance_authorization'
                                    ? convenio.guidePolicy?.priorAuthRequestDay
                                    : convenio.guidePolicy?.billingSubmissionDay;

                                return (
                                    <Box
                                        key={convenio._id}
                                        sx={{
                                            display: 'flex', alignItems: 'center', px: 2.5, py: 1.5,
                                            borderBottom: idx < convenios.length - 1 ? '1px solid #F8FAFC' : 'none',
                                            borderLeft: `3px solid ${convenio.active ? '#10B981' : 'transparent'}`,
                                            opacity: convenio.active ? 1 : 0.55,
                                            bgcolor: !convenio.active ? '#FAFBFC' : 'transparent',
                                            transition: 'background-color 0.15s',
                                            '&:hover': { bgcolor: convenio.active ? '#FAFBFC' : '#F8FAFC' }
                                        }}
                                    >
                                        <Typography sx={{ flex: 1.1, fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                                            {convenio.code}
                                        </Typography>

                                        <Box sx={{ flex: 1.8 }}>
                                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1F2937' }}>
                                                {convenio.name}
                                            </Typography>
                                            {convenio.notes && (
                                                <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                                                    {convenio.notes}
                                                </Typography>
                                            )}
                                        </Box>

                                        <Typography sx={{ flex: 0.9, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: '#3B82F6' }}>
                                            {formatCurrency(convenio.sessionValue)}
                                        </Typography>

                                        <Box sx={{ flex: 0.9, textAlign: 'center' }}>
                                            <Pill label={billing.label} bg={billing.bg} color={billing.color} />
                                        </Box>

                                        <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                                            <Pill label={typeInfo.label} bg={typeInfo.bg} color={typeInfo.color} />
                                        </Box>

                                        <Box sx={{ flex: 0.8, textAlign: 'center' }}>
                                            {sendDay ? (
                                                <Pill label={`Dia ${sendDay}`} bg="#F59E0B1A" color="#92400E" />
                                            ) : (
                                                <Typography sx={{ fontSize: '0.78rem', color: '#CBD5E1' }}>—</Typography>
                                            )}
                                        </Box>

                                        <Box sx={{ flex: 0.7, textAlign: 'center' }}>
                                            <Pill
                                                label={convenio.active ? 'Ativo' : 'Inativo'}
                                                bg={convenio.active ? '#10B9811A' : '#9CA3AF1F'}
                                                color={convenio.active ? '#047857' : '#4B5563'}
                                            />
                                        </Box>

                                        <Box sx={{ flex: 0.9, textAlign: 'right' }}>
                                            {convenio.stats?.pendingSessions ? (
                                                <Tooltip title={`Estimado: ${formatCurrency(convenio.stats.estimatedRevenue || 0)}`}>
                                                    <Box component="span">
                                                        <Pill label={`${convenio.stats.pendingSessions} sessões`} bg="#F59E0B1A" color="#92400E" />
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Typography sx={{ fontSize: '0.78rem', color: '#CBD5E1' }}>—</Typography>
                                            )}
                                        </Box>

                                        <Box sx={{ flex: 0.9, display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                            <Tooltip title="Como e pra quem enviar">
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => openDetails(e, convenio)}
                                                    sx={{ color: '#8B5CF6', '&:hover': { bgcolor: '#8B5CF61A' } }}
                                                >
                                                    <Info size={15} />
                                                </IconButton>
                                            </Tooltip>
                                            {convenio.active ? (
                                                <>
                                                    <Tooltip title="Editar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEdit(convenio)}
                                                            sx={{ color: '#3B82F6', '&:hover': { bgcolor: '#3B82F61A' } }}
                                                        >
                                                            <Edit2 size={15} />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Desativar">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeactivate(convenio.code)}
                                                            sx={{ color: '#EF4444', '&:hover': { bgcolor: '#EF44441A' } }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </>
                                            ) : (
                                                <Tooltip title="Reativar">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleActivate(convenio.code)}
                                                        startIcon={<Check size={14} />}
                                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                                                    >
                                                        Ativar
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                    </Box>

                    {/* Info */}
                    <Box sx={{
                        display: 'flex', gap: 1.25, alignItems: 'flex-start',
                        px: 2, py: 1.5, borderRadius: 2.5, bgcolor: '#EFF6FF', border: '1px solid #DBEAFE'
                    }}>
                        <Info size={17} color="#3B82F6" style={{ marginTop: 2, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#1E40AF', lineHeight: 1.5 }}>
                            <strong>Dica:</strong> o código do convênio é usado internamente pelo sistema
                            (ex: <code>unimed-anapolis</code>). Use apenas letras minúsculas, números e hífen.
                            O valor da sessão será aplicado automaticamente ao criar lotes de faturamento.
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9' }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    Fechar
                </Button>
            </DialogActions>

            <ConvenioFormModal
                open={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                onSaved={loadConvenios}
                editingConvenio={editingConvenio}
            />

            <Popover
                open={!!detailsAnchor}
                anchorEl={detailsAnchor}
                onClose={closeDetails}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: { borderRadius: 2.5, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' } }}
            >
                {detailsConvenio && (() => {
                    const gp = detailsConvenio.guidePolicy;
                    const isAdvance = gp?.renewalType === 'advance_authorization';
                    const email = isAdvance ? gp?.priorAuthEmail : gp?.billingEmail;
                    const emailLabel = isAdvance ? 'E-mail de autorização prévia' : 'E-mail de faturamento';
                    const sendDay = isAdvance ? gp?.priorAuthRequestDay : gp?.billingSubmissionDay;
                    const hasFiscal = detailsConvenio.legalName || detailsConvenio.taxId;

                    return (
                        <Box sx={{ p: 2.25, width: 320 }}>
                            <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>
                                {detailsConvenio.name}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#94A3B8', mb: 1.5 }}>
                                Como e pra quem enviar
                            </Typography>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <Mail size={15} color="#64748B" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                                            {emailLabel}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.82rem', color: email ? '#1F2937' : '#CBD5E1', fontWeight: 600 }}>
                                            {email || 'Não informado'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <Info size={15} color="#64748B" style={{ marginTop: 2, flexShrink: 0 }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                                            Prazo
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.82rem', color: '#1F2937' }}>
                                            {isAdvance
                                                ? (sendDay ? `Solicitar até dia ${sendDay} do mês anterior ao atendimento` : 'Não informado')
                                                : [
                                                    sendDay ? `Dia ${sendDay} do mês` : null,
                                                    gp?.billingDeadlineDays != null ? `${gp.billingDeadlineDays} dias corridos após o atendimento` : null
                                                ].filter(Boolean).join(' · ') || 'Não informado'
                                            }
                                        </Typography>
                                    </Box>
                                </Box>

                                {hasFiscal && (
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                        <Landmark size={15} color="#64748B" style={{ marginTop: 2, flexShrink: 0 }} />
                                        <Box>
                                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                                                Dados da NF
                                            </Typography>
                                            {detailsConvenio.legalName && (
                                                <Typography sx={{ fontSize: '0.82rem', color: '#1F2937' }}>
                                                    {detailsConvenio.legalName}
                                                </Typography>
                                            )}
                                            {detailsConvenio.taxId && (
                                                <Typography sx={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                                                    {detailsConvenio.taxId}
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            <Button
                                size="small"
                                onClick={() => { const c = detailsConvenio; closeDetails(); handleEdit(c); }}
                                sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 0 }}
                            >
                                Editar essas informações →
                            </Button>
                        </Box>
                    );
                })()}
            </Popover>
        </Dialog>
    );
};

export default ConvenioManagerModal;
