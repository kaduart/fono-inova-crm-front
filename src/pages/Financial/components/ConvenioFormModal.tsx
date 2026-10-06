// src/pages/Financial/components/ConvenioFormModal.tsx
/**
 * Modal de formulário para criar/editar um Convênio
 * Usado pelo ConvenioManagerModal (que agora só lista os convênios cadastrados)
 */

import {
    Box,
    Accordion,
    AccordionSummary,
    AccordionDetails,
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
import { Building2, Plus, Check, Trash2, X, ChevronDown } from 'lucide-react';
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

// Mesmas especialidades aceitas pela guia de convênio (models/InsuranceGuide.js)
const SPECIALTY_OPTIONS = [
    { value: 'fonoaudiologia', label: 'Fonoaudiologia' },
    { value: 'psicologia', label: 'Psicologia' },
    { value: 'fisioterapia', label: 'Fisioterapia' },
    { value: 'terapia_ocupacional', label: 'Terapia Ocupacional' },
    { value: 'psicomotricidade', label: 'Psicomotricidade' },
    { value: 'musicoterapia', label: 'Musicoterapia' },
    { value: 'psicopedagogia', label: 'Psicopedagogia' },
    { value: 'neuropsicologia', label: 'Neuropsicologia' }
];

const DEFAULT_FORM_DATA: CreateConvenioData = {
    code: '',
    name: '',
    sessionValue: 0,
    specialtyValues: [],
    abaSurchargePercent: 0,
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
    const isBase = formData.code.trim().toLowerCase() === 'base';

    useEffect(() => {
        if (!open) return;

        if (editingConvenio) {
            setFormData({
                code: editingConvenio.code,
                name: editingConvenio.name,
                sessionValue: editingConvenio.sessionValue,
                specialtyValues: (editingConvenio.specialtyValues || []).map(v => ({ ...v })),
                abaSurchargePercent: editingConvenio.abaSurchargePercent ?? 0,
                billingMode: editingConvenio.billingMode || 'per_month',
                notes: editingConvenio.notes || '',
                defaultSessions: editingConvenio.defaultSessions ?? null,
                legalName: editingConvenio.legalName || '',
                taxId: (editingConvenio.taxId || '').replace(/\D/g, ''),
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

        const rows = isBase ? (formData.specialtyValues || []) : [];
        if (rows.some(r => !r.specialty)) {
            errors.specialtyValues = 'Escolha a especialidade em todas as linhas (ou remova a linha vazia)';
        } else if (rows.some(r => !(r.sessionValue > 0))) {
            errors.specialtyValues = 'Informe um valor maior que zero em todas as linhas';
        } else if (new Set(rows.map(r => r.specialty)).size !== rows.length) {
            errors.specialtyValues = 'Há especialidade repetida na tabela de valores';
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
                    ...(isBase ? { specialtyValues: formData.specialtyValues || [], abaSurchargePercent: 50 } : {}),
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
                await createConvenio({ ...formData, specialtyValues: isBase ? formData.specialtyValues : [], abaSurchargePercent: isBase ? 50 : 0 });
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

            <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#FFFFFF', '& .MuiFormHelperText-root': { mx: 0, fontSize: '0.75rem', lineHeight: 1.4 } }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px minmax(0, 1fr)' }, gap: 2, mt: 1, alignItems: 'start' }}>
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
                            Valor padrão por sessão *
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

                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Observações
                        </Typography>
                        <TextField
                            fullWidth
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Informações adicionais"
                            size="small"
                            multiline
                            rows={1}
                            sx={{ '& .MuiInputBase-root': { minHeight: 42 } }}
                        />
                    </Box>
                </Box>

                <>
                {/* Valores por especialidade — o convênio paga valores diferentes por procedimento */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Valores por especialidade (opcional)
                    </Typography>
                    <Typography fontSize="0.74rem" color="text.secondary" sx={{ mb: 1 }}>
                        Cada linha define o valor unitário da sessão (1º campo) e da avaliação (2º campo, opcional). Sem uma linha, vale o padrão acima. Guias existentes mantêm seu valor.
                    </Typography>

                    {(formData.specialtyValues || []).map((row, index) => {
                        const taken = new Set((formData.specialtyValues || []).map(r => r.specialty));
                        return (
                            <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr) 104px 104px 36px', sm: 'minmax(0,1fr) 140px 140px 36px' }, maxWidth: 720, gap: 1.5, alignItems: 'center', mb: 1 }}>
                                <FormControl size="small" fullWidth>
                                    <InputLabel id={`spec-label-${index}`}>Especialidade</InputLabel>
                                    <Select
                                        labelId={`spec-label-${index}`}
                                        value={row.specialty}
                                        label="Especialidade"
                                        onChange={(e) => {
                                            const next = [...(formData.specialtyValues || [])];
                                            next[index] = { ...row, specialty: String(e.target.value) };
                                            setFormData({ ...formData, specialtyValues: next });
                                            setFormErrors({ ...formErrors, specialtyValues: '' });
                                        }}
                                    >
                                        {SPECIALTY_OPTIONS.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value} disabled={taken.has(opt.value) && opt.value !== row.specialty}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <InputCurrency
                                    name={`specialtyValue-${index}`}
                                    value={row.sessionValue}
                                    onChange={(e) => {
                                        const next = [...(formData.specialtyValues || [])];
                                        next[index] = { ...row, sessionValue: Number(e.target.value) };
                                        setFormData({ ...formData, specialtyValues: next });
                                        setFormErrors({ ...formErrors, specialtyValues: '' });
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                                />
                                <InputCurrency
                                    name={`specialtyEvaluation-${index}`}
                                    value={row.evaluationValue ?? 0}
                                    onChange={(e) => {
                                        const next = [...(formData.specialtyValues || [])];
                                        next[index] = { ...row, evaluationValue: Number(e.target.value) };
                                        setFormData({ ...formData, specialtyValues: next });
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg border-gray-300"
                                />
                                <Button
                                    size="small"
                                    color="error"
                                    aria-label="Remover linha"
                                    onClick={() => setFormData({
                                        ...formData,
                                        specialtyValues: (formData.specialtyValues || []).filter((_, i) => i !== index)
                                    })}
                                    sx={{ minWidth: 36, minHeight: 40, p: 0.75 }}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </Box>
                        );
                    })}

                    {formErrors.specialtyValues && (
                        <Typography variant="caption" color="error" display="block" sx={{ mb: 0.5 }}>
                            {formErrors.specialtyValues}
                        </Typography>
                    )}

                    <Button
                        size="small"
                        startIcon={<Plus size={16} />}
                        disabled={(formData.specialtyValues || []).length >= SPECIALTY_OPTIONS.length}
                        onClick={() => setFormData({
                            ...formData,
                            specialtyValues: [...(formData.specialtyValues || []), { specialty: '', sessionValue: 0 }]
                        })}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Adicionar especialidade
                    </Button>
                </Box>

                {/* ABA — regra fixa do convênio Base; o switch fica no cadastro da guia */}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Atendimento ABA: valor da especialidade + 50% por sessão. Marque "Atendimento ABA" ao cadastrar a guia.
                </Typography>

                </>
                {/* Modo de faturamento */}
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Modo de Faturamento
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
                        {([
                            { value: 'per_month', label: 'Por Sessão / Mês', desc: 'Fatura as sessões realizadas no mês', color: '#26977B' },
                            { value: 'per_guide', label: 'Por Guia Completa', desc: 'Fatura o valor total da guia quando ela fecha', color: '#26977B' }
                        ] as { value: BillingMode; label: string; desc: string; color: string }[]).map(opt => {
                            const selected = formData.billingMode === opt.value;
                            return (
                                <Box
                                    key={opt.value}
                                    component="button"
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setFormData({ ...formData, billingMode: opt.value })}
                                    sx={{
                                        flex: 1, p: 1.5, borderRadius: 2, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', '&:focus-visible': { outline: '2px solid #26977B', outlineOffset: 2 },
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
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 200px' }, gap: 2, mt: 1 }}>
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
                            onChange={(e) => setFormData({ ...formData, taxId: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                            inputProps={{ inputMode: 'numeric', maxLength: 14 }}
                            helperText="14 números, sem pontuação"
                            placeholder="46124624000111"
                            size="small"
                        />
                        <TextField
                            label="ISS retido (%)"
                            sx={{ width: { xs: '100%', sm: 160 } }}
                            type="number"
                            value={formData.issRate ?? 0}
                            onChange={(e) => setFormData({ ...formData, issRate: e.target.value ? Number(e.target.value) : 0 })}
                            placeholder="2.01"
                            size="small"
                            inputProps={{ min: 0, max: 100, step: 0.01 }}
                            helperText="Deduzido do bruto no recebimento"
                        />
                    </Box>
                </Box>

                {/* Política de Guia */}
                <Accordion disableGutters elevation={0} sx={{ mt: 3, borderTop: '1px solid #e5e7eb', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ChevronDown size={18} />} sx={{ px: 0 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={500}>
                        Política de guia e prazos
                    </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0, pt: 0 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2, mt: 1 }}>
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
                    </AccordionDetails>
                </Accordion>
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
