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
    Tab,
    Tabs,
    TextField,
    Typography,
    Avatar,
    Card,
    CardContent,
    Grid,
    Collapse,
    Checkbox,
    CircularProgress
} from '@mui/material';
import { FinancialLoading, FinancialTableLoading } from '../components/FinancialLoading';
import { Patient360Modal } from '../components/Patient360Modal';
import {
    Building2,
    Calendar,
    Check,
    CheckCircle,
    Clock,
    DollarSign,
    FileText,
    Plus,
    Send,
    User,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import { PatientAccordionSection } from './PatientAccordionSection';
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
    receberConvenioLote
} from '../../../services/paymentService';
import { extractErrorMessage } from '../../../utils/errorUtils';

const INSURANCE_PROVIDERS = [
    'Unimed',
    'Bradesco Saúde',
    'SulAmérica',
    'Amil',
    'Notre Dame',
    'Hapvida',
    'Outro'
];

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; label: string }> = {
    pending_billing: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Aguardando Faturamento' },
    billed: { color: '#3B82F6', bgColor: '#3B82F610', label: 'Faturado' },
    received: { color: '#10B981', bgColor: '#10B98110', label: 'Recebido' },
    partial: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Recebido Parcial' },
    glosa: { color: '#EF4444', bgColor: '#EF444410', label: 'Glosado' }
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
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0, pendingCount: 0 });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [expandedPatients, setExpandedPatients] = useState<Record<string, boolean>>({});
    const [patientSpecialtyTabs, setPatientSpecialtyTabs] = useState<Record<string, string>>({});

    // Estados para seleção em lote
    const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);

    const [doctors, setDoctors] = useState<any[]>([]);
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
    const paymentMatchesMonth = (_payment: any) => true;

    const getMonthSummary = () => {
        // Usar allReceivables (todos os status) para os cards de resumo
        const allPayments = allReceivables.flatMap(g =>
            (g.patients || []).flatMap((p: any) =>
                (p.payments || []).filter(paymentMatchesMonth)
            )
        );
        const activeProviders = new Set(
            receivables
                .filter(g => (g.patients || []).some((p: any) => (p.payments || []).some(paymentMatchesMonth)))
                .map(g => g._id)
        ).size;
        const pendingPayments = allPayments.filter((p: any) => p.status === 'pending_billing');
        const billedPayments = allPayments.filter((p: any) => p.status === 'billed');
        const receivedPayments = allPayments.filter((p: any) => p.status === 'received');
        return {
            totalAFaturar: pendingPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            totalFaturado: billedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            totalRecebido: receivedPayments.reduce((s: number, p: any) => s + (p.grossAmount || 0), 0),
            pendingCount: pendingPayments.length + billedPayments.length,
            billedCount: billedPayments.length,
            totalProviders: activeProviders
        };
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };

    const togglePatient = (patientId: string) => {
        setExpandedPatients(prev => ({ ...prev, [patientId]: !prev[patientId] }));
    };

    const setPatientTab = (patientId: string, specialty: string) => {
        setPatientSpecialtyTabs(prev => ({ ...prev, [patientId]: specialty }));
    };

    const groupPaymentsBySpecialty = (payments: any[]) => {
        const grouped: Record<string, any[]> = {};
        payments.forEach(payment => {
            const specialty = payment.specialty || 'Outros';
            if (!grouped[specialty]) grouped[specialty] = [];
            grouped[specialty].push(payment);
        });
        return grouped;
    };

    const getSpecialtyLabel = (specialty: string) => {
        const labels: Record<string, string> = {
            fonoaudiologia: 'Fonoaudiologia',
            psicologia: 'Psicologia',
            terapia_ocupacional: 'Terapia Ocupacional',
            fisioterapia: 'Fisioterapia',
            psicomotricidade: 'Psicomotricidade',
            musicoterapia: 'Musicoterapia',
            psicopedagogia: 'Psicopedagogia',
            neuropsicologia: 'Neuropsicologia'
        };
        return labels[specialty] || specialty;
    };

    useEffect(() => {
        loadDoctors();
    }, []);

    useEffect(() => {
        loadReceivables(selectedMonthYear);
    }, [selectedMonthYear, subTab]);

    const loadReceivables = async (month?: string) => {
        setLoading(true);
        try {
            // 1. Buscar TODOS os dados (sem filtro de status) para contagens e cards
            const allResponse = await getInsuranceReceivables({ month });
            const allData = allResponse.data.data || [];
            setAllReceivables(allData);

            // 2. Buscar dados filtrados pela aba ativa para a lista
            const statusFilter = subTab === 0 ? 'pending_billing'
                : subTab === 1 ? 'billed'
                    : 'received';
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

            setSummary({
                totalProviders: validData.length,
                grandTotal: validData.reduce((acc: number, g: any) => acc + (g.totalPending || 0), 0),
                pendingCount: totalPending
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
        } catch (error) {
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
        } catch (error) {
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

    const filteredPatients = (patients: any[]) => {
        return patients.map(patient => {
            const filteredPayments = (patient.payments || []).filter((p: any) => {
                if (!paymentMatchesMonth(p)) return false;
                if (subTab === 0) return p.status === 'pending_billing';
                if (subTab === 1) return p.status === 'billed';
                return ['received', 'partial', 'glosa'].includes(p.status);
            });
            return {
                ...patient,
                payments: filteredPayments,
                total: filteredPayments.reduce((sum: number, p: any) => sum + (p.grossAmount || 0), 0)
            };
        }).filter((patient: any) => patient.payments.length > 0);
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const getGroupTotal = (group: any) => {
        const patients = filteredPatients(group.patients || []);
        return patients.reduce((sum: number, patient: any) =>
            sum + (patient.payments || []).reduce((pSum: number, p: any) => pSum + (p.grossAmount || 0), 0), 0
        );
    };

    const countByStatus = (data: InsuranceReceivableGroup[], status: string) => {
        // Usar allReceivables para as contagens das abas
        return allReceivables.reduce((sum, group) =>
            sum + (group.patients || []).reduce((pSum, patient) =>
                pSum + (patient.payments || []).filter((p: any) => p.status === status && paymentMatchesMonth(p)).length, 0
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

    const handleOpenFaturarLoteModal = () => {
        if (selectedPayments.size === 0) {
            toast.warn('Selecione pelo menos um atendimento');
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
            const result = await faturarConvenioLote({
                paymentIds: Array.from(selectedPayments),
                dataFaturamento: faturarLoteData.dataFaturamento,
                notaFiscal: faturarLoteData.notaFiscal || undefined
            });

            if (result.data.success) {
                toast.success(`${result.data.data.faturados} atendimentos faturados!`);
                setFaturarLoteModalOpen(false);
                clearAllSelection();
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

            {/* Filtro de Mês */}
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

            {/* Cards de Resumo */}
            <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                {(() => {
                    const ms = getMonthSummary();
                    return (
                        <>
                            <Grid item xs={12} md={4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B20', borderRadius: 2 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                                                <Clock className="w-5 h-5 text-white" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    A Faturar no Mês
                                                </Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#F59E0B">
                                                    {ms.totalAFaturar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {ms.pendingCount} atendimento{ms.pendingCount !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#3B82F620', borderRadius: 2 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#3B82F6', width: 40, height: 40 }}>
                                                <Send className="w-5 h-5 text-white" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Faturado (Aguardando Pagto.)
                                                </Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                                                    {ms.totalFaturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {ms.billedCount} atendimento{ms.billedCount !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#10B98120', borderRadius: 2 }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                                                <DollarSign className="w-5 h-5 text-white" />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Recebido no Mês
                                                </Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#10B981">
                                                    {ms.totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {receivedPayments.length} atendimento{receivedPayments.length !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </>
                    );
                })()}
            </Grid>

            {/* Sub-tabs */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Tabs
                    value={subTab}
                    onChange={(_, v) => setSubTab(v)}
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}
                >
                    <Tab
                        icon={<Clock size={16} />}
                        iconPosition="start"
                        label={`A Faturar (${countByStatus(receivables, 'pending_billing')})`}
                    />
                    <Tab
                        icon={<Send size={16} />}
                        iconPosition="start"
                        label={`Faturados (${countByStatus(receivables, 'billed')})`}
                    />
                    <Tab
                        icon={<CheckCircle size={16} />}
                        iconPosition="start"
                        label={`Recebidos (${countByStatus(receivables, 'received')})`}
                    />
                </Tabs>

                {/* Barra de Ações em Lote */}
                {selectedPayments.size > 0 && (
                    <Paper elevation={2} sx={{ p: 2, m: 2, bgcolor: '#F0F9FF', border: '1px solid #3B82F6' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="body1" fontWeight={600} color="#3B82F6">
                                {selectedPayments.size} atendimento(s) selecionado(s)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={clearAllSelection}
                                >
                                    Limpar
                                </Button>
                                {subTab === 0 && (
                                    <>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<Send size={16} />}
                                            onClick={handleOpenFaturarLoteModal}
                                            sx={{ bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' } }}
                                        >
                                            Faturar Selecionados
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            startIcon={<CheckCircle size={16} />}
                                            onClick={handleOpenReceberLoteModal}
                                            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                                        >
                                            Receber Selecionados
                                        </Button>
                                    </>
                                )}
                                {subTab === 1 && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<CheckCircle size={16} />}
                                        onClick={handleOpenReceberLoteModal}
                                        sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                                    >
                                        Receber Selecionados
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Paper>
                )}

                <Box sx={{ p: 3 }}>
                    {loading ? (
                        <FinancialTableLoading rowCount={4} colSpan={1} />
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
                                    <Card key={group._id} variant="outlined" sx={{ width: "100%", borderRadius: 2, overflow: 'hidden' }}>
                                        {/* Header do Convênio */}
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: '#F9FAFB',
                                                borderBottom: isExpanded ? '1px solid' : 'none',
                                                borderColor: 'grey.200',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: '#F3F4F6' }
                                            }}
                                            onClick={() => toggleGroup(group._id)}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32 }}>
                                                    <Building2 className="w-4 h-4 text-white" />
                                                </Avatar>
                                                <Box>
                                                    <Typography fontWeight="600">{group._id}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {patientsToShow.reduce((sum, p) => sum + (p.payments?.length || 0), 0)} atendimentos • {patientsToShow.length} paciente(s)
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Chip
                                                    size="small"
                                                    label={`R$ ${groupTotal.toLocaleString('pt-BR')}`}
                                                    sx={{ bgcolor: '#3B82F6', color: 'white', fontWeight: 'bold' }}
                                                />
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </Box>
                                        </Box>

                                        {/* Lista de Pacientes com Accordion e Tabs */}
                                        <Collapse in={isExpanded}>
                                            <div className="divide-y">
                                                {patientsToShow.map((patient) => (
                                                    <PatientAccordionSection
                                                        key={patient.patientId}
                                                        patient={patient}
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
            </Paper>

            {/* Modal: Faturar em Lote */}
            <Dialog open={faturarLoteModalOpen} onClose={() => !faturarLoteLoading && setFaturarLoteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#F59E0B', width: 32, height: 32 }}>
                            <Send className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Faturar Atendimentos Selecionados</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {selectedPayments.size} atendimento(s) serão faturados
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
                                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                            >
                                {INSURANCE_PROVIDERS.map((p) => (
                                    <MenuItem key={p} value={p}>{p}</MenuItem>
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
