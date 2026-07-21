// src/pages/Financial/tabs/AutorizacoesTab.tsx
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    Skeleton,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress
} from '@mui/material';
import {
    FileText,
    Clock,
    Send,
    CheckCircle,
    XCircle,
    Shield,
    Plus
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getCommunications,
    createCommunication,
    CommunicationRequest,
    CommunicationStatus
} from '../../../services/communicationService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { DocumentSendDrawer } from '../components/DocumentSendDrawer';
import { usePatients } from '../../../hooks/usePatients';
import { useConvenios } from '../../../hooks/useConvenios';

interface AutorizacoesTabProps {
    month: number;
    year: number;
}

const STATUS_CONFIG: Record<CommunicationStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    draft: { label: 'Rascunho', color: '#6B7280', bg: '#F3F4F6', icon: <Clock size={14} /> },
    ready: { label: 'Pronta', color: '#F59E0B', bg: '#FEF3C7', icon: <Clock size={14} /> },
    sending: { label: 'Enviando', color: '#8B5CF6', bg: '#EDE9FE', icon: <Send size={14} /> },
    sent: { label: 'Enviada', color: '#3B82F6', bg: '#DBEAFE', icon: <Send size={14} /> },
    approved: { label: 'Aprovada', color: '#10B981', bg: '#D1FAE5', icon: <CheckCircle size={14} /> },
    denied: { label: 'Negada', color: '#EF4444', bg: '#FEE2E2', icon: <XCircle size={14} /> }
};

const TABS = [
    { id: 'draft', label: 'Rascunho' },
    { id: 'ready', label: 'Prontas' },
    { id: 'sending', label: 'Enviando' },
    { id: 'sent', label: 'Enviadas' },
    { id: 'approved', label: 'Aprovadas' },
    { id: 'denied', label: 'Negadas' },
];

function StatusBadge({ status }: { status: CommunicationStatus }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <Chip
            size="small"
            icon={config.icon as ReactNode}
            label={config.label}
            sx={{
                bgcolor: config.bg,
                color: config.color,
                fontWeight: 600,
                borderRadius: 1.5,
                '& .MuiChip-icon': { color: config.color }
            }}
        />
    );
}

