import { useMemo, useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Paper,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Chip,
    Divider,
    Grid,
    Avatar,
} from '@mui/material';
import {
    TrackChanges,
    TrendingUp,
    CalendarToday,
    EventAvailable,
    Schedule,
    AttachMoney,
    AccountBalanceWallet,
    Receipt,
    Assessment,
} from '@mui/icons-material';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { FinancialLoading } from '../components/FinancialLoading';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatCurrency = (val: number) =>
    `R$ ${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const ProgressBar = ({ value, color }: { value: number; color?: any }) => (
    <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={color}
        sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'grey.100',
            '& .MuiLinearProgress-bar': { borderRadius: 4 }
        }}
    />
);

const GoalsTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState<number>(moment().tz(TIMEZONE).year());

    const years = Array.from({ length: 3 }, (_, i) => moment().tz(TIMEZONE).year() - i);

    const { plannings, fetchPlannings, refreshAllPlannings, loading: planningLoading } = usePlanning();
    const { data: dashboardData, loading: dashboardLoading, fetchDashboard } = useFinancialDashboard();

    useEffect(() => {
        fetchPlannings({});
    }, [fetchPlannings]);

    useEffect(() => {
        const mes = selectedMonth + 1;
        fetchDashboard(mes, selectedYear);
    }, [selectedMonth, selectedYear, fetchDashboard]);

    const planningDoMes = plannings.find(p => {
        if (p.type !== 'monthly') return false;
        const planStart = new Date(p.period.start);
        const planEnd = new Date(p.period.end);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        return planStart <= monthEnd && planEnd >= monthStart;
    });

    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    const planningSemanais = plannings.filter(p => {
        if (p.type !== 'weekly') return false;
        return p.period.start <= today && p.period.end >= today;
    });

    const metaMensal = planningDoMes?.targets?.expectedRevenue || 0;
    const periodoLabel = `${monthNames[selectedMonth]}/${selectedYear}`;

    const resumo = dashboardData?.resumo;
    const producao = resumo?.producao || 0;
    const recebido = resumo?.caixa || 0;
    const aReceber = resumo?.aReceber?.total || 0;
    const aReceberConvenio = resumo?.aReceber?.convenio || 0;
    const aReceberParticular = resumo?.aReceber?.particular || 0;
    
    // 🆕 Detalhamento do recebimento por mês de referência (convênios)
    const convenioDetail = dashboardData?.convenioDetail;
    const recebidoConvenioMesAtual = convenioDetail?.recebido?.mesAtual || 0;
    const recebidoConvenioMesesAnteriores = convenioDetail?.recebido?.mesesAnteriores || 0;
    const recebidoConvenioPorMes = convenioDetail?.recebido?.porMesReferencia || [];
    const agendadoConfirmado = resumo?.agendadoConfirmado || 0;
    const agendadoPendente = resumo?.pendenteConfirmacao || 0;
    const creditoPacotes = resumo?.creditoPacotes || 0;
    const convenioAgendado = resumo?.convenioAgendado || 0;

    // Particular-only dos agendados (evita dupla contagem com convenioAgendado)
    const agendadoParticularBruto = dashboardData?.camadas?.agendadoConfirmado?.detalhe?.particular
        ?? agendadoConfirmado;

    const aReceberHistorico = resumo?.aReceberHistorico?.total || 0;
    const aReceberHistoricoConvenio = resumo?.aReceberHistorico?.convenioAvulso || 0;
    const aReceberHistoricoSessoes = resumo?.aReceberHistorico?.sessoes || 0;

    const cenarioRealista = dashboardData?.cenarios?.realista?.valor || 0;

    const metrics = useMemo(() => {
        // Provisionamento = caixa + a receber + agendados particulares confirmados + convênios agendados (pacotes)
        // Usa particular-only de agendadoConfirmado para não duplicar convênio que já está em convenioAgendado
        const totalAgendadoConfirmado = agendadoParticularBruto + convenioAgendado;
        const totalComissionado = recebido + aReceber + totalAgendadoConfirmado;

        const projecaoRealista = cenarioRealista > 0 ? cenarioRealista :
            producao + (agendadoConfirmado * 0.85) +
            (convenioAgendado * 0.85) + (agendadoPendente * 0.40);

        if (metaMensal === 0) {
            return {
                producao,
                recebido,
                agendadoConfirmado,
                agendadoPendente,
                creditoPacotes,
                convenioAgendado,
                totalAgendadoConfirmado,
                projecaoRealista,
                percentualProducao: 0,
                percentualAgendado: 0,
                percentualRecebido: 0,
                percentualProjecao: 0,
                totalComissionado,
            };
        }

        return {
            producao,
            recebido,
            agendadoConfirmado,
            agendadoPendente,
            creditoPacotes,
            convenioAgendado,
            totalAgendadoConfirmado,
            projecaoRealista,
            percentualProducao: Math.min((producao / metaMensal) * 100, 100),
            percentualAgendado: Math.min((totalComissionado / metaMensal) * 100, 100),
            percentualRecebido: Math.min((recebido / metaMensal) * 100, 100),
            percentualProjecao: Math.min((projecaoRealista / metaMensal) * 100, 100),
            totalComissionado,
        };
    }, [producao, recebido, aReceber, metaMensal, agendadoConfirmado, agendadoParticularBruto, agendadoPendente, convenioAgendado, cenarioRealista]);

    if (dashboardLoading || planningLoading) return <FinancialLoading />;

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Header com título e filtros */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    borderRadius: 2,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                        <Assessment sx={{ fontSize: 24, color: 'white' }} />
                    </Avatar>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: 'grey.900' }}>
                            Metas & Provisão
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                            Acompanhamento mensal de metas e projeções
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Mês</InputLabel>
                        <Select value={selectedMonth} label="Mês" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                            {monthNames.map((name, idx) => (
                                <MenuItem key={idx} value={idx}>{name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Ano</InputLabel>
                        <Select value={selectedYear} label="Ano" onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* Legenda explicativa em grid compacto */}
            <Paper variant="outlined" sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" fontWeight="600" gutterBottom>
                    📋 Como ler este painel
                </Typography>
                <Grid container spacing={1}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Produção Clínica</strong> — valor de todas as sessões realizadas no mês (independente de pagamento).
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Provisionamento</strong> — caixa recebido + a receber (convênio atendido + particular) + agendamentos confirmados até fim do mês. Representa o total previsto de entrar.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Recebido (Caixa)</strong> — dinheiro que efetivamente entrou na conta (pagamentos confirmados).
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Projeção de Fechamento</strong> — estimativa aplicando taxas de conversão: 85% dos confirmados + 40% dos pendentes.
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {metaMensal === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Nenhuma meta cadastrada para <strong>{periodoLabel}</strong>. Cadastre em <strong>Planejamento Anual</strong>.
                </Alert>
            ) : (
                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip label="Meta do mês" size="small" sx={{ bgcolor: '#8B5CF6', color: 'white', fontWeight: 500 }} />
                    <Typography variant="body1" fontWeight="bold">{formatCurrency(metaMensal)}</Typography>
                </Box>
            )}

            {/* Cards principais em grid 2x2 */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Produção Clínica */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#10B98115', width: 40, height: 40 }}>
                                    <TrendingUp sx={{ color: '#10B981' }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Produção Clínica</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#10B981">
                                        {formatCurrency(metrics.producao)}
                                    </Typography>
                                </Box>
                            </Box>
                            {metaMensal > 0 && (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                        <Typography variant="caption" fontWeight="600">{metrics.percentualProducao.toFixed(1)}%</Typography>
                                    </Box>
                                    <ProgressBar value={metrics.percentualProducao} color="success" />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Provisionamento */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#3B82F615', width: 40, height: 40 }}>
                                    <EventAvailable sx={{ color: '#3B82F6' }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Provisionamento</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                                        {formatCurrency(metrics.totalComissionado)}
                                    </Typography>
                                </Box>
                            </Box>
                            {metaMensal > 0 && (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                        <Typography variant="caption" fontWeight="600">{metrics.percentualAgendado.toFixed(1)}%</Typography>
                                    </Box>
                                    <ProgressBar value={metrics.percentualAgendado} color="primary" />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recebido (Caixa) */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#0EA5E915', width: 40, height: 40 }}>
                                    <TrackChanges sx={{ color: '#0EA5E9' }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Recebido (Caixa)</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#0EA5E9">
                                        {formatCurrency(metrics.recebido)}
                                    </Typography>
                                </Box>
                            </Box>
                            
                            {/* 🆕 Detalhamento do recebimento */}
                            {recebidoConvenioMesesAnteriores > 0 && (
                                <Box sx={{ mb: 1.5, p: 1, bgcolor: '#FEF3C7', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        ⚠️ Inclui {formatCurrency(recebidoConvenioMesesAnteriores)} de meses anteriores
                                    </Typography>
                                </Box>
                            )}
                            
                            {metaMensal > 0 && (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">vs Meta</Typography>
                                        <Typography variant="caption" fontWeight="600">{metrics.percentualRecebido.toFixed(1)}%</Typography>
                                    </Box>
                                    <ProgressBar value={metrics.percentualRecebido} color="info" />
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                                        *Base: Produção do mês (não recebimento)
                                    </Typography>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Projeção de Fechamento */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%', bgcolor: '#8B5CF605' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#8B5CF615', width: 40, height: 40 }}>
                                    <Schedule sx={{ color: '#8B5CF6' }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Projeção de Fechamento</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#8B5CF6">
                                        {formatCurrency(metrics.projecaoRealista)}
                                    </Typography>
                                </Box>
                            </Box>
                            {metaMensal > 0 && (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Estimativa</Typography>
                                        <Typography variant="caption" fontWeight="600">{metrics.percentualProjecao.toFixed(1)}%</Typography>
                                    </Box>
                                    <ProgressBar value={metrics.percentualProjecao} color="secondary" />
                                    <Typography variant="caption" color={metrics.projecaoRealista >= metaMensal ? 'success.main' : 'warning.main'} sx={{ mt: 1, display: 'block' }}>
                                        {metrics.projecaoRealista >= metaMensal
                                            ? '✅ Meta atingível'
                                            : `Falta ${formatCurrency(metaMensal - metrics.projecaoRealista)}`}
                                    </Typography>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Card A Receber Total (histórico — todos os meses) */}
            {aReceberHistorico > 0 && (
                <Card elevation={0} sx={{ border: '2px solid', borderColor: '#EF444440', borderRadius: 2, mb: 3, bgcolor: '#EF444405' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{ bgcolor: '#EF444415', width: 40, height: 40 }}>
                                    <AccountBalanceWallet sx={{ color: '#EF4444' }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">A Receber — Total Acumulado</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="#EF4444">
                                        {formatCurrency(aReceberHistorico)}
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Todos os meses em aberto
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {aReceberHistoricoConvenio > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    🏥 Convênio (guias faturadas não recebidas): <strong>{formatCurrency(aReceberHistoricoConvenio)}</strong>
                                </Typography>
                            )}
                            {aReceberHistoricoSessoes > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    📋 Sessões não pagas (pacotes + particular): <strong>{formatCurrency(aReceberHistoricoSessoes)}</strong>
                                </Typography>
                            )}
                        </Box>
                        <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
                            ⚠️ Este valor não entra no Provisionamento mensal — é um indicador de inadimplência/pendência acumulada.
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* 🆕 Tabela de Recebimento por Mês de Referência */}
            {recebidoConvenioPorMes.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#F0F9FF' }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom display="flex" alignItems="center" gap={1}>
                        📊 Recebimento de Convênios — Detalhado por Mês de Referência
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        Mostra de qual mês veio cada recebimento recebido neste período
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                        {recebidoConvenioPorMes.map((item: any) => {
                            const [ano, mes] = item.mes.split('-');
                            const mesNome = monthNames[parseInt(mes) - 1];
                            const isMesAtual = item.mes === `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
                            return (
                                <Box 
                                    key={item.mes}
                                    sx={{ 
                                        p: 1.5, 
                                        bgcolor: isMesAtual ? '#10B98120' : 'white', 
                                        border: '1px solid',
                                        borderColor: isMesAtual ? '#10B981' : 'grey.200',
                                        borderRadius: 1.5,
                                        minWidth: 140
                                    }}
                                >
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {mesNome} {ano} {isMesAtual && '✓'}
                                    </Typography>
                                    <Typography variant="body1" fontWeight="bold" color={isMesAtual ? 'success.main' : 'text.primary'}>
                                        {formatCurrency(item.total)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {item.count} pagamento(s)
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                    {recebidoConvenioMesesAnteriores > 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <strong>Dica:</strong> Você recebeu {formatCurrency(recebidoConvenioMesesAnteriores)} referente a meses anteriores. 
                            A meta do mês deve ser comparada com a <strong>Produção Clínica</strong>, não com o Recebido.
                        </Alert>
                    )}
                </Paper>
            )}

            {/* Detalhamento do Provisionamento */}
            <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="600" gutterBottom>📦 Composição do Provisionamento</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    O provisionamento soma tudo que está garantido ou confirmado de entrar até o fim do mês.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
                            💰 <strong>Caixa recebido</strong>
                        </Typography>
                        <Typography variant="body2" fontWeight="600">{formatCurrency(recebido)}</Typography>
                        <Typography variant="caption" color="text.secondary">— dinheiro já na conta</Typography>
                    </Box>
                    {aReceber > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
                                📋 <strong>A receber</strong>
                            </Typography>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(aReceber)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                — sessões já realizadas aguardando pagamento
                                {aReceberConvenio > 0 && ` (conv. ${formatCurrency(aReceberConvenio)}`}
                                {aReceberConvenio > 0 && aReceberParticular > 0 && ` + part. ${formatCurrency(aReceberParticular)})`}
                                {aReceberConvenio > 0 && aReceberParticular === 0 && `)`}
                            </Typography>
                        </Box>
                    )}
                    {agendadoParticularBruto > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
                                📅 <strong>Agendados particulares</strong>
                            </Typography>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(agendadoParticularBruto)}</Typography>
                            <Typography variant="caption" color="text.secondary">— consultas/sessões particulares confirmadas até 31/{String(selectedMonth + 1).padStart(2,'0')}</Typography>
                        </Box>
                    )}
                    {convenioAgendado > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
                                🏥 <strong>Convênios agendados</strong>
                            </Typography>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(convenioAgendado)}</Typography>
                            <Typography variant="caption" color="text.secondary">— sessões de convênio (pacotes) confirmadas até 31/{String(selectedMonth + 1).padStart(2,'0')}</Typography>
                        </Box>
                    )}
                    {agendadoPendente > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200 }}>
                                ⏳ <strong>Pendentes de confirmação</strong>
                            </Typography>
                            <Typography variant="body2" fontWeight="600">{formatCurrency(agendadoPendente)}</Typography>
                            <Typography variant="caption" color="text.secondary">— agendamentos ainda sem confirmação (NÃO entram no provisionamento)</Typography>
                        </Box>
                    )}
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: 200, fontWeight: 700 }}>
                            = Total Provisionado
                        </Typography>
                        <Typography variant="body2" fontWeight="700" color="primary.main">
                            {formatCurrency(recebido + aReceber + agendadoParticularBruto + convenioAgendado)}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* Detalhamento da Projeção (igual ao antigo) */}
            {metaMensal > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#8B5CF605' }}>
                    <Typography variant="subtitle2" fontWeight="600" gutterBottom>🔮 Cálculo da Projeção</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Base garantida (caixa + a receber) + 85% avulsos confirmados + 85% convênios + 40% pendentes
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            💰 Base garantida: <strong>{formatCurrency(recebido + aReceber)}</strong>
                        </Typography>
                        {agendadoConfirmado > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                📅 +85% avulsos = <strong>{formatCurrency(agendadoConfirmado * 0.85)}</strong>
                            </Typography>
                        )}
                        {convenioAgendado > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                🏥 +85% convênios = <strong>{formatCurrency(convenioAgendado * 0.85)}</strong>
                            </Typography>
                        )}
                        {agendadoPendente > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                ⏳ +40% pendentes = <strong>{formatCurrency(agendadoPendente * 0.40)}</strong>
                            </Typography>
                        )}
                    </Box>
                </Paper>
            )}

            {/* Metas Mensal e Semanal lado a lado */}
            {(planningDoMes || planningSemanais.length > 0) && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarToday fontSize="small" sx={{ color: '#6B7280' }} />
                        Metas do Período
                    </Typography>
                    <Grid container spacing={2}>
                        {/* Metas Semanais - PRIMEIRO */}
                        {planningSemanais.map((pw: any) => {
                            const pct = pw.progress?.revenuePercentage || 0;
                            return (
                                <Grid item xs={12} sm={planningDoMes ? 6 : 6} key={pw._id}>
                                    <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#F59E0B80', bgcolor: '#F59E0B05' }}>
                                        <CardContent sx={{ py: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                <Typography variant="body2" fontWeight="600" color="#F59E0B">
                                                    <CalendarToday fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                                    Meta Semanal
                                                </Typography>
                                                <Chip
                                                    size="small"
                                                    label={pw.progress?.overallStatus === 'achieved' ? 'Atingido' : pct >= 80 ? 'No caminho' : 'Em risco'}
                                                    color={pw.progress?.overallStatus === 'achieved' ? 'success' : pct >= 80 ? 'primary' : 'warning'}
                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                                {moment(pw.period.start).format('DD/MM')} – {moment(pw.period.end).format('DD/MM/YYYY')}
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">
                                                    Meta: <strong>{formatCurrency(pw.targets?.expectedRevenue || 0)}</strong>
                                                </Typography>
                                                <Typography variant="body2">
                                                    Real: <strong>{formatCurrency(pw.actual?.actualRevenue || 0)}</strong>
                                                </Typography>
                                            </Box>
                                            <ProgressBar value={pct} color={pct >= 100 ? 'success' : 'primary'} />
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                {pct.toFixed(0)}% da meta semanal
                                            </Typography>
                                            {pct < 100 && (pw.targets?.expectedRevenue || 0) > 0 && (
                                                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
                                                    Falta {formatCurrency((pw.targets?.expectedRevenue || 0) - (pw.actual?.actualRevenue || 0))} para atingir a meta
                                                </Typography>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                        
                        {/* Meta Mensal - DEPOIS */}
                        {planningDoMes && (
                            <Grid item xs={12} sm={planningSemanais.length > 0 ? 6 : 12}>
                                <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#8B5CF680', bgcolor: '#8B5CF605' }}>
                                    <CardContent sx={{ py: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="body2" fontWeight="600" color="#8B5CF6">
                                                <Schedule fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                                Meta Mensal
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={planningDoMes.progress?.overallStatus === 'achieved' ? 'Atingido' : planningDoMes.progress?.revenuePercentage >= 80 ? 'No caminho' : 'Em risco'}
                                                color={planningDoMes.progress?.overallStatus === 'achieved' ? 'success' : planningDoMes.progress?.revenuePercentage >= 80 ? 'primary' : 'warning'}
                                                sx={{ height: 20, fontSize: '0.65rem' }}
                                            />
                                        </Box>
                                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                                            {moment(planningDoMes.period.start).format('DD/MM')} – {moment(planningDoMes.period.end).format('DD/MM/YYYY')}
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2">
                                                Meta: <strong>{formatCurrency(planningDoMes.targets?.expectedRevenue || 0)}</strong>
                                            </Typography>
                                            <Typography variant="body2">
                                                Real: <strong>{formatCurrency(planningDoMes.actual?.actualRevenue || 0)}</strong>
                                            </Typography>
                                        </Box>
                                        {(() => {
                                            const realizado = planningDoMes.actual?.actualRevenue || 0;
                                            const pctMensal = metaMensal > 0 ? Math.min((realizado / metaMensal) * 100, 100) : 0;
                                            return (
                                                <>
                                                    <ProgressBar value={pctMensal} color={pctMensal >= 100 ? 'success' : 'primary'} />
                                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                        {pctMensal.toFixed(0)}% da meta mensal
                                                    </Typography>
                                                    {pctMensal < 100 && metaMensal > 0 && (
                                                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
                                                            Falta {formatCurrency(metaMensal - realizado)} para atingir a meta
                                                        </Typography>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

            

            {/* Rodapé informativo */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary">
                    💡 <strong>Produção</strong> = sessões realizadas (independente de pagamento) &nbsp;|&nbsp;
                    <strong>Provisionamento</strong> = caixa + a receber + agendados confirmados até fim do mês &nbsp;|&nbsp;
                    <strong>Recebido</strong> = dinheiro efetivamente na conta &nbsp;|&nbsp;
                    <strong>Projeção</strong> = estimativa com taxas de conversão (85% confirmados + 40% pendentes)
                </Typography>
            </Paper>
        </Box>
    );
};

export default GoalsTab;