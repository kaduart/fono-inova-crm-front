// src/pages/Financial/tabs/InsuranceTab.tsx

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
    Avatar,
    Card,
    CardContent,
    Grid,
    Collapse,
    CircularProgress,
    Skeleton,
} from '@mui/material';
import { Patient360Modal } from '../components/Patient360Modal';
import {
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    Plus,
    Send,
    ChevronDown,
    ChevronUp,
    TrendingUp,
    TrendingDown,
    History
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import { PatientAccordionSection } from './PatientAccordionSection';
import GuidePendingBillingSection, { PendingGuide } from './GuidePendingBillingSection';
import InsuranceHistorySection from './InsuranceHistorySection';
import ConvenioManagerModal from '../components/ConvenioManagerModal';
import doctorService from '../../../services/doctorService';
import { usePatients } from '../../../hooks/usePatients';
import {
    createInsurancePayment,
    getInsuranceReceivables,
    InsuranceReceivableGroup,
    billInsuranceSession,
    receiveInsuranceSession,
    faturarConvenioLote,
    receberConvenioLote,
    getPendingBillingGuides
} from '../../../services/paymentService';
import { extractErrorMessage } from '../../../utils/errorUtils';
import { useConvenios } from '../../../hooks/useConvenios';

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    pending_billing: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Aguardando Faturamento' },
    billed: { color: '#3B82F6', bgColor: '#3B82F610', label: 'Faturado' },
    received: { color: '#10B981', bgColor: '#10B98110', label: 'Recebido' },
    partial: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Recebido Parcial' },
    glosa: { color: '#EF4444', bgColor: '#EF444410', label: 'Glosado' }
};

const formatProviderName = (slug: string) => {
  if (!slug) return 'Outros';
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace('Anapolis', 'Anápolis')
    .replace('Goiania', 'Goiânia')
    .replace('Sao ', 'São ')
    .replace('Saude', 'Saúde')
    .replace('Brasilia', 'Brasília');
};

interface InsuranceTabProps {
    month: number;
    year: number;
}

