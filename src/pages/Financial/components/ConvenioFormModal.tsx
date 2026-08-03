// src/pages/Financial/components/ConvenioFormModal.tsx
/**
 * Modal de formulário para criar/editar um Convênio
 * Usado pelo ConvenioManagerModal (que agora só lista os convênios cadastrados)
 */

import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    Switch,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { Building2, Plus, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import InputCurrency from '../../../components/ui/InputCurrency';
import {
    createConvenio,
    updateConvenio,
    validateConvenioCode,
    Convenio,
    CreateConvenioData,
    BillingMode,
    RenewalType,
    MigrationStrategy
} from '../../../services/insuranceService';
import { extractErrorMessage } from '../../../utils/errorUtils';

const DEFAULT_FORM_DATA: CreateConvenioData = {
    code: '',
    name: '',
    sessionValue: 0,
    billingMode: 'per_month',
    notes: '',
    defaultSessions: null,
    legalName: '',
    taxId: '',
    issRate: 0,
    guidePolicy: {
        renewalType: 'end_of_month',
        renewalDay: 'last_day',
        renewalDayOfMonth: null,
        expirationWarningDays: 5,
        autoSuggestRenewal: true,
        defaultMigrationStrategy: 'eligible',
        billingSubmissionDay: null,
        priorAuthRequestDay: null,
        priorAuthEmail: '',
        billingEmail: '',
        billingDeadlineDays: null
    }
};

interface ConvenioFormModalProps {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editingConvenio: Convenio | null;
}

const ConvenioFormModal = ({ open, onClose, onSaved, editingConvenio }: ConvenioFormModalProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateConvenioData>(DEFAULT_FORM_DATA);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [validatingCode, setValidatingCode] = useState(false);
    const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);

    const isEditing = !!editingConvenio;

    useEffect(() => {
        if (!open) return;

        if (editingConvenio) {
            setFormData({
                code: editingConvenio.code,
                name: editingConvenio.name,
                sessionValue: editingConvenio.sessionValue,
                billingMode: editingConvenio.billingMode || 'per_month',
                notes: editingConvenio.notes || '',
                defaultSessions: editingConvenio.defaultSessions ?? null,
                legalName: editingConvenio.legalName || '',
                taxId: editingConvenio.taxId || '',
                issRate: editingConvenio.issRate ?? 0,
                guidePolicy: {
                    ...DEFAULT_FORM_DATA.guidePolicy,
                    ...editingConvenio.guidePolicy
                }
            });
        } else {
            setFormData(DEFAULT_FORM_DATA);
        }
        setFormErrors({});
        setCodeAvailable(null);
    }, [open, editingConvenio]);

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

        if (!isEditing && !codeAvailable) {
            toast.error('Código já está em uso');
            return;
        }

        try {
            setLoading(true);

            if (isEditing && editingConvenio) {
                await updateConvenio(editingConvenio.code, {
                    name: formData.name,
                    sessionValue: formData.sessionValue,
                    billingMode: formData.billingMode,
                    notes: formData.notes,
                    defaultSessions: formData.defaultSessions,
                    legalName: formData.legalName,
                    taxId: formData.taxId,
                    issRate: formData.issRate,
                    guidePolicy: formData.guidePolicy
                });
                toast.success('Convênio atualizado!');
            } else {
                await createConvenio(formData);
                toast.success('Convênio criado!');
            }

            onSaved();
            onClose();
        } catch (error: any) {
            toast.error(extractErrorMessage(error, 'Erro ao salvar convênio'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
            <DialogTitle sx={{ px: 3, py: 2.25, borderBottom: '1px solid #F1F5F9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 42, height: 42, borderRadius: 2.5, bgcolor: '#EFF6FF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Building2 className="w-5 h-5 text-blue-600" />
                    </Box>
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                        {isEditing ? 'Editar Convênio' : 'Novo Convênio'}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3, bgcolor: '#FAFBFC' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
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

                {/* Modo de faturamento */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Modo de Faturamento
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        {([
                            { value: 'per_month', label: 'Por Sessão / Mês', desc: 'Fatura as sessões realizadas no mês', color: '#3B82F6' },
                            { value: 'per_guide', label: 'Por Guia Completa', desc: 'Fatura o valor total da guia quando ela fecha', color: '#10B981' }
                        ] as { value: BillingMode; label: string; desc: string; color: string }[]).map(opt => {
                            const selected = formData.billingMode === opt.value;
                            return (
                                <Box
                                    key={opt.value}
                                    onClick={() => setFormData({ ...formData, billingMode: opt.value })}
                                    sx={{
                                        flex: 1, p: 1.5, borderRadius: 2, cursor: 'pointer',
                                        border: `2px solid ${selected ? opt.color : '#E5E7EB'}`,
                                        bgcolor: selected ? `${opt.color}10` : '#FAFAFA',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <Typography fontSize="0.82rem" fontWeight={700} color={selected ? opt.color : '#374151'}>
                                        {opt.label}
                                    </Typography>
                                    <Typography fontSize="0.72rem" color="text.secondary">{opt.desc}</Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {/* Dados Fiscais — destinatário da NF, não é comportamento de guia */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Dados Fiscais (Nota Fiscal)
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
                        <TextField
                            label="Razão Social"
                            value={formData.legalName ?? ''}
                            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                            placeholder="Unimed Campinas Cooperativa de Trabalho Médico"
                            size="small"
                            helperText="Destinatário da NF, se diferente do nome acima"
                        />
                        <TextField
                            label="CNPJ"
                            value={formData.taxId ?? ''}
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                            placeholder="46.124.624/0001-11"
                            size="small"
                        />
                        <TextField
                            label="ISS retido na fonte (%)"
                            type="number"
                            value={formData.issRate ?? 0}
                            onChange={(e) => setFormData({ ...formData, issRate: e.target.value ? Number(e.target.value) : 0 })}
                            placeholder="2.01"
                            size="small"
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            helperText="Alíquota que o convênio retém ao pagar (ex: Unimed 2,01%). Deduzida automaticamente do valor bruto ao registrar recebimento"
                        />
                    </Box>
                </Box>

                {/* Política de Guia */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Política de Guia
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="renewal-type-label">Tipo de renovação</InputLabel>
                            <Select<RenewalType>
                                labelId="renewal-type-label"
                                value={formData.guidePolicy?.renewalType || 'end_of_month'}
                                label="Tipo de renovação"
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, renewalType: e.target.value as RenewalType }
                                })}
                            >
                                <MenuItem value="end_of_month">Fim do mês</MenuItem>
                                <MenuItem value="until_consumed">Até consumir sessões</MenuItem>
                                <MenuItem value="fixed_date">Data fixa</MenuItem>
                                <MenuItem value="authorization_validity">Validade da autorização</MenuItem>
                                <MenuItem value="advance_authorization">Antecipada (antes do início do atendimento)</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label="Dia de envio"
                            type="number"
                            size="small"
                            value={
                                (formData.guidePolicy?.renewalType === 'advance_authorization'
                                    ? formData.guidePolicy?.priorAuthRequestDay
                                    : formData.guidePolicy?.billingSubmissionDay) ?? ''
                            }
                            onChange={(e) => {
                                const day = e.target.value ? Number(e.target.value) : null;
                                setFormData({
                                    ...formData,
                                    guidePolicy: formData.guidePolicy?.renewalType === 'advance_authorization'
                                        ? { ...formData.guidePolicy, priorAuthRequestDay: day }
                                        : { ...formData.guidePolicy, billingSubmissionDay: day }
                                });
                            }}
                            inputProps={{ min: 1, max: 31 }}
                            helperText={
                                formData.guidePolicy?.renewalType === 'advance_authorization'
                                    ? 'Dia do mês anterior ao atendimento (ex: 20)'
                                    : 'Prazo mensal para enviar a fatura/guia ao convênio (ex: 29)'
                            }
                        />

                        {formData.guidePolicy?.renewalType === 'advance_authorization' ? (
                            <TextField
                                label="E-mail de autorização prévia"
                                type="email"
                                size="small"
                                value={formData.guidePolicy?.priorAuthEmail ?? ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, priorAuthEmail: e.target.value }
                                })}
                                placeholder="aut.eventual@unimedfesp.coop.br"
                                helperText="Destino da solicitação (sessões do mês + programação terapêutica antecipada)"
                            />
                        ) : (
                            <TextField
                                label="E-mail de faturamento"
                                type="email"
                                size="small"
                                value={formData.guidePolicy?.billingEmail ?? ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, billingEmail: e.target.value }
                                })}
                                placeholder="pagamento.prestadores@unimedcampinas.com.br"
                                helperText="Destino da NF + lista de presença"
                            />
                        )}

                        {formData.guidePolicy?.renewalType !== 'advance_authorization' && (
                            <TextField
                                label="Prazo de emissão (dias corridos)"
                                type="number"
                                size="small"
                                value={formData.guidePolicy?.billingDeadlineDays ?? ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, billingDeadlineDays: e.target.value ? Number(e.target.value) : null }
                                })}
                                inputProps={{ min: 0 }}
                                helperText="Dias corridos após o atendimento para emitir a NF (ex: 30). Deixe vazio se usar só o dia fixo do mês"
                            />
                        )}

                        {formData.guidePolicy?.renewalType === 'end_of_month' && (
                            <FormControl size="small" fullWidth>
                                <InputLabel id="renewal-day-label">Dia de renovação</InputLabel>
                                <Select
                                    labelId="renewal-day-label"
                                    value={formData.guidePolicy?.renewalDay || 'last_day'}
                                    label="Dia de renovação"
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        guidePolicy: { ...formData.guidePolicy, renewalDay: e.target.value as 'last_day' | 'fixed_day' }
                                    })}
                                >
                                    <MenuItem value="last_day">Último dia do mês</MenuItem>
                                    <MenuItem value="fixed_day">Dia fixo</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        {formData.guidePolicy?.renewalDay === 'fixed_day' && (
                            <TextField
                                label="Dia do mês"
                                type="number"
                                size="small"
                                value={formData.guidePolicy?.renewalDayOfMonth || ''}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, renewalDayOfMonth: e.target.value ? Number(e.target.value) : null }
                                })}
                                inputProps={{ min: 1, max: 31 }}
                            />
                        )}

                        <TextField
                            label="Dias de aviso antes do vencimento"
                            type="number"
                            size="small"
                            value={formData.guidePolicy?.expirationWarningDays ?? 5}
                            onChange={(e) => setFormData({
                                ...formData,
                                guidePolicy: { ...formData.guidePolicy, expirationWarningDays: Number(e.target.value) }
                            })}
                            inputProps={{ min: 0 }}
                        />

                        <TextField
                            label="Sessões padrão"
                            type="number"
                            size="small"
                            value={formData.defaultSessions ?? ''}
                            onChange={(e) => setFormData({
                                ...formData,
                                defaultSessions: e.target.value ? Number(e.target.value) : null
                            })}
                            inputProps={{ min: 1 }}
                            helperText="Sugestão ao criar nova guia"
                        />

                        <FormControl size="small" fullWidth>
                            <InputLabel id="migration-strategy-label">Migração padrão</InputLabel>
                            <Select<MigrationStrategy>
                                labelId="migration-strategy-label"
                                value={formData.guidePolicy?.defaultMigrationStrategy || 'eligible'}
                                label="Migração padrão"
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, defaultMigrationStrategy: e.target.value as MigrationStrategy }
                                })}
                            >
                                <MenuItem value="eligible">Apenas elegíveis</MenuItem>
                                <MenuItem value="manual">Seleção manual</MenuItem>
                                <MenuItem value="none">Nenhuma</MenuItem>
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Sugerir renovação automaticamente
                            </Typography>
                            <Switch
                                checked={formData.guidePolicy?.autoSuggestRenewal ?? true}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    guidePolicy: { ...formData.guidePolicy, autoSuggestRenewal: e.target.checked }
                                })}
                                size="small"
                            />
                        </Box>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9' }}>
                <Button onClick={onClose} variant="outlined" startIcon={<X size={18} />} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading || (!isEditing && codeAvailable === false)}
                    startIcon={isEditing ? <Check size={18} /> : <Plus size={18} />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                >
                    {isEditing ? 'Atualizar' : 'Criar Convênio'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConvenioFormModal;
