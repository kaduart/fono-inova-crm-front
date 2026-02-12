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
    Typography
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
    Send
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

const InsuranceTab = () => {
    const [subTab, setSubTab] = useState(0);
    const [receivables, setReceivables] = useState<InsuranceReceivableGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalProviders: 0, grandTotal: 0 });

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
        paymentDate: new Date().toISOString().split('T')[0] // ✅ Data padrão: hoje
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
            setReceivables(response.data.data || []);
            setSummary(response.data.summary || { totalProviders: 0, grandTotal: 0 });
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
        const statusConfig: Record<string, { color: 'warning' | 'info' | 'success' | 'error'; label: string }> = {
            pending_billing: { color: 'warning', label: 'Aguardando Faturamento' },
            billed: { color: 'info', label: 'Faturado' },
            received: { color: 'success', label: 'Recebido' },
            partial: { color: 'warning', label: 'Recebido Parcial' },
            glosa: { color: 'error', label: 'Glosado' }
        };
        const config = statusConfig[status] || { color: 'warning', label: status };
        return <Chip size="small" color={config.color} label={config.label} />;
    };

    return (
        <Box className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
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
                        '&:hover': { background: 'linear-gradient(135deg, #2563eb, #1e40af)' }
                    }}
                >
                    Novo Atendimento
                </Button>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Paper className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <Typography variant="body2" color="text.secondary">Total a Receber</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary">
                                {summary.grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </Typography>
                        </div>
                        <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
                    </div>
                </Paper>

                <Paper className="p-4 border-l-4 border-l-amber-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <Typography variant="body2" color="text.secondary">Convênios Ativos</Typography>
                            <Typography variant="h5" fontWeight="bold" color="warning.main">
                                {summary.totalProviders}
                            </Typography>
                        </div>
                        <Building2 className="w-8 h-8 text-amber-500 opacity-50" />
                    </div>
                </Paper>

                <Paper className="p-4 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <Typography variant="body2" color="text.secondary">Atendimentos Pendentes</Typography>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                                {receivables.reduce((sum, r) => sum + r.count, 0)}
                            </Typography>
                        </div>
                        <Clock className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                </Paper>
            </div>

            {/* Sub-tabs */}
            <Paper sx={{ borderRadius: 2 }}>
                <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab icon={<Clock size={16} />} iconPosition="start" label="A Faturar" />
                    <Tab icon={<Send size={16} />} iconPosition="start" label="Faturados" />
                    <Tab icon={<CheckCircle size={16} />} iconPosition="start" label="Recebidos" />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : receivables.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <Typography>Nenhum atendimento de convênio registrado</Typography>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {receivables.map((group) => (
                                <Paper key={group._id} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                    {/* Header do grupo */}
                                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                            <Typography fontWeight="bold">{group._id}</Typography>
                                            <Chip size="small" label={`${group.count} atendimentos`} />
                                        </div>
                                        <Typography fontWeight="bold" color="primary">
                                            {group.totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </Typography>
                                    </div>

                                    {/* Lista de pagamentos */}
                                    <div className="divide-y">
                                        {group.payments
                                            .filter(p => {
                                                if (subTab === 0) return p.status === 'pending_billing';
                                                if (subTab === 1) return p.status === 'billed';
                                                return ['received', 'partial', 'glosa'].includes(p.status);
                                            })
                                            .map((payment) => (
                                                <div key={payment.paymentId} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                                                    <div className="flex items-center gap-4">
                                                        <div>
                                                            <Typography
                                                                fontWeight="medium"
                                                                className="cursor-pointer hover:text-blue-600 hover:underline"
                                                                onClick={() => payment.patientId && handleOpen360(payment.patientId)}
                                                            >
                                                                {payment.patientName}
                                                            </Typography>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <Calendar className="w-3 h-3" />
                                                                {payment.paymentDate}
                                                                {payment.authorizationCode && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <FileText className="w-3 h-3" />
                                                                        Guia: {payment.authorizationCode}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <Typography fontWeight="bold">
                                                            {payment.grossAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </Typography>
                                                        {getStatusChip(payment.status)}

                                                        {/* Ações */}
                                                        {payment.status === 'pending_billing' && (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                startIcon={<Send size={14} />}
                                                                onClick={() => handleMarkAsBilled(payment.paymentId)}
                                                            >
                                                                Faturar
                                                            </Button>
                                                        )}
                                                        {payment.status === 'billed' && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="success"
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
                                                            >
                                                                Receber
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </Paper>
                            ))}
                        </div>
                    )}
                </Box>
            </Paper>

            {/* Modal: Novo Atendimento */}
            <Dialog open={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Registrar Atendimento de Convênio
                    </div>
                </DialogTitle>
                <DialogContent>
                    <div className="space-y-4 pt-2">
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

                        <div>
                            <InputCurrency
                                name='Valor da Tabela *'
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={formData.grossAmount}
                                onChange={(e) => setFormData({ ...formData, grossAmount: Number(e.target.value) })}
                            />
                        </div>

                        <TextField
                            fullWidth
                            label="Código da Guia/Autorização"
                            value={formData.authorizationCode}
                            onChange={(e) => setFormData({ ...formData, authorizationCode: e.target.value })}
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            label="Observações"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setIsNewModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreateInsurance}
                        disabled={loading}
                        startIcon={<Check size={16} />}
                    >
                        Registrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal: Recebimento */}
            <Dialog open={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-green-600" />
                        Registrar Recebimento
                    </div>
                </DialogTitle>
                <DialogContent>
                    <div className="space-y-4 pt-2">
                        <Typography variant="body2" color="text.secondary">
                            Paciente: <strong>{selectedPayment?.patientName}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Valor esperado: <strong>
                                {selectedPayment?.grossAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </strong>
                        </Typography>

                        <div>
                            <InputCurrency
                                name='Valor Recebido'
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={receiveData.receivedAmount}
                                onChange={(e) => setReceiveData({ ...receiveData, receivedAmount: Number(e.target.value) })}
                            />
                        </div>

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
                                helperText="Valor menor que o esperado - informe o motivo"
                            />
                        )}
                    </div>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setReceiveModalOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleReceive}
                        startIcon={<CheckCircle size={16} />}
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