import { Alert, Box, Card, CardContent, Chip, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Divider, Avatar, LinearProgress, Tabs, Tab, Badge } from '@mui/material';
import { FinancialLoading } from './components/FinancialLoading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { CashflowSummary, cashflowService, CashflowV2Response } from '../../services/cashflowService';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';

const CashflowTab = () => {
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [filters, setFilters] = useState({
        period: 'day', // Padrão é 'day' para usar o novo endpoint V2
        date: new Date().toISOString().split('T')[0],
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (filters.period === 'day') {
                // 🆕 NOVO: Usa endpoint V2 para caixa diário
                const res = await cashflowService.getDailyCashflow(filters.date);
                setDailyCashflow(res.data);
                setSummary(null);
            } else {
                // Usa endpoint antigo para períodos maiores
                const params = { period: 'month', month: filters.month, year: filters.year };
                const res = await cashflowService.getSummary(params);
                setSummary(res.data);
                setDailyCashflow(null);
            }
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setDailyCashflow(null);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Agrupar agendamentos por paciente para evitar repetição
    const agendamentosAgrupados = summary?.data?.atividade?.agendamentosCriados?.itens?.reduce((acc: any, item: any) => {
        const key = item.paciente;
        if (!acc[key]) {
            acc[key] = {
                paciente: item.paciente,
                especialidade: item.especialidade,
                agendamentos: [],
                total: 0
            };
        }
        acc[key].agendamentos.push({
            data: item.dataAgendada,
            hora: item.hora,
            valor: item.valor
        });
        acc[key].total += item.valor;
        return acc;
    }, {}) || {};

    const agendamentosResumidos = Object.values(agendamentosAgrupados);

    return (
        <Box>
            {/* Filtro de período - mais clean */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        select
                        label="Período"
                        size="small"
                        value={filters.period}
                        onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
                        sx={{ minWidth: 100, flex: { xs: 1, md: 'none' }, maxWidth: { xs: 120, md: 'none' } }}
                    >
                        <MenuItem value="day">Hoje</MenuItem>
                        <MenuItem value="month">Este mês</MenuItem>
                    </TextField>

                    {filters.period === 'day' ? (
                        <TextField
                            type="date"
                            label="Data"
                            size="small"
                            value={filters.date}
                            onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: { xs: 1, md: 'none' } }}
                        />
                    ) : (
                        <>
                            <TextField
                                select
                                label="Mês"
                                size="small"
                                value={filters.month}
                                onChange={(e) => setFilters((prev) => ({ ...prev, month: Number(e.target.value) }))}
                                sx={{ minWidth: 80, flex: { xs: 1, md: 'none' }, maxWidth: { xs: '50%', md: 'none' } }}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <MenuItem key={i + 1} value={i + 1}>
                                        {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                select
                                label="Ano"
                                size="small"
                                value={filters.year}
                                onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
                                sx={{ minWidth: 70, flex: { xs: 1, md: 'none' }, maxWidth: { xs: '50%', md: 'none' } }}
                            >
                                {[2024, 2025, 2026].map((y) => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </TextField>
                        </>
                    )}

                    <Box sx={{ ml: { xs: 0, md: 'auto' }, display: 'flex', alignItems: 'center', gap: 1, width: { xs: 'auto', md: 'auto' } }}>
                        <Chip 
                            size="small" 
                            icon={<CalendarTodayIcon />} 
                            label={summary?.period?.label || 'Carregando...'}
                            variant="outlined"
                        />
                    </Box>
                </Box>
            </Paper>

            {loading ? (
                <FinancialLoading cardCount={4} />
            ) : dailyCashflow ? (
                // 🆕 NOVO: Visualização do Caixa Diário V2
                <DailyCashflowView data={dailyCashflow.data} formatCurrency={formatCurrency} />
            ) : summary ? (
                <>
                    {/* Cards Financeiros - Redesenhados com dados reais da API */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A20', borderRadius: 2, bgcolor: '#16A34A05' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#16A34A', width: 40, height: 40 }}>
                                            <AttachMoneyIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Receitas
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#16A34A">
                                                {formatCurrency(summary?.financeiro?.receitas?.total || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.financeiro?.receitas?.count || 0} pagamentos
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {Object.entries(summary?.financeiro?.receitas?.porMetodo || {})
                                                .filter(([_, v]) => v > 0)
                                                .map(([metodo]) => metodo)
                                                .join(' • ')}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#DC262620', borderRadius: 2, bgcolor: '#DC262605' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#DC2626', width: 40, height: 40 }}>
                                            <ReceiptIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Despesas
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#DC2626">
                                                {formatCurrency(summary?.financeiro?.despesas?.total || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.financeiro?.despesas?.count || 0} despesas
                                        </Typography>
                                        {summary?.financeiro?.despesas?.total === 0 && (
                                            <Chip size="small" label="Sem despesas" color="success" variant="outlined" />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ 
                                border: '1px solid', 
                                borderColor: summary?.financeiro?.status === 'positive' ? '#16A34A30' : '#DC262630', 
                                borderRadius: 2,
                                bgcolor: summary?.financeiro?.status === 'positive' ? '#16A34A05' : '#DC262605'
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: summary?.financeiro?.status === 'positive' ? '#16A34A' : '#DC2626', width: 40, height: 40 }}>
                                            <TrendingUpIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Saldo
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color={summary?.financeiro?.status === 'positive' ? '#16A34A' : '#DC2626'}>
                                                {formatCurrency(summary?.financeiro?.saldo || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Chip
                                            size="small"
                                            label={summary?.financeiro?.status === 'positive' ? 'Positivo' : 'Negativo'}
                                            color={summary?.financeiro?.status === 'positive' ? 'success' : 'error'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.operacional?.atendimentosRealizados || 0} atendimentos
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#7C3AED20', borderRadius: 2, bgcolor: '#7C3AED05' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#7C3AED', width: 40, height: 40 }}>
                                            <InventoryIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Indicadores
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#7C3AED">
                                                {formatCurrency(summary?.indicadores?.ticketMedio || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Ticket médio
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.operacional?.conversao || 0}% conversão
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Seção de Atividade do Período - Mais limpa e organizada */}
                    <Grid container spacing={3}>
                        {/* Agendamentos Criados */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ bgcolor: '#0284C7', width: 32, height: 32 }}>
                                            <CalendarTodayIcon sx={{ fontSize: 18 }} />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="600">
                                            Agendamentos
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${summary?.operacional?.agendamentosCriados?.count || 0} novos`}
                                        color="primary"
                                        size="small"
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor potencial</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="#0284C7">
                                            {formatCurrency(summary?.operacional?.agendamentosCriados?.valorPotencial || 0)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Pacientes</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {Object.keys(agendamentosAgrupados).length}
                                        </Typography>
                                    </Box>
                                </Box>

                                {agendamentosResumidos.length > 0 ? (
                                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                        {agendamentosResumidos.map((grupo: any, idx: number) => (
                                            <Box key={idx} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {grupo.paciente}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="600" color="#0284C7">
                                                        {formatCurrency(grupo.total)}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                    {grupo.especialidade} • {grupo.agendamentos.length} sessões
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {grupo.agendamentos.map((ag: any, i: number) => (
                                                        <Chip
                                                            key={i}
                                                            size="small"
                                                            label={`${format(new Date(ag.data), 'dd/MM')} ${ag.hora}`}
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Nenhum agendamento criado neste período
                                    </Alert>
                                )}
                            </Paper>
                        </Grid>

                        {/* Pacotes Criados */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ bgcolor: '#16A34A', width: 32, height: 32 }}>
                                            <InventoryIcon sx={{ fontSize: 18 }} />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="600">
                                            Pacotes
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${summary?.operacional?.pacotesCriados?.count || 0} novos`}
                                        color="success"
                                        size="small"
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor total</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="#16A34A">
                                            {formatCurrency(summary?.operacional?.pacotesCriados?.valorTotal || 0)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor médio</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {formatCurrency(summary?.indicadores?.valorMedioPacote || 0)}
                                        </Typography>
                                    </Box>
                                </Box>

                                {summary?.operacional?.pacotesCriados?.itens?.length > 0 ? (
                                    <Box>
                                        {summary?.operacional?.pacotesCriados?.itens?.map((item: any) => (
                                            <Box key={item.id} sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1, mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {item.paciente}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={item.statusPagamento === 'paid' ? 'Pago' : 'Pendente'}
                                                        color={item.statusPagamento === 'paid' ? 'success' : 'warning'}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {item.especialidade} • {item.sessoes} sessões
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold" color="#16A34A" sx={{ mt: 1 }}>
                                                    {formatCurrency(item.valor)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Nenhum pacote criado neste período
                                    </Alert>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Mini resumo no rodapé - opcional */}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Atendimentos realizados: {summary?.operacional?.atendimentosRealizados || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            • Eficiência: {summary?.indicadores?.eficiencia || 0}%
                        </Typography>
                    </Box>
                </>
            ) : (
                <FinancialLoading cardCount={4} />
            )}
        </Box>
    );
};

// 🆕 NOVO: Componente para visualização do Caixa Diário V2
interface DailyCashflowViewProps {
    data: CashflowV2Response['data'];
    formatCurrency: (value: number) => string;
}

const DailyCashflowView = ({ data, formatCurrency }: DailyCashflowViewProps) => {
    const [activeTab, setActiveTab] = useState(0);

    const caixa = data.caixa;
    const producao = data.producao;
    const comparativos = data.comparativos;
    const pendentes = data.pendentesCobranca || [];

    return (
        <Box>
            {/* Cards Principais */}
            <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 3 }}>
                {/* Caixa Total */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A30', borderRadius: 2, bgcolor: '#16A34A08' }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                💰 Caixa do Dia
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="#16A34A">
                                {formatCurrency(caixa.total)}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {caixa.pix > 0 && <Chip size="small" label={`Pix: ${formatCurrency(caixa.pix)}`} color="success" variant="outlined" />}
                                {caixa.cartao > 0 && <Chip size="small" label={`Card: ${formatCurrency(caixa.cartao)}`} color="primary" variant="outlined" />}
                                {caixa.dinheiro > 0 && <Chip size="small" label={`Din: ${formatCurrency(caixa.dinheiro)}`} color="warning" variant="outlined" />}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Produção */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#3B82F630', borderRadius: 2, bgcolor: '#3B82F608' }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                📊 Produção Total
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                                {formatCurrency(producao.total)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {producao.quantidadeAtendimentos} atendimentos • Ticket médio: {formatCurrency(producao.ticketMedio)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* A Receber */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, bgcolor: '#F59E0B08' }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                ⏳ A Receber
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                                {formatCurrency(producao.aReceber)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Taxa de eficiência: {producao.taxaEficiencia}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Comparativo */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: comparativos.variacaoVsOntem >= 0 ? '#16A34A30' : '#DC262630', borderRadius: 2, bgcolor: comparativos.variacaoVsOntem >= 0 ? '#16A34A08' : '#DC262608' }}>
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                📈 vs Ontem
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" color={comparativos.variacaoVsOntem >= 0 ? '#16A34A' : '#DC2626'}>
                                {comparativos.variacaoVsOntem >= 0 ? '+' : ''}{comparativos.variacaoVsOntem}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Ontem: {formatCurrency(comparativos.ontem)} • Média: {formatCurrency(comparativos.mediaDiariaMes)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs para navegação */}
            <Paper sx={{ mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
                    <Tab label="Transações" />
                    <Tab label={pendentes.length > 0 ? `Pendentes (${pendentes.length})` : 'Pendentes'} />
                    <Tab label="Por Especialidade" />
                    <Tab label="Projeção Mensal" />
                </Tabs>
            </Paper>

            {/* Tab 0: Transações */}
            {activeTab === 0 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>💳 Transações do Dia</Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Hora</TableCell>
                                <TableCell>Paciente</TableCell>
                                <TableCell>Serviço</TableCell>
                                <TableCell>Método</TableCell>
                                <TableCell align="right">Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.transacoes?.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.hora}</TableCell>
                                    <TableCell>{t.paciente}</TableCell>
                                    <TableCell>
                                        <Chip size="small" label={t.servico} variant="outlined" />
                                    </TableCell>
                                    <TableCell>{t.metodo}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#16A34A' }}>
                                        {formatCurrency(t.valor)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!data.transacoes?.length && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">Nenhuma transação hoje</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            )}

            {/* Tab 1: Pendentes */}
            {activeTab === 1 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        ⚠️ Pendentes de Cobrança ({pendentes.length})
                    </Typography>
                    {pendentes.length > 0 ? (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Horário</TableCell>
                                    <TableCell>Paciente</TableCell>
                                    <TableCell>Telefone</TableCell>
                                    <TableCell>Profissional</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendentes.map((p) => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.horario}</TableCell>
                                        <TableCell>{p.paciente}</TableCell>
                                        <TableCell>
                                            {p.telefone !== '-' && (
                                                <Chip 
                                                    size="small" 
                                                    icon={<PhoneIcon fontSize="small" />}
                                                    label={p.telefone} 
                                                    variant="outlined"
                                                    onClick={() => window.open(`https://wa.me/55${p.telefone?.replace(/\D/g, '')}`, '_blank')}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>{p.professional}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', color: '#F59E0B' }}>
                                            {formatCurrency(p.valor)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Alert severity="success">🎉 Nenhum pagamento pendente hoje!</Alert>
                    )}
                </Paper>
            )}

            {/* Tab 2: Por Especialidade */}
            {activeTab === 2 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>🏥 Produção por Especialidade</Typography>
                    <Grid container spacing={2}>
                        {producao.porEspecialidade?.map((esp) => (
                            <Grid item xs={12} sm={6} md={4} key={esp.nome}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold">{esp.nome}</Typography>
                                        <Typography variant="h5" color="primary">{formatCurrency(esp.total)}</Typography>
                                        <Box sx={{ mt: 1 }}>
                                            <Typography variant="caption" display="block">
                                                {esp.quantidade} atendimentos • Ticket: {formatCurrency(Number(esp.ticketMedio))}
                                            </Typography>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={(esp.recebido / esp.total) * 100} 
                                                sx={{ mt: 1 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {formatCurrency(esp.recebido)} recebido • {formatCurrency(esp.pendente)} pendente
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* Tab 3: Projeção */}
            {activeTab === 3 && (
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>📊 Projeção Mensal</Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary">Total Acumulado (até hoje)</Typography>
                                    <Typography variant="h4">{formatCurrency(comparativos.totalAcumuladoMes)}</Typography>
                                    <Typography variant="caption">Dia {comparativos.diasDecorridos} do mês</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Card>
                                <CardContent>
                                    <Typography color="text.secondary">Projeção para o Mês</Typography>
                                    <Typography variant="h4">{formatCurrency(comparativos.projecaoMes)}</Typography>
                                    <Typography variant="caption">Baseado na média diária</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default CashflowTab;