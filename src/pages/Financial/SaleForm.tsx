import { ArrowBack, Save } from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card, CardContent,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    MenuItem,
    Paper,
    Radio, RadioGroup,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography
} from '@mui/material';
import { useState } from 'react';
import { useProvisionamento } from '../../hooks/useProvisionamento';
import { useSales } from '../../hooks/useSales';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

interface SaleFormProps {
    onCancel: () => void;
    onSuccess: () => void;
}

const steps = ['Dados Básicos', 'Pagamento', 'Confirmação'];

const SaleForm = ({ onCancel, onSuccess }: SaleFormProps) => {
    const [activeStep, setActiveStep] = useState(0);
    const { createSale, simularVenda, simulacao } = useSales();
    const { calcular } = useProvisionamento();

    // Form states
    const [formData, setFormData] = useState({
        patient: '',
        doctor: '',
        tipoVenda: 'sessao_avulsa',
        produtoServico: '',
        package: '',
        valorBruto: 0,
        desconto: 0,
        formaPagamento: 'pix',
        parcelas: 1,
        bandeiraCartao: 'visa',
        dataVenda: new Date().toISOString().split('T')[0],
        dataAgendamento: ''
    });

    const [calculando, setCalculando] = useState(false);

    const valorLiquido = formData.valorBruto - formData.desconto;

    const handleNext = () => {
        if (activeStep === 1) {
            // Calcular simulação antes de confirmar
            handleSimular();
        }
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => setActiveStep((prev) => prev - 1);

    const handleSimular = async () => {
        if (!formData.produtoServico) return;
        setCalculando(true);
        await simularVenda({
            valor: valorLiquido,
            formaPagamento: formData.formaPagamento,
            bandeiraCartao: formData.bandeiraCartao,
            parcelas: formData.parcelas,
            produtoId: formData.produtoServico
        });
        setCalculando(false);
    };

    const handleSubmit = async () => {
        try {
            await createSale({
                ...formData,
                valorLiquido
            });
            await calcular(new Date().getMonth() + 1, new Date().getFullYear());
            onSuccess();
        } catch (err) {
            console.error(err);
        }
    };

    // Render steps
    const renderStep1 = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Paciente"
                    select
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                >
                    {/* Mapear pacientes */}
                    <MenuItem value="patient_id_1">Maria Silva</MenuItem>
                    <MenuItem value="patient_id_2">João Santos</MenuItem>
                </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Profissional"
                    select
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                >
                    <MenuItem value="doctor_id_1">Dra. Ana - Fonoaudiologia</MenuItem>
                    <MenuItem value="doctor_id_2">Dr. Carlos - Psicologia</MenuItem>
                </TextField>
            </Grid>
            <Grid item xs={12}>
                <FormControl component="fieldset">
                    <Typography variant="subtitle2" gutterBottom>Tipo de Venda</Typography>
                    <RadioGroup
                        row
                        value={formData.tipoVenda}
                        onChange={(e) => setFormData({ ...formData, tipoVenda: e.target.value })}
                    >
                        <FormControlLabel value="sessao_avulsa" control={<Radio />} label="Sessão Avulsa" />
                        <FormControlLabel value="pacote" control={<Radio />} label="Pacote" />
                        <FormControlLabel value="produto" control={<Radio />} label="Produto" />
                    </RadioGroup>
                </FormControl>
            </Grid>
            <Grid item xs={12}>
                <TextField
                    fullWidth
                    label={formData.tipoVenda === 'pacote' ? 'Pacote' : 'Produto/Serviço'}
                    select
                    value={formData.tipoVenda === 'pacote' ? formData.package : formData.produtoServico}
                    onChange={(e) =>
                        formData.tipoVenda === 'pacote'
                            ? setFormData({ ...formData, package: e.target.value })
                            : setFormData({ ...formData, produtoServico: e.target.value })
                    }
                >
                    {formData.tipoVenda === 'pacote' ? (
                        <>
                            <MenuItem value="pack_1">Pacote 10 Sessões - R$ 2.000</MenuItem>
                            <MenuItem value="pack_2">Pacote 20 Sessões - R$ 3.500</MenuItem>
                        </>
                    ) : (
                        <>
                            <MenuItem value="prod_1">Avaliação Fonoaudiologia - R$ 300</MenuItem>
                            <MenuItem value="prod_2">Sessão Terapia - R$ 200</MenuItem>
                        </>
                    )}
                </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Valor Bruto"
                    type="number"
                    value={formData.valorBruto}
                    onChange={(e) => setFormData({ ...formData, valorBruto: Number(e.target.value) })}
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Desconto"
                    type="number"
                    value={formData.desconto}
                    onChange={(e) => setFormData({ ...formData, desconto: Number(e.target.value) })}
                />
            </Grid>
            <Grid item xs={12}>
                <Alert severity="info">
                    Valor Líquido: <strong>{formatCurrency(valorLiquido)}</strong>
                </Alert>
            </Grid>
        </Grid>
    );

    const renderStep2 = () => (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <TextField
                    fullWidth
                    label="Forma de Pagamento"
                    select
                    value={formData.formaPagamento}
                    onChange={(e) => setFormData({ ...formData, formaPagamento: e.target.value })}
                >
                    <MenuItem value="dinheiro">Dinheiro</MenuItem>
                    <MenuItem value="pix">PIX</MenuItem>
                    <MenuItem value="debito">Débito</MenuItem>
                    <MenuItem value="credito_1x">Crédito à Vista</MenuItem>
                    <MenuItem value="credito_parcelado">Crédito Parcelado</MenuItem>
                </TextField>
            </Grid>

            {formData.formaPagamento.includes('credito') && (
                <>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Bandeira"
                            select
                            value={formData.bandeiraCartao}
                            onChange={(e) => setFormData({ ...formData, bandeiraCartao: e.target.value })}
                        >
                            <MenuItem value="visa">Visa</MenuItem>
                            <MenuItem value="mastercard">Mastercard</MenuItem>
                            <MenuItem value="elo">Elo</MenuItem>
                            <MenuItem value="amex">American Express</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Parcelas"
                            type="number"
                            value={formData.parcelas}
                            onChange={(e) => setFormData({ ...formData, parcelas: Number(e.target.value) })}
                        />
                    </Grid>
                </>
            )}
        </Grid>
    );

    const renderStep3 = () => (
        <Box>
            {simulacao && (
                <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Simulação Financeira</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Valor Líquido</Typography>
                                <Typography variant="h6">{formatCurrency(simulacao.valor)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Custos Totais</Typography>
                                <Typography variant="h6" color="error.main">
                                    {formatCurrency(simulacao.custos.total)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">Margem Contribuição</Typography>
                                <Typography variant="h6" color="success.main" fontWeight="bold">
                                    {formatCurrency(simulacao.margemContribuicao)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">% Margem</Typography>
                                <Typography variant="h6" color="success.main">
                                    {simulacao.percentualMargem}%
                                </Typography>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" gutterBottom>Detalhamento de Custos:</Typography>
                        {simulacao.custos.cmv > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>CMV</span>
                                <span>{formatCurrency(simulacao.custos.cmv)}</span>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Impostos</span>
                            <span>{formatCurrency(simulacao.custos.imposto)}</span>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Comissão</span>
                            <span>{formatCurrency(simulacao.custos.comissao)}</span>
                        </Box>
                        {simulacao.custos.taxaCartao > 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Taxa Cartão</span>
                                <span>{formatCurrency(simulacao.custos.taxaCartao)}</span>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            <Alert severity="success">
                Tudo certo! Clique em "Finalizar" para registrar a venda.
            </Alert>
        </Box>
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button startIcon={<ArrowBack />} onClick={onCancel}>
                    Voltar
                </Button>
                <Typography variant="h5" fontWeight="bold">
                    Nova Venda
                </Typography>
            </Box>

            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            <Paper sx={{ p: 4 }}>
                {activeStep === 0 && renderStep1()}
                {activeStep === 1 && renderStep2()}
                {activeStep === 2 && renderStep3()}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                    {activeStep > 0 && (
                        <Button onClick={handleBack}>
                            Voltar
                        </Button>
                    )}
                    {activeStep < steps.length - 1 ? (
                        <Button variant="contained" onClick={handleNext}>
                            Próximo
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleSubmit}
                            startIcon={<Save />}
                        >
                            Finalizar Venda
                        </Button>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default SaleForm;