export const AutorizacoesTab = ({ month, year }: AutorizacoesTabProps) => {
    const [activeTab, setActiveTab] = useState<CommunicationStatus>('draft');
    const [authorizations, setAuthorizations] = useState<CommunicationRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAuthorization, setSelectedAuthorization] = useState<CommunicationRequest | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        patientId: '',
        insuranceProvider: '',
        specialty: '',
        requestedSessions: '',
        notes: ''
    });

    const { patients } = usePatients();
    const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });

    const selectedMonthYear = `${year}-${String(month).padStart(2, '0')}`;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCommunications({
                status: activeTab,
                purpose: 'authorization',
                month: selectedMonthYear,
                limit: 100
            });
            setAuthorizations(res.data.data || []);
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao carregar autorizações'));
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedMonthYear]);

    useEffect(() => {
        load();
    }, [activeTab, month, year, load]);

    const handleOpenDrawer = (auth: CommunicationRequest) => {
        setSelectedAuthorization(auth);
        setDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedAuthorization(null);
    };

    const handleSent = () => {
        handleCloseDrawer();
        load();
    };

    const handleCreate = async () => {
        if (!formData.patientId || !formData.insuranceProvider) {
            toast.warn('Paciente e convênio são obrigatórios');
            return;
        }
        setCreating(true);
        try {
            await createCommunication({
                patientId: formData.patientId,
                insuranceProvider: formData.insuranceProvider,
                purpose: 'authorization',
                specialty: formData.specialty || undefined,
                requestedSessions: formData.requestedSessions ? Number(formData.requestedSessions) : undefined,
                notes: formData.notes
            });
            toast.success('Autorização criada!');
            setCreateModalOpen(false);
            setFormData({ patientId: '', insuranceProvider: '', specialty: '', requestedSessions: '', notes: '' });
            load();
        } catch (error) {
            toast.error(extractErrorMessage(error, 'Erro ao criar autorização'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <Box>
            {/* Header */}
            <div className="mb-4 rounded-2xl border border-gray-100 shadow-sm bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#8B5CF6' }}>
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Central de Autorizações</h2>
                        <p className="text-sm text-gray-500">Envio e acompanhamento de autorizações de convênio</p>
                    </div>
                </div>
                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setCreateModalOpen(true)}
                    sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, borderRadius: 2, textTransform: 'none' }}
                >
                    Nova Autorização
                </Button>
            </div>

            {/* Sub-tabs */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 pt-3 pb-3 border-b border-gray-100">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as CommunicationStatus)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                                    activeTab === tab.id
                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Box sx={{ p: 3 }}>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} variant="rounded" height={90} />
                            ))}
                        </div>
                    ) : authorizations.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhuma autorização {STATUS_CONFIG[activeTab]?.label.toLowerCase()}
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {authorizations.map((auth) => (
                                <Card
                                    key={auth._id}
                                    elevation={0}
                                    sx={{
                                        borderRadius: 3,
                                        border: '1.5px solid #E2E8F0',
                                        overflow: 'hidden',
                                        '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }
                                    }}
                                >
                                    <CardContent sx={{ p: 2.5 }}>
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar sx={{ bgcolor: '#E0E7FF', color: '#4F46E5', width: 40, height: 40 }}>
                                                    {auth.patientName?.charAt(0) || '?'}
                                                </Avatar>
                                                <div>
                                                    <Typography fontWeight={700} fontSize="0.95rem" color="#0F172A">
                                                        {auth.patientName || 'Paciente'}
                                                    </Typography>
                                                    <Typography fontSize="0.82rem" color="#64748B">
                                                        {auth.insuranceName || auth.insuranceProvider} · {auth.specialty}
                                                        {auth.requestedSessions ? ` · ${auth.requestedSessions} sessões` : ''}
                                                    </Typography>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={auth.status} />
                                                {auth.lastEmailStatus === 'error' && (
                                                    <Chip
                                                        size="small"
                                                        label="Falha no envio"
                                                        sx={{
                                                            bgcolor: '#FEE2E2',
                                                            color: '#B91C1C',
                                                            fontWeight: 600,
                                                            borderRadius: 1.5
                                                        }}
                                                    />
                                                )}
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => handleOpenDrawer(auth)}
                                                    sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' }, borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    {['draft', 'ready'].includes(activeTab) ? 'Abrir' : 'Revisar'}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Box>
            </div>

            <DocumentSendDrawer
                open={drawerOpen}
                communication={selectedAuthorization}
                onClose={handleCloseDrawer}
                onSent={handleSent}
                purpose="authorization"
            />

            {/* Modal: Nova Autorização */}
            <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield className="w-5 h-5 text-purple-600" />
                        <Typography variant="h6">Nova Autorização</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Paciente *</InputLabel>
                            <Select
                                value={formData.patientId}
                                label="Paciente *"
                                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                            >
                                {patients.map((p) => (
                                    <MenuItem key={p._id} value={p._id}>{p.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Convênio *</InputLabel>
                            <Select
                                value={formData.insuranceProvider}
                                label="Convênio *"
                                disabled={loadingConvenios}
                                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                            >
                                <MenuItem value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</MenuItem>
                                {convenios.map((c) => (
                                    <MenuItem key={c._id} value={c.code}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Especialidade"
                            value={formData.specialty}
                            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                            placeholder="Ex: fonoaudiologia"
                        />
                        <TextField
                            fullWidth
                            type="number"
                            label="Sessões solicitadas"
                            value={formData.requestedSessions}
                            onChange={(e) => setFormData({ ...formData, requestedSessions: e.target.value })}
                        />
                        <TextField
                            fullWidth
                            label="Observações"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating}
                        startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
                        sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                    >
                        {creating ? 'Criando...' : 'Criar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AutorizacoesTab;
