// frontend/src/pages/Financial/components/Patient360Modal.tsx
import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Chip, Alert, AlertTitle,
    List, ListItem, ListItemText, Divider, CircularProgress,
    IconButton, Stack, Card, CardContent
} from '@mui/material';

import {
    Close as CloseIcon,
    WhatsApp as WhatsAppIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { useFinancialAnalytics } from '../../../hooks/useFinancialAnalytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Grid } from '@mui/material';


interface Props {
    patientId: string | null;
    open: boolean;
    onClose: () => void;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const Patient360Modal: React.FC<Props> = ({ patientId, open, onClose }) => {
    const { patient360, loadingPatient360, fetchPatient360 } = useFinancialAnalytics();

    React.useEffect(() => {
        if (open && patientId) {
            fetchPatient360(patientId);
        }
    }, [open, patientId, fetchPatient360]);

    const handleWhatsApp = () => {
        if (!patient360?.patient.phone) return;
        const phone = patient360.patient.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${patient360.patient.name}, tudo bem? Gostaria de conversar sobre seu acompanhamento na Fono Inova.`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    if (!open) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
            <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#f8f9fa' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        Visão 360° do Paciente
                    </Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                {loadingPatient360 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={10}>
                        <CircularProgress />
                    </Box>
                ) : !patient360 ? (
                    <Typography color="textSecondary" align="center">Erro ao carregar dados do paciente.</Typography>
                ) : (
                    <Box>
                        {/* Header: Dados Básicos e Risco */}
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                            <Box>
                                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1a237e' }}>
                                    {patient360.patient.name}
                                </Typography>
                                <Typography color="textSecondary">
                                    {patient360.patient.phone} | {patient360.patient.email}
                                </Typography>
                            </Box>
                            <Chip
                                label={patient360.alerts.riskLevel === 'high' ? 'RISCO ALTO' : patient360.alerts.riskLevel === 'medium' ? 'ATENÇÃO' : 'REGULAR'}
                                color={patient360.alerts.riskLevel === 'high' ? 'error' : patient360.alerts.riskLevel === 'medium' ? 'warning' : 'success'}
                                icon={patient360.alerts.riskLevel === 'high' ? <WarningIcon /> : <CheckCircleIcon />}
                                sx={{ px: 1, py: 2, fontWeight: 'bold' }}
                            />
                        </Box>

                        {/* Alertas e Ações */}
                        {patient360.alerts.riskFlags.length > 0 && (
                            <Alert severity={patient360.alerts.riskLevel === 'high' ? 'error' : 'warning'} sx={{ mb: 3, border: '1px solid' }}>
                                <AlertTitle sx={{ fontWeight: 'bold' }}>Ações de Retenção Sugeridas</AlertTitle>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                    {patient360.alerts.suggestedActions.map((action, idx) => (
                                        <Typography component="li" key={idx} variant="body2">{action}</Typography>
                                    ))}
                                </Box>
                            </Alert>
                        )}

                        {/* Métricas Financeiras */}
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#546e7a' }}>
                            Saúde Financeira (LTV)
                        </Typography>
                        <Grid container spacing={2} mb={4}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Card variant="outlined" sx={{ bgcolor: '#e8f5e9' }}>
                                    <CardContent sx={{ p: '16px !important' }}>
                                        <Typography variant="caption" color="textSecondary">Faturamento Total</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{formatCurrency(patient360.financial.totalSpent)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Card variant="outlined">
                                    <CardContent sx={{ p: '16px !important' }}>
                                        <Typography variant="caption" color="textSecondary">Ticket Médio</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formatCurrency(patient360.financial.averageTicket)}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Card variant="outlined">
                                    <CardContent sx={{ p: '16px !important' }}>
                                        <Typography variant="caption" color="textSecondary">Total Pagamentos</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{patient360.financial.totalPayments}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Atividade Recente */}
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#546e7a' }}>
                            Atividade Recente
                        </Typography>
                        <Card variant="outlined" sx={{ mb: 4 }}>
                            <List dense>
                                <ListItem>
                                    <Box sx={{ mr: 2, color: '#1976d2' }}><HistoryIcon /></Box>
                                    <ListItemText
                                        primary={patient360.activity.lastVisitDate ? `Última consulta: ${format(new Date(patient360.activity.lastVisitDate), 'dd/MM/yyyy', { locale: ptBR })}` : 'Nenhuma consulta registrada'}
                                        secondary={patient360.activity.lastVisitDoctor ? `${patient360.activity.lastVisitDoctor} (${patient360.activity.lastVisitSpecialty})` : ''}
                                    />
                                    {patient360.activity.daysSinceLastVisit !== null && (
                                        <Chip
                                            label={`${patient360.activity.daysSinceLastVisit} dias sem vir`}
                                            size="small"
                                            color={patient360.activity.daysSinceLastVisit > 30 ? 'error' : 'default'}
                                            variant="outlined"
                                        />
                                    )}
                                </ListItem>
                            </List>
                        </Card>

                        {/* Pacotes Ativos */}
                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#546e7a' }}>
                            Pacotes Ativos
                        </Typography>
                        {patient360.packages.length === 0 ? (
                            <Typography color="textSecondary" sx={{ mb: 2 }}>Nenhum pacote ativo no momento.</Typography>
                        ) : (
                            <Grid container spacing={2}>
                                {patient360.packages.map((pkg) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={pkg.id}>
                                        <Card variant="outlined" sx={{ borderColor: pkg.isExpiringSoon ? '#ef5350' : '#e0e0e0', position: 'relative' }}>
                                            <CardContent sx={{ p: 2 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                                                    {pkg.sessionType}
                                                </Typography>
                                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Progresso: {pkg.sessionsDone} / {pkg.totalSessions}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: pkg.isExpiringSoon ? '#d32f2f' : 'inherit' }}>
                                                        {pkg.remainingSessions} restantes
                                                    </Typography>
                                                </Box>
                                                {pkg.isExpiringSoon && (
                                                    <Chip
                                                        label="RENOVAR"
                                                        size="small"
                                                        color="error"
                                                        sx={{ mt: 1, height: 20, fontSize: '0.65rem', fontWeight: 'bold' }}
                                                    />
                                                )}
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                <Button onClick={onClose} variant="outlined" color="primary">Fechar</Button>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<WhatsAppIcon />}
                    onClick={handleWhatsApp}
                    disabled={!patient360?.patient.phone}
                >
                    Enviar WhatsApp (Amanda)
                </Button>
            </DialogActions>
        </Dialog>
    );
};