const InsuranceTab = ({ month, year }: InsuranceTabProps) => {
    const [subTab, setSubTab] = useState(0);
    const [receivables, setReceivables] = useState<InsuranceReceivableGroup[]>([]);
    const [allReceivables, setAllReceivables] = useState<InsuranceReceivableGroup[]>([]); // Todos os status para os cards
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0, pendingCount: 0, prevMonthTotal: null as number | null, change: null as number | null, changePercent: null as number | null });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Estados para seleção em lote
    const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
    const [selectedGuides, setSelectedGuides] = useState<Set<string>>(new Set());
    const [pendingGuides, setPendingGuides] = useState<PendingGuide[]>([]);
    const [orphanSessions, setOrphanSessions] = useState<Array<{ sessionId: string; date?: string | Date | null; patient?: { fullName?: string } | null; specialty?: string; sessionValue?: number; insuranceProvider?: string }>>([]);
    const [loadingGuides, setLoadingGuides] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const [doctors, setDoctors] = useState<any[]>([]);
    const { convenios, isLoading: loadingConvenios } = useConvenios({ includeInactive: false });
    const [formData, setFormData] = useState({
        patientId: '',
        doctorId: '',
        insuranceProvider: '',
        grossAmount: 0,
        authorizationCode: '',
        serviceType: 'session',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
    });
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [receiveData, setReceiveData] = useState({
        receivedAmount: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);
    const [selectedMonthYear, setSelectedMonthYear] = useState(`${year}-${String(month).padStart(2, '0')}`);
    const [cardsOpen, setCardsOpen] = useState(false);

    useEffect(() => {
        setSelectedMonthYear(`${year}-${String(month).padStart(2, '0')}`);
    }, [month, year]);

    // Estados para modal de faturamento em lote
    const [faturarLoteModalOpen, setFaturarLoteModalOpen] = useState(false);
    const [faturarLoteLoading, setFaturarLoteLoading] = useState(false);
    const [faturarLoteData, setFaturarLoteData] = useState({
        dataFaturamento: new Date().toISOString().split('T')[0],
        notaFiscal: ''
    });

    // Estados para modal de recebimento em lote
    const [receberLoteModalOpen, setReceberLoteModalOpen] = useState(false);
    const [receberLoteLoading, setReceberLoteLoading] = useState(false);
    const [receberLoteData, setReceberLoteData] = useState({
        dataRecebimento: new Date().toISOString().split('T')[0]
    });
    
    // Estado para modal de gerenciamento de convênios
    const [convenioManagerOpen, setConvenioManagerOpen] = useState(false);

    const getMonthLabel = () => {
        if (!selectedMonthYear) return '';
        const [year, month] = selectedMonthYear.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    };

    // Backend já filtra pelo campo correto de cada status (paymentDate/billedAt/receivedAt)
    // Frontend não deve refiltrar por paymentDate
    const paymentMatchesMonth = () => true;

    const getMonthSummary = () => {
        // Aba "A Faturar" usa modelo guide-based (guias + sessões sem guia)
        const guidePendingTotal = pendingGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingValue || 0), 0);
        const orphanTotal = orphanSessions.reduce((s: number, os) => s + (os.sessionValue || 0), 0);
        const totalAFaturar = guidePendingTotal + orphanTotal;
        const pendingCount = pendingGuides.reduce((s: number, g: PendingGuide) => s + (g.pendingSessions || 0), 0) + orphanSessions.length;

        // Outros status vêm do legado (será substituído por endpoint guide-based futuramente)
        const allPayments = allReceivables.flatMap(g =>
            (g.patients || []).flatMap((p: any) =>
                (p.payments || []).filter(paymentMatchesMonth)
            )
        );
        const billedPayments = allPayments.filter((p: any) => p.status === 'billed');
        const receivedPayments = allPayments.filter((p: any) => p.status === 'received');

        const activeProviders = new Set([
            ...pendingGuides.map(g => g.insurance),
            ...allReceivables.map(g => g._id)
        ]).size;

        return {
            totalAFaturar,
            totalFaturado: billedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            totalRecebido: receivedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            pendingCount,
            billedCount: billedPayments.length,
            receivedCount: receivedPayments.length,
            totalProviders: activeProviders
        };
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };



    useEffect(() => {
        loadDoctors();
    }, []);

    useEffect(() => {
        loadReceivables(selectedMonthYear);
    }, [selectedMonthYear, subTab]);

    useEffect(() => {
        const handleRefresh = () => loadReceivables(selectedMonthYear);
        window.addEventListener('cash:refresh', handleRefresh);
        return () => window.removeEventListener('cash:refresh', handleRefresh);
    }, [selectedMonthYear, subTab]);

    const loadReceivables = async (month?: string) => {
        // Aba A Faturar usa guias pendentes (guide-based)
        if (subTab === 0) {
            await loadPendingGuides(month);
            return;
        }

        setLoading(true);
        try {
            // 1. Buscar TODOS os dados (sem filtro de status) para contagens e cards
            const allResponse = await getInsuranceReceivables({ month });
            const allData = allResponse.data.data || [];
            setAllReceivables(allData);

            // 2. Buscar dados filtrados pela aba ativa para a lista
            const statusFilter = subTab === 1 ? 'billed' : 'received';
            const response = await getInsuranceReceivables({ month, status: statusFilter });
            const data = response.data.data || [];

            // 🆕 CORREÇÃO: Não filtrar novamente - backend já retorna dados corretos
            // Apenas garante estrutura válida
            const validData = (data || []).map((group: any) => ({
                ...group,
                patients: (group.patients || []).map((p: any) => ({
                    ...p,
                    payments: p.payments || []
                })).filter((p: any) => (p.payments || []).length > 0)
            })).filter((group: any) => (group.patients || []).length > 0);

            setReceivables(validData);

            const totalPending = validData.reduce((acc: number, g: any) =>
                acc + (g.patients || []).reduce((pAcc: number, p: any) =>
                    pAcc + (p.payments || []).filter((pay: any) => pay.status !== 'received').length, 0
                ), 0
            );

            const apiSummary = allResponse.data.summary || {};
            setSummary({
                totalProviders: validData.length,
                grandTotal: validData.reduce((acc: number, g: any) => acc + (g.totalPending || 0), 0),
                pendingCount: totalPending,
                prevMonthTotal: apiSummary.prevMonthTotal ?? null,
                change: apiSummary.change ?? null,
                changePercent: apiSummary.changePercent ?? null
            });

            const expanded: Record<string, boolean> = {};
            validData.forEach((g: any) => { expanded[g._id] = true; });
            setExpandedGroups(expanded);
        } catch (error) {
            console.error('Erro ao carregar recebíveis:', error);
            toast.error('Erro ao carregar dados de convênios');
        } finally {
            setLoading(false);
        }
    };

    // 🆕 Guide-based: carregar guias pendentes de faturamento (aba A Faturar)
    const loadPendingGuides = async (month?: string) => {
        setLoadingGuides(true);
        try {
            const response = await getPendingBillingGuides({ month, limit: 100 });
            setPendingGuides(response.data.data || []);
            setOrphanSessions(response.data.orphanSessions || []);
        } catch (error) {
            console.error('Erro ao carregar guias pendentes:', error);
            toast.error('Erro ao carregar guias pendentes');
        } finally {
            setLoadingGuides(false);
        }
    };

    const toggleGuideSelection = (guideId: string) => {
        const newSelected = new Set(selectedGuides);
        if (newSelected.has(guideId)) {
            newSelected.delete(guideId);
        } else {
            newSelected.add(guideId);
        }
        setSelectedGuides(newSelected);
    };

    const clearGuideSelection = () => setSelectedGuides(new Set());

    const selectAllGuides = () => {
        setSelectedGuides(new Set(pendingGuides.map(g => g.guideId)));
    };

    // Hook para pacientes
    const { patients } = usePatients();

    const loadDoctors = async () => {
        try {
            const doctorsRes = await doctorService.getAllDoctors();
            setDoctors(doctorsRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar doutores:', error);
        }
    };

    const handleCreateInsurance = async () => {
        if (!formData.patientId || !formData.doctorId || !formData.insuranceProvider || !formData.grossAmount || !formData.paymentDate) {
            toast.warn('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setLoading(true);
            await createInsurancePayment(formData);
            toast.success('Atendimento de convênio registrado! 💚');
            setIsNewModalOpen(false);
            setFormData({
                patientId: '',
                doctorId: '',
                insuranceProvider: '',
                grossAmount: 0,
                authorizationCode: '',
                serviceType: 'session',
                notes: '',
                paymentDate: new Date().toISOString().split('T')[0]
            });
            loadReceivables(selectedMonthYear);
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao registrar'));
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsBilled = async (payment: any) => {
        if (!payment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }
        try {
            await billInsuranceSession(payment.sessionId);
            toast.success('Marcado como faturado!');
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao faturar');
        }
    };

    const handleReceive = async () => {
        if (!selectedPayment) return;
        if (!selectedPayment.sessionId) {
            toast.error('Sessão não encontrada para este pagamento');
            return;
        }

        try {
            await receiveInsuranceSession(selectedPayment.sessionId, {
                receivedAmount: receiveData.receivedAmount || selectedPayment.grossAmount,
                receivedDate: receiveData.receivedDate
            });
            toast.success('Recebimento registrado! 💚');
            setReceiveModalOpen(false);
            setSelectedPayment(null);
            loadReceivables(selectedMonthYear);
        } catch {
            toast.error('Erro ao registrar recebimento');
        }
    };

    const getStatusChip = (status: string) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending_billing;
        return (
            <Chip
                size="small"
                label={config.label}
                sx={{
                    bgcolor: config.bgColor,
                    color: config.color,
                    borderColor: config.color,
                    fontWeight: 500
                }}
                variant="outlined"
            />
        );
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const countByStatus = (status: string) => {
        // Usar allReceivables para as contagens das abas
        return allReceivables.reduce((sum, group) =>
            sum + (group.patients || []).reduce((pSum, patient) =>
                pSum + (patient.payments || []).filter((p: any) => p.status === status && paymentMatchesMonth()).length, 0
            ), 0
        );
    };

    // Funções para seleção em lote
    const togglePaymentSelection = (paymentId: string) => {
        const newSelected = new Set(selectedPayments);
        if (newSelected.has(paymentId)) {
            newSelected.delete(paymentId);
        } else {
            newSelected.add(paymentId);
        }
        setSelectedPayments(newSelected);
    };

    const selectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            if (subTab === 0 && p.status === 'pending_billing') {
                newSelected.add(p.paymentId);
            } else if (subTab === 1 && p.status === 'billed') {
                newSelected.add(p.paymentId);
            } else if (subTab === 2 && ['received', 'partial', 'glosa'].includes(p.status)) {
                newSelected.add(p.paymentId);
            }
        });
        setSelectedPayments(newSelected);
    };

    const deselectAllFromPatient = (patient: any) => {
        const newSelected = new Set(selectedPayments);
        patient.payments.forEach((p: any) => {
            newSelected.delete(p.paymentId);
        });
        setSelectedPayments(newSelected);
    };

    const clearAllSelection = () => {
        setSelectedPayments(new Set());
    };

    const selectAll = () => {
        const newSelected = new Set<string>();
        receivables.forEach(group => {
            (group.patients || []).forEach((patient: any) => {
                (patient.payments || []).forEach((p: any) => {
                    if (subTab === 0 && p.status === 'pending_billing') newSelected.add(p.paymentId);
                    else if (subTab === 1 && p.status === 'billed') newSelected.add(p.paymentId);
                    else if (subTab === 2 && ['received', 'partial', 'glosa'].includes(p.status)) newSelected.add(p.paymentId);
                });
            });
        });
        setSelectedPayments(newSelected);
    };

    const totalSelectable = subTab === 0
        ? pendingGuides.length
        : receivables.reduce((sum, group) =>
            sum + (group.patients || []).reduce((pSum: number, patient: any) =>
                pSum + (patient.payments || []).filter((p: any) =>
                    subTab === 1 ? p.status === 'billed'
                    : ['received', 'partial', 'glosa'].includes(p.status)
                ).length, 0
            ), 0
        );

    const handleOpenFaturarLoteModal = () => {
        const isGuideMode = subTab === 0;
        const hasSelection = isGuideMode ? selectedGuides.size > 0 : selectedPayments.size > 0;
        if (!hasSelection) {
            toast.warn(isGuideMode ? 'Selecione pelo menos uma guia' : 'Selecione pelo menos um atendimento');
            return;
        }
        setFaturarLoteData({
            dataFaturamento: new Date().toISOString().split('T')[0],
            notaFiscal: ''
        });
        setFaturarLoteModalOpen(true);
    };

    const handleFaturarLote = async () => {
        setFaturarLoteLoading(true);
        try {
            const isGuideMode = subTab === 0;
            const result = await faturarConvenioLote({
                ...(isGuideMode
                    ? { guideIds: Array.from(selectedGuides) }
                    : { paymentIds: Array.from(selectedPayments) }),
                dataFaturamento: faturarLoteData.dataFaturamento,
                notaFiscal: faturarLoteData.notaFiscal || undefined
            });

            if (result.data.success) {
                const data = result.data.data;
                if (isGuideMode) {
                    toast.success(`${data.sessionsFaturadas} atendimentos faturados a partir de ${data.guidesFaturadas} guia(s)!`);
                } else {
                    const { faturados, ignorados } = data;
                    toast.success(`${faturados} atendimentos faturados!`);
                    if (ignorados > 0) {
                        toast.warn(`${ignorados} atendimento(s) sem sessão vinculada foram ignorados — verifique o cadastro.`);
                    }
                }
                setFaturarLoteModalOpen(false);
                clearAllSelection();
                clearGuideSelection();
                loadReceivables(selectedMonthYear);
            } else {
                toast.error(result.data.error || 'Erro ao faturar');
            }
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao faturar em lote'));
        } finally {
            setFaturarLoteLoading(false);
        }
    };

    const handleOpenReceberLoteModal = () => {
        if (selectedPayments.size === 0) {
            toast.warn('Selecione pelo menos um atendimento');
            return;
        }
        setReceberLoteData({ dataRecebimento: new Date().toISOString().split('T')[0] });
        setReceberLoteModalOpen(true);
    };

    const handleReceberLote = async () => {
        setReceberLoteLoading(true);
        try {
            const result = await receberConvenioLote({
                paymentIds: Array.from(selectedPayments),
                dataRecebimento: receberLoteData.dataRecebimento
            });

            if (result.data.success) {
                toast.success(`${result.data.data.recebidos} recebimento(s) registrado(s) com sucesso!`);
                setReceberLoteModalOpen(false);
                clearAllSelection();
                loadReceivables(selectedMonthYear);
            } else {
                toast.error(result.data.error || 'Erro ao receber');
            }
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao receber em lote'));
        } finally {
            setReceberLoteLoading(false);
        }
    };

    if (loading && receivables.length === 0) {
        return (
            <Box>
                <Grid container spacing={2} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                    {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                        <Grid size={{ xs: 12, md: 4 }} key={i}>
                            <Card elevation={0} sx={{ border: `1px solid ${c.color}20`, borderRadius: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="text" width="55%" height={20} />
                                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                                            <Skeleton variant="text" width="45%" height={16} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
                <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                        {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                            <Skeleton key={i} variant="rounded" width={145} height={36} sx={{ bgcolor: `${c.color}15` }} />
                        ))}
                    </Box>
                    <Box sx={{ p: 3 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <Avatar sx={{ bgcolor: '#3B82F6', width: 48, height: 48 }}>
                        <Building2 className="w-6 h-6 text-white" />
                    </Avatar>
                    <div>
                        <Typography variant="h5" fontWeight="bold">
                            Gestão de Convênios
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Controle de faturamento e recebimentos
                        </Typography>
                    </div>
                </div>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Building2 size={18} />}
                        onClick={() => setConvenioManagerOpen(true)}
                        sx={{
                            borderRadius: 2,
                            px: { xs: 2, md: 3 },
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Gerenciar Convênios
                    </Button>
                    
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={() => setIsNewModalOpen(true)}
                        sx={{
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            px: { xs: 2, md: 3 },
                            py: { xs: 1, md: 1 },
                            fontSize: { xs: '0.875rem', md: '0.9375rem' },
                            whiteSpace: 'nowrap',
                            '&:hover': {
                                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            },
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Novo Atendimento
                    </Button>
                </Box>
            </div>

            {/* Filtro de Mês — oculto no Histórico (tem seu próprio seletor de ano) */}
            {subTab !== 3 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Calendar size={18} />
                        <Typography variant="body2" fontWeight={500}>Período:</Typography>
                    </Box>
                    <TextField
                        type="month"
                        label="Mês de referência"
                        value={selectedMonthYear}
                        onChange={(e) => setSelectedMonthYear(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ width: 200 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {getMonthLabel()}
                    </Typography>
                </Box>
            )}

            {/* Cards de Resumo — accordion default fechado */}
            {(() => {
                const ms = getMonthSummary();
                const prodTotal = ms.totalAFaturar + ms.totalFaturado + ms.totalRecebido;
                return (
                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                        {/* Header clicável */}
                        <button
                            onClick={() => setCardsOpen(o => !o)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-4 flex-wrap">
                                <span className="text-sm font-semibold text-gray-700">Resumo do mês</span>
                                <span className="text-sm text-purple-700 font-bold">
                                    {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} produção
                                </span>
                                <span className="text-sm text-amber-600">
                                    {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} a faturar
                                </span>
                                {ms.totalRecebido > 0 && (
                                    <span className="text-sm text-emerald-600 font-semibold">
                                        {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} recebido
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${cardsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <Collapse in={cardsOpen}>
                            <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', p: { xs: 2, sm: 2.5, md: 3 } }}>
                                {/* Produção Total */}
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <div className="rounded-2xl border-2 p-5 shadow-sm h-full" style={{ borderColor: '#6366F1', backgroundColor: '#F5F3FF' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-purple-700">🏥 Produção Total</span>
                                            {summary.changePercent !== null && (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${(summary.change ?? 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {(summary.change ?? 0) >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                                    {(summary.change ?? 0) >= 0 ? '+' : ''}{summary.changePercent}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-3xl font-black text-gray-900 tracking-tight my-2">
                                            {prodTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount + ms.receivedCount} atendimentos</p>
                                        {summary.prevMonthTotal !== null && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                Mês anterior: <span className="font-semibold text-gray-600">{summary.prevMonthTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                            </p>
                                        )}
                                    </div>
                                </Grid>

                                {/* A Faturar */}
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <div className="rounded-2xl border-2 p-5 shadow-sm h-full" style={{ borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-amber-700">⏳ A Faturar</span>
                                        </div>
                                        <div className="text-3xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.pendingCount} atendimentos</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {pendingGuides.length} guia(s) + {orphanSessions.length} sem guia
                                        </p>
                                    </div>
                                </Grid>

                                {/* Faturado */}
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <div className="rounded-2xl border-2 p-5 shadow-sm h-full" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-blue-700">📤 Faturado</span>
                                        </div>
                                        <div className="text-3xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.billedCount} atendimentos</p>
                                        <p className="text-xs text-gray-400 mt-1">Aguardando pagamento do convênio</p>
                                    </div>
                                </Grid>

                                {/* Recebido */}
                                <Grid size={{ xs: 12, md: 3 }}>
                                    <div className="rounded-2xl border-2 p-5 shadow-sm h-full" style={{ borderColor: '#10B981', backgroundColor: '#F0FDF4' }}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black uppercase tracking-widest text-emerald-700">✅ Recebido</span>
                                        </div>
                                        <div className="text-3xl font-black text-gray-900 tracking-tight my-2">
                                            {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </div>
                                        <p className="text-sm text-gray-500">{ms.receivedCount} atendimentos</p>
                                        <p className="text-xs text-gray-400 mt-1">Repasse recebido do convênio</p>
                                    </div>
                                </Grid>
                            </Grid>
                        </Collapse>
                    </div>
                );
            })()}

            {/* Sub-tabs */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-3 pt-3 pb-3 border-b border-gray-100">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {[
                            { label: `A Faturar (${pendingGuides.length})`,         icon: <Clock size={15} /> },
                            { label: `Faturados (${countByStatus('billed')})`,      icon: <Send size={15} /> },
                            { label: `Recebidos (${countByStatus('received')})`,    icon: <CheckCircle size={15} /> },
                            { label: 'Histórico',                                   icon: <History size={15} /> },
                        ].map((tab, i) => (
                            <button key={i} onClick={() => setSubTab(i)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                                    subTab === i
                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Barra de Ações em Lote — sempre visível quando há itens na aba */}
                {totalSelectable > 0 && (
                    <Paper elevation={(subTab === 0 ? selectedGuides.size : selectedPayments.size) > 0 ? 2 : 0} sx={{
                        p: 1.5, mx: 2, mt: 1.5,
                        bgcolor: (subTab === 0 ? selectedGuides.size : selectedPayments.size) > 0 ? '#F0F9FF' : '#F9FAFB',
                        border: `1px solid ${(subTab === 0 ? selectedGuides.size : selectedPayments.size) > 0 ? '#3B82F6' : '#E5E7EB'}`,
                        borderRadius: 2
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                {subTab === 0 ? (
                                    <Button
                                        size="small"
                                        variant={selectedGuides.size === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedGuides.size === totalSelectable ? clearGuideSelection : selectAllGuides}
                                        sx={{ borderRadius: 2, fontSize: '0.8rem' }}
                                    >
                                        {selectedGuides.size === totalSelectable
                                            ? 'Desmarcar Todos'
                                            : `Selecionar Todos (${totalSelectable})`}
                                    </Button>
                                ) : (
                                    <Button
                                        size="small"
                                        variant={selectedPayments.size === totalSelectable ? 'contained' : 'outlined'}
                                        startIcon={<Check size={15} />}
                                        onClick={selectedPayments.size === totalSelectable ? clearAllSelection : selectAll}
                                        sx={{ borderRadius: 2, fontSize: '0.8rem' }}
                                    >
                                        {selectedPayments.size === totalSelectable
                                            ? 'Desmarcar Todos'
                                            : `Selecionar Todos (${totalSelectable})`}
                                    </Button>
                                )}
                                {(subTab === 0 ? selectedGuides.size : selectedPayments.size) > 0 && (
                                    <>
                                        <Typography variant="body2" fontWeight={600} color="#3B82F6">
                                            {subTab === 0 ? selectedGuides.size : selectedPayments.size} selecionado(s)
                                        </Typography>
                                        <Button size="small" variant="text" onClick={subTab === 0 ? clearGuideSelection : clearAllSelection} sx={{ fontSize: '0.75rem' }}>
                                            Limpar
                                        </Button>
                                    </>
                                )}
                            </Box>
                            {(subTab === 0 ? selectedGuides.size : selectedPayments.size) > 0 && (
                                <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    {subTab === 0 && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Send size={16} />}
                                            onClick={handleOpenFaturarLoteModal}
                                            sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, borderRadius: 2 }}
                                        >
                                            Faturar Guias Selecionadas
                                        </Button>
                                    )}
                                    {subTab === 1 && (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<CheckCircle size={16} />}
                                            onClick={handleOpenReceberLoteModal}
                                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2 }}
                                        >
                                            Receber Selecionados
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Paper>
                )}

                <Box sx={{ p: 3 }}>
                    {subTab === 3 ? (
                        <InsuranceHistorySection activeYear={year} activeMonth={month} />
                    ) : subTab === 0 ? (
                        <GuidePendingBillingSection
                            guides={pendingGuides}
                            selectedGuides={selectedGuides}
                            orphanSessions={orphanSessions}
                            loading={loadingGuides}
                            onToggleGuide={toggleGuideSelection}
                            onRefresh={() => loadReceivables(selectedMonthYear)}
                            month={selectedMonthYear}
                        />
                    ) : loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: '#F9FAFB' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                        <Box>
                                            <Skeleton variant="text" width={150} height={20} />
                                            <Skeleton variant="text" width={100} height={16} />
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                        <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                                    </Box>
                                </Box>
                            </Box>
                        ))
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhum atendimento de convênio
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 🆕 UX: Ordena convênios por valor total (maior primeiro) */}
                            {[...receivables]
                                .sort((a, b) => (b.totalPending || 0) - (a.totalPending || 0))
                                .map((group) => {
                                // 🆕 CORREÇÃO: Não filtrar novamente - backend já filtrou por status
                                const patientsToShow = (group.patients || [])
                                    .slice()
                                    .sort((a: any, b: any) => (b.total || 0) - (a.total || 0));
                                if (patientsToShow.length === 0) return null;
                                const groupTotal = group.totalPending || 0;
                                const isExpanded = expandedGroups[group._id] !== false;

                                return (
                                    <Card key={group._id} variant="outlined" sx={{ width: "100%", borderRadius: 2, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                        {/* Header do Convênio */}
                                        <Box
                                            sx={{
                                                px: 2.5,
                                                py: 1.75,
                                                background: 'linear-gradient(90deg, #EFF6FF 0%, #F9FAFB 100%)',
                                                borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                '&:hover': { background: 'linear-gradient(90deg, #DBEAFE 0%, #F3F4F6 100%)' }
                                            }}
                                            onClick={() => toggleGroup(group._id)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#2563EB', width: 36, height: 36 }}>
                                                    <Building2 className="w-4 h-4 text-white" />
                                                </Avatar>
                                                <Box>
                                                    <Typography fontWeight="700" fontSize="0.95rem" color="#1E40AF">
                                                        {formatProviderName(group._id)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {patientsToShow.reduce((sum, p) => sum + (p.payments?.length || 0), 0)} atendimentos • {patientsToShow.length} paciente{patientsToShow.length !== 1 ? 's' : ''}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Chip
                                                    size="small"
                                                    label={groupTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    sx={{ bgcolor: '#2563EB', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}
                                                />
                                                {isExpanded ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
                                            </Box>
                                        </Box>

                                        {/* Lista de Pacientes com Accordion e Tabs */}
                                        <Collapse in={isExpanded}>
                                            <div className="divide-y">
                                                {patientsToShow.map((patient) => (
                                                    <PatientAccordionSection
                                                        key={patient.patientId}
                                                        patient={patient}
                                                        provider={group._id}
                                                        onOpen360={handleOpen360}
                                                        onMarkAsBilled={handleMarkAsBilled}
                                                        onReceive={(payment) => {
                                                            setSelectedPayment(payment);
                                                            setReceiveData({
                                                                receivedAmount: payment.grossAmount,
                                                                receivedDate: new Date().toISOString().split('T')[0],
                                                                notes: ''
                                                            });
                                                            setReceiveModalOpen(true);
                                                        }}
                                                        getStatusChip={getStatusChip}
                                                        selectedPayments={selectedPayments}
                                                        onTogglePayment={togglePaymentSelection}
                                                        onSelectAllFromPatient={selectAllFromPatient}
                                                        onDeselectAllFromPatient={deselectAllFromPatient}
                                                        subTab={subTab}
                                                    />
                                                ))}
                                            </div>
                                        </Collapse>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Box>
            </div>

            {/* Modal: Faturar em Lote */}
            <Dialog open={faturarLoteModalOpen} onClose={() => !faturarLoteLoading && setFaturarLoteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#F59E0B', width: 32, height: 32 }}>
                            <Send className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">{subTab === 0 ? 'Faturar Guias Selecionadas' : 'Faturar Atendimentos Selecionados'}</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {subTab === 0
                                ? `${selectedGuides.size} guia(s) serão faturadas. Todas as sessões pendentes de cada guia serão incluídas, independentemente do mês.`
                                : `${selectedPayments.size} atendimento(s) serão faturados`}
                        </Typography>

                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Faturamento *"
                            value={faturarLoteData.dataFaturamento}
                            onChange={(e) => setFaturarLoteData({ ...faturarLoteData, dataFaturamento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />

                        <TextField
                            fullWidth
                            label="Nota Fiscal (opcional)"
                            placeholder="Número da NF"
                            value={faturarLoteData.notaFiscal}
                            onChange={(e) => setFaturarLoteData({ ...faturarLoteData, notaFiscal: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setFaturarLoteModalOpen(false)} disabled={faturarLoteLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleFaturarLote}
                        disabled={faturarLoteLoading}
                        startIcon={faturarLoteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                    >
                        {faturarLoteLoading ? 'Faturando...' : 'Confirmar Faturamento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Receber em Lote */}
            <Dialog open={receberLoteModalOpen} onClose={() => !receberLoteLoading && setReceberLoteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {selectedPayments.size} atendimento(s) serão marcados como recebidos.
                            O valor entra no caixa na data informada abaixo.
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento *"
                            value={receberLoteData.dataRecebimento}
                            onChange={(e) => setReceberLoteData({ dataRecebimento: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceberLoteModalOpen(false)} disabled={receberLoteLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleReceberLote}
                        disabled={receberLoteLoading}
                        startIcon={receberLoteLoading ? <CircularProgress size={16} color="inherit" /> : undefined}
                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                    >
                        {receberLoteLoading ? 'Registrando...' : 'Confirmar Recebimento'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Novo Atendimento */}
            <Dialog open={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32 }}>
                            <Building2 className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Novo Atendimento de Convênio</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Atendimento *"
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
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
                            <InputLabel>Profissional *</InputLabel>
                            <Select
                                value={formData.doctorId}
                                label="Profissional *"
                                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                            >
                                {doctors.map((d) => (
                                    <MenuItem key={d._id} value={d._id}>{d.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Convênio *</InputLabel>
                            <Select
                                value={formData.insuranceProvider}
                                label="Convênio *"
                                disabled={loadingConvenios}
                                onChange={(e) => {
                                    const selectedCode = e.target.value;
                                    const provider = convenios.find(c => c.code === selectedCode);
                                    setFormData({
                                        ...formData,
                                        insuranceProvider: selectedCode,
                                        grossAmount: provider?.sessionValue || formData.grossAmount
                                    });
                                }}
                            >
                                <MenuItem value="">{loadingConvenios ? 'Carregando...' : 'Selecione'}</MenuItem>
                                {convenios.map((p) => (
                                    <MenuItem key={p._id} value={p.code}>{p.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor da Tabela *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.grossAmount}
                                onChange={(e) => setFormData({ ...formData, grossAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            label="Código da Guia/Autorização"
                            value={formData.authorizationCode}
                            onChange={(e) => setFormData({ ...formData, authorizationCode: e.target.value })}
                            placeholder="Opcional"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsNewModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" onClick={handleCreateInsurance} disabled={loading} startIcon={<Check size={16} />} sx={{ bgcolor: '#3B82F6' }}>
                        Registrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Recebimento */}
            <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <CheckCircle className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2">
                            <strong>Paciente:</strong> {selectedPayment?.patientName}
                        </Typography>
                        <Typography variant="body2">
                            <strong>Valor esperado:</strong> R$ {selectedPayment?.grossAmount?.toLocaleString('pt-BR')}
                        </Typography>
                        <Box>
                            <Typography variant="body2" gutterBottom>Valor Recebido *</Typography>
                            <InputCurrency
                                name=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={receiveData.receivedAmount}
                                onChange={(e) => setReceiveData({ ...receiveData, receivedAmount: Number(e.target.value) })}
                            />
                        </Box>
                        <TextField
                            fullWidth
                            type="date"
                            label="Data do Recebimento"
                            value={receiveData.receivedDate}
                            onChange={(e) => setReceiveData({ ...receiveData, receivedDate: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceiveModalOpen(false)} variant="outlined">Cancelar</Button>
                    <Button variant="contained" color="success" onClick={handleReceive} startIcon={<CheckCircle size={16} />} sx={{ bgcolor: '#10B981' }}>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>

            {selectedPatient360Id && (
                <Patient360Modal
                    patientId={selectedPatient360Id}
                    open={is360ModalOpen}
                    onClose={() => setIs360ModalOpen(false)}
                />
            )}
            
            {/* Modal: Gerenciamento de Convênios */}
            <ConvenioManagerModal
                open={convenioManagerOpen}
                onClose={() => setConvenioManagerOpen(false)}
            />
        </Box>
    );
};

export default InsuranceTab;
