// src/pages/Financial/components/ConvenioManagerModal.tsx
/**
 * Modal para Gerenciamento de Convênios
 * CRUD completo: criar, editar, ativar/desativar convênios
 */

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Tooltip,
    Switch,
    Paper,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Building2,
    Plus,
    Edit2,
    Trash2,
    RefreshCw,
    Check,
    X,
    AlertCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import {
    getConvenios,
    createConvenio,
    updateConvenio,
    deactivateConvenio,
    activateConvenio,
    validateConvenioCode,
    Convenio,
    CreateConvenioData
} from '../../../services/insuranceService';

interface ConvenioManagerModalProps {
    open: boolean;
    onClose: () => void;
}

const ConvenioManagerModal = ({ open, onClose }: ConvenioManagerModalProps) => {
    const [convenios, setConvenios] = useState<Convenio[]>([]);
    const [loading, setLoading] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    
    // Estados para formulário
    const [isEditing, setIsEditing] = useState(false);
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [formData, setFormData] = useState<CreateConvenioData>({
        code: '',
        name: '',
        sessionValue: 0,
        notes: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [validatingCode, setValidatingCode] = useState(false);
    const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);

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

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        
        if (!formData.code || formData.code.length < 3) {
            errors.code = 'Código deve ter pelo menos 3 caracteres';
        }
        if (!/^[a-z0-9-]+$/.test(formData.code)) {
            errors.code = 'Apenas letras minúsculas, números e hífen';
        }
        if (!formData.name || formData.name.length < 3) {
            errors.name = 'Nome deve ter pelo menos 3 caracteres';
        }
        if (formData.sessionValue <= 0) {
            errors.sessionValue = 'Valor deve ser maior que zero';
        }
        
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const checkCodeAvailability = async (code: string) => {
        if (code.length < 3) return;
        
        setValidatingCode(true);
        try {
            const result = await validateConvenioCode(code);
            setCodeAvailable(result.available);
        } catch (error) {
            setCodeAvailable(null);
        } finally {
            setValidatingCode(false);
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        
        // Se está criando novo, verifica se código está disponível
        if (!isEditing && !codeAvailable) {
            toast.error('Código já está em uso');
            return;
        }
        
        try {
            setLoading(true);
            
            if (isEditing && editingCode) {
                await updateConvenio(editingCode, {
                    name: formData.name,
                    sessionValue: formData.sessionValue,
                    notes: formData.notes
                });
                toast.success('Convênio atualizado!');
            } else {
                await createConvenio(formData);
                toast.success('Convênio criado!');
            }
            
            resetForm();
            loadConvenios();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao salvar convênio');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (convenio: Convenio) => {
        setIsEditing(true);
        setEditingCode(convenio.code);
        setFormData({
            code: convenio.code,
            name: convenio.name,
            sessionValue: convenio.sessionValue,
            notes: convenio.notes || ''
        });
    };

    const handleDeactivate = async (code: string) => {
        if (!confirm('Deseja desativar este convênio?')) return;
        
        try {
            setLoading(true);
            await deactivateConvenio(code);
            toast.success('Convênio desativado');
            loadConvenios();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao desativar');
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

    const resetForm = () => {
        setIsEditing(false);
        setEditingCode(null);
        setFormData({ code: '', name: '', sessionValue: 0, notes: '' });
        setFormErrors({});
        setCodeAvailable(null);
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Building2 className="w-6 h-6 text-blue-500" />
                    <Typography variant="h6" fontWeight="bold">
                        Gerenciar Convênios
                    </Typography>
                </Box>
            </DialogTitle>
            
            <DialogContent dividers>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    
                    {/* Formulário */}
                    <Paper elevation={0} sx={{ p: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                            {isEditing ? 'Editar Convênio' : 'Novo Convênio'}
                        </Typography>
                        
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2 }}>
                            <TextField
                                label="Código *"
                                value={formData.code}
                                onChange={(e) => {
                                    const code = e.target.value.toLowerCase().trim();
                                    setFormData({ ...formData, code });
                                    setFormErrors({ ...formErrors, code: '' });
                                    if (!isEditing && code.length >= 3) {
                                        checkCodeAvailability(code);
                                    }
                                }}
                                disabled={isEditing}
                                error={!!formErrors.code}
                                helperText={
                                    formErrors.code || 
                                    (validatingCode ? 'Verificando...' :
                                     codeAvailable === true ? '✓ Código disponível' :
                                     codeAvailable === false ? '✗ Código já existe' : 
                                     'Ex: unimed-anapolis, bradesco-saude')
                                }
                                placeholder="unimed-anapolis"
                                size="small"
                                InputProps={{
                                    endAdornment: validatingCode && <CircularProgress size={16} />
                                }}
                            />
                            
                            <TextField
                                label="Nome *"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    setFormErrors({ ...formErrors, name: '' });
                                }}
                                error={!!formErrors.name}
                                helperText={formErrors.name || 'Nome completo do convênio'}
                                placeholder="Unimed Anápolis"
                                size="small"
                            />
                            
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Valor da Sessão *
                                </Typography>
                                <InputCurrency
                                    name="sessionValue"
                                    value={formData.sessionValue}
                                    onChange={(e) => {
                                        setFormData({ ...formData, sessionValue: Number(e.target.value) });
                                        setFormErrors({ ...formErrors, sessionValue: '' });
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg ${formErrors.sessionValue ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {formErrors.sessionValue && (
                                    <Typography variant="caption" color="error">
                                        {formErrors.sessionValue}
                                    </Typography>
                                )}
                            </Box>
                            
                            <TextField
                                label="Observações"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Informações adicionais"
                                size="small"
                                multiline
                                rows={1}
                            />
                        </Box>
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading || (!isEditing && codeAvailable === false)}
                                startIcon={isEditing ? <Check size={18} /> : <Plus size={18} />}
                            >
                                {isEditing ? 'Atualizar' : 'Criar Convênio'}
                            </Button>
                            
                            {isEditing && (
                                <Button
                                    variant="outlined"
                                    onClick={resetForm}
                                    startIcon={<X size={18} />}
                                >
                                    Cancelar
                                </Button>
                            )}
                        </Box>
                    </Paper>

                    {/* Filtros */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="600">
                            Convênios Cadastrados ({convenios.length})
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="text.secondary">
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
                                startIcon={<RefreshCw size={16} />}
                                disabled={loading}
                            >
                                Atualizar
                            </Button>
                        </Box>
                    </Box>

                    {/* Tabela */}
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                    <TableCell>Código</TableCell>
                                    <TableCell>Nome</TableCell>
                                    <TableCell align="right">Valor Sessão</TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="right">Pendentes</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading && convenios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <CircularProgress size={24} />
                                        </TableCell>
                                    </TableRow>
                                ) : convenios.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                Nenhum convênio encontrado
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    convenios.map((convenio) => (
                                        <TableRow 
                                            key={convenio._id}
                                            sx={{ 
                                                opacity: convenio.active ? 1 : 0.6,
                                                bgcolor: !convenio.active ? '#f8fafc' : 'inherit'
                                            }}
                                        >
                                            <TableCell>
                                                <Typography fontFamily="monospace" fontSize="0.875rem">
                                                    {convenio.code}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography fontWeight={500}>
                                                    {convenio.name}
                                                </Typography>
                                                {convenio.notes && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {convenio.notes}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight="600" color="primary">
                                                    {formatCurrency(convenio.sessionValue)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    size="small"
                                                    label={convenio.active ? 'Ativo' : 'Inativo'}
                                                    color={convenio.active ? 'success' : 'default'}
                                                    sx={{ fontWeight: 500 }}
                                                />
                                            </TableCell>
                                            <TableCell align="right">
                                                {convenio.stats?.pendingSessions ? (
                                                    <Tooltip title={`Estimado: ${formatCurrency(convenio.stats.estimatedRevenue || 0)}`}>
                                                        <Chip
                                                            size="small"
                                                            label={`${convenio.stats.pendingSessions} sessões`}
                                                            color="warning"
                                                            variant="outlined"
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" color="text.secondary">
                                                        -
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    {convenio.active ? (
                                                        <>
                                                            <Tooltip title="Editar">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleEdit(convenio)}
                                                                    color="primary"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Desativar">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleDeactivate(convenio.code)}
                                                                    color="error"
                                                                >
                                                                    <Trash2 size={16} />
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
                                                            >
                                                                Ativar
                                                            </Button>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    
                    {/* Info */}
                    <Alert severity="info" icon={<AlertCircle size={20} />}>
                        <Typography variant="body2">
                            <strong>Dica:</strong> O código do convênio é usado internamente pelo sistema 
                            (ex: <code>unimed-anapolis</code>). Use apenas letras minúsculas, números e hífen. 
                            O valor da sessão será aplicado automaticamente ao criar lotes de faturamento.
                        </Typography>
                    </Alert>
                </Box>
            </DialogContent>
            
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="outlined">
                    Fechar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConvenioManagerModal;
