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
    Divider,
    Card,
    CardContent,
    Grid,
    IconButton,
    Tooltip,
    Alert,
    Collapse
} from '@mui/material';
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
    Receipt,
    Send,
    User,
    Filter,
    TrendingUp,
    AlertCircle,
    Download,
    ChevronDown,
    ChevronUp,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import { doctorService } from '../../../services/doctorService';
import { patientService } from '../../../services/patientService';
import {
    createInsurancePayment,
    getInsuranceReceivables,
    InsuranceReceivableGroup,
    markInsuranceAsBilled,
    receiveInsurancePayment
} from '../../../services/paymentService';

// Providers de convênio conhecidos
const INSURANCE_PROVIDERS = [
    'Unimed',
    'Bradesco Saúde',
    'SulAmérica',
    'Amil',
    'Notre Dame',
    'Hapvida',
    'Outro'
];

// Configuração de status com cores e ícones
const STATUS_CONFIG = {
    pending_billing: { 
        color: '#F59E0B', 
        bgColor: '#F59E0B10', 
        label: 'Aguardando Faturamento',
        icon: Clock,
        nextAction: 'Faturar'
    },
    billed: { 
        color: '#3B82F6', 
        bgColor: '#3B82F610', 
        label: 'Faturado',
        icon: Send,
        nextAction: 'Receber'
    },
    received: { 
        color: '#10B981', 
        bgColor: '#10B98110', 
        label: 'Recebido',
        icon: CheckCircle,
        nextAction: null
    },
    partial: { 
        color: '#F59E0B', 
        bgColor: '#F59E0B10', 
        label: 'Recebido Parcial',
        icon: AlertCircle,
        nextAction: 'Receber'
    },
    glosa: { 
        color: '#EF4444', 
        bgColor: '#EF444410', 
        label: 'Glosado',
        icon: XCircle,
        nextAction: null
    }
};

