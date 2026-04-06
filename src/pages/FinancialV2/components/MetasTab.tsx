import { useState } from 'react';
import { 
    Card, CardContent, Typography, Box, Button, Chip, LinearProgress, 
    Grid, Alert, Divider, Tooltip 
} from '@mui/material';
import { 
    TrendingUp, TrendingDown, TrackChanges, Settings, Calculate,
    Speed, CalendarToday, Today, Flag, TrendingFlat,
    Warning, CheckCircle, ArrowUpward, ArrowDownward, Radar
} from '@mui/icons-material';
import { useIntelligence } from '../hooks/useIntelligence';
import { FinancialLoading } from './FinancialLoading';
import { GoalConfigModal } from './GoalConfigModal';
import { formatCurrency } from '../../../utils/format';

export const MetasTab = () => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [configOpen, setConfigOpen] = useState(false);
    
    const { data: intel, isLoading } = useIntelligence(selectedMonth, selectedYear);
    
    if (isLoading) return <FinancialLoading cardCount={6} />;
    
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const hasGoal = intel?.metas.mensal && intel.metas.mensal > 0;
    
    if (!hasGoal || !intel) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <TrackChanges sx={{ color: 'primary.main', fontSize: 28 }} />
                        <Box>
                            <Typography variant="h5" fontWeight="bold">Metas</Typography>
                            <Typography variant="body2" color="text.secondary">{monthNames[selectedMonth - 1]} de {selectedYear}</Typography>
                        </Box>
                    </Box>
                    <Button variant="outlined" startIcon={<Settings />} onClick={() => setConfigOpen(true)}>
                        Configurar
                    </Button>
                </Box>
                <Alert severity="info">
                    <Typography variant="subtitle2" fontWeight="bold">Nenhuma meta configurada</Typography>
                    <Typography variant="body2">Clique em "Configurar" para definir sua meta de receita.</Typography>
                </Alert>
                <GoalConfigModal open={configOpen} onClose={() => setConfigOpen(false)} month={selectedMonth} year={selectedYear} />
            </Box>
        );
    }
    
    // Status colors e labels
    const statusConfig = {
        achieved: { color: '#10b981', label: '✅ Meta Atingida!', icon: <CheckCircle /> },
        on_track: { color: '#10b981', label: '🟢 No Caminho', icon: <TrendingUp /> },
        at_risk: { color: '#f59e0b', label: '🟡 Atenção', icon: <Warning /> },
        behind: { color: '#ef4444', label: '🔴 Em Risco', icon: <TrendingDown /> },
        no_goal: { color: '#6b7280', label: 'Sem meta', icon: <TrendingFlat /> }
    };
    
    const status = statusConfig[intel.progresso.status];
    const ritmoStatus = intel.ritmo.isOnTrack ? 'success' : intel.ritmo.atual >= intel.ritmo.necessario * 0.85 ? 'warning' : 'error';
    const ritmoColor = ritmoStatus === 'success' ? '#10b981' : ritmoStatus === 'warning' ? '#f59e0b' : '#ef4444';
    
    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <TrackChanges sx={{ color: 'primary.main', fontSize: 28 }} />
                    <Box>
                        <Typography variant="h5" fontWeight="bold">Metas</Typography>
                        <Typography variant="body2" color="text.secondary">{monthNames[selectedMonth - 1]} de {selectedYear}</Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    >
                        {monthNames.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                    <Button variant="outlined" startIcon={<Settings />} onClick={() => setConfigOpen(true)}>
                        Configurar
                    </Button>
                </Box>
            </Box>
            
            {/* Card Principal - Meta Mensal */}
            <Card sx={{ mb: 3, borderLeft: `4px solid ${status.color}`, bgcolor: `${status.color}10` }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Flag /> Meta Mensal
                        </Typography>
                        <Chip 
                            icon={status.icon} 
                            label={status.label} 
                            size="small" 
                            sx={{ bgcolor: status.color, color: 'white', fontWeight: 'bold' }} 
                        />
                    </Box>
                    
                    <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Meta</Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: '#8b5cf6' }}>
                                {formatCurrency(intel.metas.mensal)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Realizado</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">
                                {formatCurrency(intel.realizado.mensal)}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Typography variant="body2" color="text.secondary">Falta</Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ color: intel.gap.mensal > 0 ? '#ef4444' : '#10b981' }}>
                                {intel.gap.mensal > 0 ? formatCurrency(intel.gap.mensal) : '✅'}
                            </Typography>
                        </Grid>
                    </Grid>
                    
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Progresso: {intel.progresso.percentual.toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" sx={{ color: status.color }}>
                                {intel.period.daysElapsed} de {intel.period.daysInMonth} dias
                            </Typography>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={Math.min(intel.progresso.percentual, 100)}
                            sx={{ 
                                height: 12, 
                                borderRadius: 6,
                                bgcolor: '#e5e7eb',
                                '& .MuiLinearProgress-bar': { bgcolor: status.color, borderRadius: 6 }
                            }}
                        />
                    </Box>
                </CardContent>
            </Card>
            
            {/* Cards de Metas Derivadas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* Meta Diária */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #3b82f6' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Today sx={{ color: '#3b82f6', fontSize: 20 }} />
                                <Typography variant="body2" color="text.secondary">Meta Diária</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#3b82f6' }}>
                                {formatCurrency(intel.metas.diaria)}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Hoje</Typography>
                            <Typography variant="h6" fontWeight="bold" sx={{ 
                                color: intel.realizado.diario >= intel.metas.diaria ? '#10b981' : '#ef4444' 
                            }}>
                                {formatCurrency(intel.realizado.diario)}
                            </Typography>
                            {intel.realizado.diario < intel.metas.diaria && (
                                <Typography variant="caption" color="error.main">
                                    Falta: {formatCurrency(intel.gap.diario)}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                
                {/* Meta Semanal */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #ec4899' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <CalendarToday sx={{ color: '#ec4899', fontSize: 20 }} />
                                <Typography variant="body2" color="text.secondary">Meta Semanal</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>
                                {formatCurrency(intel.metas.semanal)}
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Esta semana</Typography>
                            <Typography variant="h6" fontWeight="bold" sx={{ 
                                color: intel.realizado.semanal >= intel.metas.semanal ? '#10b981' : '#f59e0b' 
                            }}>
                                {formatCurrency(intel.realizado.semanal)}
                            </Typography>
                            {intel.realizado.semanal < intel.metas.semanal && (
                                <Typography variant="caption" color="text.secondary">
                                    Falta: {formatCurrency(intel.gap.semanal)}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                
                {/* Ritmo Atual */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderLeft: `4px solid ${ritmoColor}` }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Speed sx={{ color: ritmoColor, fontSize: 20 }} />
                                <Typography variant="body2" color="text.secondary">Ritmo Atual</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: ritmoColor }}>
                                {formatCurrency(intel.ritmo.atual)}/dia
                            </Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Necessário</Typography>
                            <Typography variant="h6" fontWeight="bold">
                                {formatCurrency(intel.ritmo.necessario)}/dia
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                {intel.ritmo.isOnTrack ? (
                                    <ArrowUpward sx={{ color: '#10b981', fontSize: 16 }} />
                                ) : (
                                    <ArrowDownward sx={{ color: '#ef4444', fontSize: 16 }} />
                                )}
                                <Typography variant="caption" sx={{ color: intel.ritmo.isOnTrack ? '#10b981' : '#ef4444' }}>
                                    {intel.ritmo.isOnTrack ? 'Acima' : 'Abaixo'} do necessário
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                
                {/* Dias Restantes */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%', borderLeft: '4px solid #f59e0b' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Radar sx={{ color: '#f59e0b', fontSize: 20 }} />
                                <Typography variant="body2" color="text.secondary">Tempo Restante</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
                                {intel.period.daysRemaining}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">dias</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                Dia {intel.period.daysElapsed} de {intel.period.daysInMonth}
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={(intel.period.daysElapsed / intel.period.daysInMonth) * 100}
                                sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#e5e7eb' }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            
            {/* Projeções */}
            <Card sx={{ mb: 3, borderLeft: '4px solid #6366f1' }}>
                <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp /> Projeção de Fechamento
                    </Typography>
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                                <Typography variant="body2" color="text.secondary">Pessimista</Typography>
                                <Typography variant="h5" fontWeight="bold" color="error.main">
                                    {formatCurrency(intel.projecao.pessimista)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {intel.projecao.vsMeta < 100 ? `${(100 - intel.projecao.vsMeta).toFixed(0)}% abaixo` : 'Na meta'}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
                                <Typography variant="body2" color="text.secondary">Realista</Typography>
                                <Typography variant="h5" fontWeight="bold" sx={{ color: intel.projecao.realista >= intel.metas.mensal ? '#10b981' : '#f59e0b' }}>
                                    {formatCurrency(intel.projecao.realista)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {intel.projecao.vsMeta.toFixed(0)}% da meta
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, border: '1px solid #bfdbfe' }}>
                                <Typography variant="body2" color="text.secondary">Otimista</Typography>
                                <Typography variant="h5" fontWeight="bold" color="primary.main">
                                    {formatCurrency(intel.projecao.otimista)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {intel.projecao.otimista >= intel.metas.mensal ? 'Acima da meta!' : 'Ainda abaixo'}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                    
                    <Alert severity={intel.projecao.realista >= intel.metas.mensal ? 'success' : 'warning'} sx={{ mt: 2 }}>
                        <Typography variant="body2" fontWeight="bold">
                            {intel.projecao.realista >= intel.metas.mensal 
                                ? '✅ Projeção indica que você vai bater a meta!' 
                                : `⚠️ Projeção indica que você NÃO vai bater a meta. Faltam ${formatCurrency(intel.metas.mensal - intel.projecao.realista)}.`
                            }
                        </Typography>
                    </Alert>
                </CardContent>
            </Card>
            
            {/* GAP e O que precisa fazer */}
            {intel.gap.mensal > 0 && (
                <Card sx={{ mb: 3, bgcolor: '#fef3c7', borderLeft: '4px solid #f59e0b' }}>
                    <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calculate /> 💥 GAP Total - O que falta para bater a meta
                        </Typography>
                        
                        <Typography variant="h3" fontWeight="bold" color="error.main" sx={{ mb: 2 }}>
                            {formatCurrency(intel.gap.mensal)}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Você precisa de <strong>uma dessas opções</strong>:
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                                        {intel.gap.sessoesNecessarias}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        sessões a <strong>R$ {intel.gap.ticketMedio}</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        (atendimentos avulsos)
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#ec4899' }}>
                                        {intel.gap.pacotesNecessarios}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        pacotes a <strong>{formatCurrency(intel.gap.valorPacote)}</strong>
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        (vendas de pacotes)
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid #e5e7eb' }}>
                                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#8b5cf6' }}>
                                        {formatCurrency(intel.ritmo.necessario)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>por dia</strong> nos próximos
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {intel.period.daysRemaining} dias restantes
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}
            
            {/* Meta Atingida */}
            {intel.progresso.status === 'achieved' && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="h6" fontWeight="bold">🎉 PARABÉNS! Meta Atingida!</Typography>
                    <Typography variant="body2">
                        Você já atingiu {formatCurrency(intel.realizado.mensal)} da meta de {formatCurrency(intel.metas.mensal)}!
                    </Typography>
                </Alert>
            )}
            
            <GoalConfigModal open={configOpen} onClose={() => setConfigOpen(false)} month={selectedMonth} year={selectedYear} />
        </Box>
    );
};

export default MetasTab;