const InsuranceTab = () => {
    const [subTab, setSubTab] = useState(0);
    const [receivables, setReceivables] = useState<InsuranceReceivableGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0, pendingCount: 0 });
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Modal de novo atendimento
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);

    // Form state
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

    // Modal de recebimento
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [receiveData, setReceiveData] = useState({
        receivedAmount: 0,
        receivedDate: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };

    // Carregar dados
    useEffect(() => {
        loadReceivables();
        loadPatientsAndDoctors();
    }, []);

    const loadReceivables = async () => {
        setLoading(true);
        try {
            const response = await getInsuranceReceivables();
            const data = response.data.data || [];
            
            // Filtrar payments com grossAmount > 0 para não poluir a lista
            const filteredData = data.map((group: any) => ({
                ...group,
                payments: group.payments.filter((p: any) => p.grossAmount > 0 || p.status === 'billed')
            })).filter((group: any) => group.payments.length > 0);
            
            setReceivables(filteredData);
            
            const totalPending = filteredData.reduce((acc: number, g: any) => 
                acc + g.payments.filter((p: any) => p.status !== 'received').length, 0
            );
            
            setSummary({ 
                totalProviders: filteredData.length,
                grandTotal: filteredData.reduce((acc: number, g: any) => acc + g.totalPending, 0),
                pendingCount: totalPending 
            });

            // Inicializar todos os grupos como expandidos
            const expanded: Record<string, boolean> = {};
            filteredData.forEach((g: any) => { expanded[g._id] = true; });
            setExpandedGroups(expanded);
        } catch (error) {
            console.error('Erro ao carregar recebíveis:', error);
            toast.error('Erro ao carregar dados de convênios');
        } finally {
            setLoading(false);
        }
    };

    const loadPatientsAndDoctors = async () => {
        try {
            const [patientsData, doctorsRes] = await Promise.all([
                patientService.fetchAll(),
                doctorService.getAllDoctors()
            ]);
            setPatients(patientsData || []);
            setDoctors(doctorsRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar pacientes/doutores:', error);
        }
    };

    // Criar novo atendimento convênio
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
            loadReceivables();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao registrar');
        } finally {
            setLoading(false);
        }
    };

    // Marcar como faturado
    const handleMarkAsBilled = async (paymentId: string) => {
        try {
            await markInsuranceAsBilled(paymentId);
            toast.success('Marcado como faturado!');
            loadReceivables();
        } catch (error) {
            toast.error('Erro ao faturar');
        }
    };

    // Registrar recebimento
    const handleReceive = async () => {
        if (!selectedPayment) return;

        try {
            await receiveInsurancePayment(selectedPayment.paymentId, receiveData);
            toast.success('Recebimento registrado! 💚');
            setReceiveModalOpen(false);
            setSelectedPayment(null);
            loadReceivables();
        } catch (error) {
            toast.error('Erro ao registrar recebimento');
        }
    };

    const getStatusChip = (status: string) => {
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending_billing;
        const Icon = config.icon;
        
        return (
            <Chip 
                size="small" 
                icon={<Icon size={14} />}
                label={config.label}
                sx={{ 
                    bgcolor: config.bgColor,
                    color: config.color,
                    borderColor: config.color,
                    fontWeight: 500,
                    '& .MuiChip-icon': { color: config.color }
                }}
                variant="outlined"
            />
        );
    };

    // Filtrar payments baseado na subtab atual
    const filteredPayments = (payments: any[]) => {
        if (subTab === 0) return payments.filter(p => p.status === 'pending_billing');
        if (subTab === 1) return payments.filter(p => p.status === 'billed');
        return payments.filter(p => ['received', 'partial', 'glosa'].includes(p.status));
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Calcular totais por grupo para a subtab atual
    const getGroupTotalForCurrentTab = (group: any) => {
        const payments = filteredPayments(group.payments);
        return payments.reduce((sum, p) => sum + p.grossAmount, 0);
    };

    return (
        <Box>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
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

                <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setIsNewModalOpen(true)}
                    sx={{
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        px: 3,
                        py: 1,
                        '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1e40af)' }
                    }}
                >
                    Novo Atendimento
                </Button>
            </div>

            {/* Cards de Resumo */}
            <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#3B82F620', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: '#3B82F6', width: 40, height: 40 }}>
                                    <DollarSign className="w-5 h-5 text-white" />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Total a Receber
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                                        {summary.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#F59E0B20', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                                    <Building2 className="w-5 h-5 text-white" />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Convênios Ativos
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#F59E0B">
                                        {summary.totalProviders}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#10B98120', borderRadius: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                                    <Clock className="w-5 h-5 text-white" />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Pendentes
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#10B981">
                                        {summary.pendingCount} atendimentos
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Sub-tabs */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Tabs 
                    value={subTab} 
                    onChange={(_, v) => setSubTab(v)} 
                    sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        px: 2,
                        pt: 1
                    }}
                >
                    <Tab 
                        icon={<Clock size={16} />} 
                        iconPosition="start" 
                        label={`A Faturar (${receivables.reduce((sum, g) => sum + g.payments.filter(p => p.status === 'pending_billing').length, 0)})`} 
                    />
                    <Tab 
                        icon={<Send size={16} />} 
                        iconPosition="start" 
                        label={`Faturados (${receivables.reduce((sum, g) => sum + g.payments.filter(p => p.status === 'billed').length, 0)})`} 
                    />
                    <Tab 
                        icon={<CheckCircle size={16} />} 
                        iconPosition="start" 
                        label="Finalizados" 
                    />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                                Nenhum atendimento de convênio
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Clique em "Novo Atendimento" para começar
                            </Typography>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {receivables.map((group) => {
                                const paymentsToShow = filteredPayments(group.payments);
                                if (paymentsToShow.length === 0) return null;
                                const groupTotal = getGroupTotalForCurrentTab(group);
                                const isExpanded = expandedGroups[group._id] !== false;

                                return (
                                    <Card key={group._id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        {/* Header do Grupo - Clicável */}
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
                                                    <Typography fontWeight="600">
                                                        {group._id}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {paymentsToShow.length} atendimentos • Total: {groupTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Chip 
                                                    size="small"
                                                    label={`R$ ${groupTotal.toLocaleString('pt-BR')}`}
                                                    sx={{ 
                                                        bgcolor: '#3B82F6',
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    }}
                                                />
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </Box>
                                        </Box>

                                        {/* Lista de Pagamentos (Collapsible) */}
                                        <Collapse in={isExpanded}>
                                            <div className="divide-y">
                                                {paymentsToShow.map((payment) => {
                                                    const statusConfig = STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG];
                                                    const StatusIcon = statusConfig.icon;
                                                    
                                                    return (
                                                        <div key={payment.paymentId} className="p-3 hover:bg-gray-50 transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                {/* Avatar do paciente */}
                                                                <Avatar 
                                                                    sx={{ 
                                                                        bgcolor: payment.patientName !== 'N/A' ? '#E5E7EB' : '#F3F4F6',
                                                                        width: 40, 
                                                                        height: 40,
                                                                        cursor: payment.patient && payment.patientName !== 'N/A' ? 'pointer' : 'default',
                                                                        opacity: payment.patientName === 'N/A' ? 0.5 : 1,
                                                                        '&:hover': payment.patient && payment.patientName !== 'N/A' ? { bgcolor: '#D1D5DB' } : {}
                                                                    }}
                                                                    onClick={() => {
                                                                        if (payment.patient && payment.patientName !== 'N/A') {
                                                                            handleOpen360(payment.patient);
                                                                        }
                                                                    }}
                                                                >
                                                                    <User className="w-4 h-4 text-gray-600" />
                                                                </Avatar>

                                                                {/* Informações principais */}
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                        <Box>
                                                                            <Typography 
                                                                                fontWeight="600"
                                                                                sx={{ 
                                                                                    cursor: payment.patient && payment.patientName !== 'N/A' ? 'pointer' : 'default',
                                                                                    color: payment.patientName === 'N/A' ? 'text.secondary' : 'text.primary',
                                                                                    '&:hover': payment.patient && payment.patientName !== 'N/A' ? { color: '#3B82F6' } : {}
                                                                                }}
                                                                                onClick={() => {
                                                                                    if (payment.patient && payment.patientName !== 'N/A') {
                                                                                        handleOpen360(payment.patient);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                {payment.patientName === 'N/A' ? 'Paciente não identificado' : payment.patientName}
                                                                            </Typography>
                                                                            
                                                                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                    <Calendar className="w-3 h-3 text-gray-400" />
                                                                                    <Typography variant="caption" color="text.secondary">
                                                                                        {payment.paymentDate}
                                                                                    </Typography>
                                                                                </Box>
                                                                                
                                                                                {payment.authorizationCode && (
                                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                                        <FileText className="w-3 h-3 text-gray-400" />
                                                                                        <Typography variant="caption" color="text.secondary">
                                                                                            Guia: {payment.authorizationCode}
                                                                                        </Typography>
                                                                                    </Box>
                                                                                )}
                                                                            </Box>
                                                                        </Box>

                                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                            <Box sx={{ textAlign: 'right' }}>
                                                                                <Typography variant="body1" fontWeight="bold">
                                                                                    {payment.grossAmount > 0 
                                                                                        ? payment.grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                                                                        : 'Valor não informado'}
                                                                                </Typography>
                                                                                {payment.status === 'partial' && (
                                                                                    <Typography variant="caption" color="#F59E0B">
                                                                                        Recebido: {payment.receivedAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                    </Typography>
                                                                                )}
                                                                            </Box>

                                                                            <div className="flex items-center gap-2">
                                                                                {getStatusChip(payment.status)}

                                                                                {/* Ações */}
                                                                                {payment.status === 'pending_billing' && payment.grossAmount > 0 && (
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="outlined"
                                                                                        startIcon={<Send size={14} />}
                                                                                        onClick={() => handleMarkAsBilled(payment.paymentId)}
                                                                                        sx={{ 
                                                                                            borderColor: '#3B82F6',
                                                                                            color: '#3B82F6',
                                                                                            '&:hover': { borderColor: '#2563EB', bgcolor: '#3B82F610' }
                                                                                        }}
                                                                                    >
                                                                                        Faturar
                                                                                    </Button>
                                                                                )}
                                                                                
                                                                                {payment.status === 'billed' && (
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="contained"
                                                                                        startIcon={<Check size={14} />}
                                                                                        onClick={() => {
                                                                                            setSelectedPayment(payment);
                                                                                            setReceiveData({
                                                                                                receivedAmount: payment.grossAmount,
                                                                                                receivedDate: new Date().toISOString().split('T')[0],
                                                                                                notes: ''
                                                                                            });
                                                                                            setReceiveModalOpen(true);
                                                                                        }}
                                                                                        sx={{ 
                                                                                            bgcolor: '#10B981',
                                                                                            '&:hover': { bgcolor: '#059669' }
                                                                                        }}
                                                                                    >
                                                                                        Receber
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Collapse>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Box>
            </Paper>

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
                                name=''
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

                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Observações"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Opcional"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsNewModalOpen(false)} variant="outlined">
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateInsurance}
                        disabled={loading}
                        startIcon={<Check size={16} />}
                        sx={{ bgcolor: '#3B82F6' }}
                    >
                        Registrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Recebimento */}
            <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                            <Receipt className="w-4 h-4 text-white" />
                        </Avatar>
                        <Typography variant="h6">Registrar Recebimento</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                        <Alert severity="info" sx={{ bgcolor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                            <Typography variant="body2">
                                <strong>Paciente:</strong> {selectedPayment?.patientName === 'N/A' ? 'Não identificado' : selectedPayment?.patientName}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Valor esperado:</strong> {selectedPayment?.grossAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Typography>
                        </Alert>

                        <Box>
                            <Typography variant="body2" gutterBottom>Valor Recebido *</Typography>
                            <InputCurrency
                                name=''
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

                        {receiveData.receivedAmount < (selectedPayment?.grossAmount || 0) && (
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Motivo da Glosa"
                                value={receiveData.notes}
                                onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                                helperText="Informe o motivo do valor menor"
                                required
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceiveModalOpen(false)} variant="outlined">
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleReceive}
                        startIcon={<CheckCircle size={16} />}
                        sx={{ bgcolor: '#10B981' }}
                    >
                        Confirmar Recebimento
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
        </Box>
    );
};

export default InsuranceTab;