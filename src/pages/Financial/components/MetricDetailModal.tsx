import { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TablePagination,
    Chip,
    Avatar,
    Typography,
    IconButton,
    CircularProgress,
    Alert,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Button,
    Collapse
} from '@mui/material';
import { Close, FilterList, Clear } from '@mui/icons-material';
import api from '../../../services/api';

interface MetricDetailModalProps {
    open: boolean;
    onClose: () => void;
    type: 'leads' | 'avaliacoes-agendadas' | 'avaliacoes-realizadas' | 'pacotes' | 'sessoes';
    month: number;
    year: number;
    title: string;
    color: string;
}

interface Filters {
    search?: string;
    origin?: string;
    status?: string;
    doctorId?: string;
    serviceType?: string;
    dateFrom?: string;
    dateTo?: string;
}

interface LeadData {
    _id: string;
    name: string;
    contact?: { phone?: string; email?: string };
    origin: string;
    status: string;
    createdAt: string;
    conversionScore?: number;
}

interface AppointmentData {
    _id: string;
    patient?: { fullName?: string; phone?: string };
    doctor?: { fullName?: string; _id?: string };
    date: string;
    time: string;
    operationalStatus: string;
    clinicalStatus?: string;
    serviceType?: string;
}

interface PackageData {
    _id: string;
    patient?: { fullName?: string; phone?: string };
    doctor?: { fullName?: string; _id?: string };
    totalSessions?: number;
    sessionsUsed?: number;
    totalPaid?: number;
    status: string;
    date: string;
}

const ORIGIN_OPTIONS = [
    { value: '', label: 'Todas' },
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'Meta Ads', label: 'Meta Ads' },
    { value: 'Google Ads', label: 'Google Ads' },
    { value: 'Agenda Direta', label: 'Agenda Direta' },
    { value: 'site_fono_inova', label: 'Site Fono Inova' },
    { value: 'Outro', label: 'Outro' }
];

const STATUS_OPTIONS = {
    leads: [
        { value: '', label: 'Todos' },
        { value: 'novo', label: 'Novo' },
        { value: 'agendado', label: 'Agendado' },
        { value: 'engajado', label: 'Engajado' },
        { value: 'convertido', label: 'Convertido' },
        { value: 'perdido', label: 'Perdido' }
    ],
    appointments: [
        { value: '', label: 'Todos' },
        { value: 'scheduled', label: 'Agendado' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'completed', label: 'Realizado' },
        { value: 'canceled', label: 'Cancelado' },
        { value: 'missed', label: 'Faltou' }
    ],
    packages: [
        { value: '', label: 'Todos' },
        { value: 'active', label: 'Ativo' },
        { value: 'completed', label: 'Concluído' },
        { value: 'cancelled', label: 'Cancelado' }
    ]
};

export const MetricDetailModal = ({ open, onClose, type, month, year, title, color }: MetricDetailModalProps) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    const [doctors, setDoctors] = useState<{_id: string, fullName: string}[]>([]);
    
    // Filtros específicos por tipo
    const [filters, setFilters] = useState<Filters>({
        search: '',
        origin: '',
        status: '',
        doctorId: '',
        serviceType: '',
        dateFrom: '',
        dateTo: ''
    });

    // Resetar filtros quando abrir modal
    useEffect(() => {
        if (open) {
            setFilters({
                search: '',
                origin: '',
                status: '',
                doctorId: '',
                serviceType: '',
                dateFrom: '',
                dateTo: ''
            });
            setPage(0);
            fetchDoctors();
        }
    }, [open, type]);

    // Buscar dados quando filtros ou paginação mudam
    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open, type, month, year, page, rowsPerPage, filters]);

    const fetchDoctors = async () => {
        try {
            const response = await api.get('/doctors');
            if (response.data) {
                setDoctors(response.data);
            }
        } catch (err) {
            console.error('Erro ao buscar médicos:', err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const endpoint = `/financial/metrics/${type}`;
            const params: any = { 
                month, 
                year, 
                page: page + 1, 
                limit: rowsPerPage 
            };

            // Adicionar filtros aos params
            if (filters.search) params.search = filters.search;
            if (filters.origin) params.origin = filters.origin;
            if (filters.status) params.status = filters.status;
            if (filters.doctorId) params.doctorId = filters.doctorId;
            if (filters.serviceType) params.serviceType = filters.serviceType;
            if (filters.dateFrom) params.dateFrom = filters.dateFrom;
            if (filters.dateTo) params.dateTo = filters.dateTo;

            const response = await api.get(endpoint, { params });

            if (response.data.success) {
                setData(response.data.data || []);
                setTotal(response.data.total || 0);
            } else {
                setError('Erro ao carregar dados');
            }
        } catch (err: any) {
            console.error('Erro ao buscar dados:', err);
            setError(err.response?.data?.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (field: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(0);
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            origin: '',
            status: '',
            doctorId: '',
            serviceType: '',
            dateFrom: '',
            dateTo: ''
        });
        setPage(0);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'novo':
            case 'scheduled':
            case 'agendado':
                return 'info';
            case 'convertido':
            case 'completed':
            case 'realizado':
            case 'paid':
            case 'active':
                return 'success';
            case 'cancelado':
            case 'canceled':
            case 'perdido':
            case 'cancelled':
                return 'error';
            case 'pending':
            case 'pendente':
                return 'warning';
            default:
                return 'default';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const formatCurrency = (value: number) => {
        if (!value && value !== 0) return '-';
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    // Renderizar filtros específicos por tipo
    const renderFilters = () => {
        const hasActiveFilters = Object.values(filters).some(v => v !== '');

        return (
            <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Button
                        size="small"
                        startIcon={<FilterList />}
                        onClick={() => setShowFilters(!showFilters)}
                        color={hasActiveFilters ? "primary" : "inherit"}
                        variant={hasActiveFilters ? "contained" : "outlined"}
                    >
                        Filtros {hasActiveFilters && '(Ativos)'}
                    </Button>
                    {hasActiveFilters && (
                        <Button
                            size="small"
                            startIcon={<Clear />}
                            onClick={clearFilters}
                            color="error"
                        >
                            Limpar
                        </Button>
                    )}
                </Box>

                <Collapse in={showFilters}>
                    <Paper variant="outlined" sx={{ p: 3, mb: 2, bgcolor: 'grey.50' }}>
                        <Grid container spacing={2}>
                            {/* Busca geral */}
                            <Grid item xs={12} sm={6} lg={4}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Buscar por nome ou telefone"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Digite para buscar..."
                                />
                            </Grid>

                            {/* Filtro de Origem - só para Leads */}
                            {type === 'leads' && (
                                <Grid item xs={6} sm={3} lg={2}>
                                    <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Origem</InputLabel>
                                        <Select
                                            value={filters.origin}
                                            onChange={(e) => handleFilterChange('origin', e.target.value)}
                                            label="Origem"
                                        >
                                            {ORIGIN_OPTIONS.map(opt => (
                                                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Filtro de Status */}
                            <Grid item xs={6} sm={3} lg={2}>
                                <FormControl fullWidth size="small" sx={{ minWidth: 100 }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                        label="Status"
                                    >
                                        {(type === 'leads' ? STATUS_OPTIONS.leads : 
                                          type === 'pacotes' ? STATUS_OPTIONS.packages : 
                                          STATUS_OPTIONS.appointments).map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {/* Filtro de Profissional */}
                            {(type === 'avaliacoes-agendadas' || type === 'avaliacoes-realizadas' || 
                              type === 'pacotes' || type === 'sessoes') && (
                                <Grid item xs={12} sm={6} lg={3}>
                                    <FormControl fullWidth size="small" sx={{ minWidth: 150 }}>
                                        <InputLabel>Profissional</InputLabel>
                                        <Select
                                            value={filters.doctorId}
                                            onChange={(e) => handleFilterChange('doctorId', e.target.value)}
                                            label="Profissional"
                                        >
                                            <MenuItem value="">Todos</MenuItem>
                                            {doctors.map(doc => (
                                                <MenuItem key={doc._id} value={doc._id}>{doc.fullName}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            {/* Filtro de Período */}
                            <Grid item xs={6} sm={3} lg={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Data inicial"
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={6} sm={3} lg={2}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Data final"
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                </Collapse>
            </Box>
        );
    };

    const renderTableContent = () => {
        if (data.length === 0 && !loading) {
            return (
                <TableRow>
                    <TableCell colSpan={6} align="center">
                        <Typography sx={{ py: 4, color: 'text.secondary' }}>
                            Nenhum dado encontrado para este período
                        </Typography>
                    </TableCell>
                </TableRow>
            );
        }

        switch (type) {
            case 'leads':
                return data.map((lead: LeadData) => (
                    <TableRow key={lead._id} hover>
                        <TableCell>{lead.name || 'Sem nome'}</TableCell>
                        <TableCell>{lead.contact?.phone || '-'}</TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={lead.origin || 'Outro'} 
                                variant="outlined"
                            />
                        </TableCell>
                        <TableCell>{formatDate(lead.createdAt)}</TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={lead.status || 'novo'} 
                                color={getStatusColor(lead.status) as any}
                            />
                        </TableCell>
                        <TableCell>{lead.conversionScore || 0}</TableCell>
                    </TableRow>
                ));

            case 'avaliacoes-agendadas':
            case 'avaliacoes-realizadas':
                return data.map((appt: AppointmentData) => (
                    <TableRow key={appt._id} hover>
                        <TableCell>{appt.patient?.fullName || 'N/A'}</TableCell>
                        <TableCell>{appt.patient?.phone || '-'}</TableCell>
                        <TableCell>{formatDate(appt.date)}</TableCell>
                        <TableCell>{appt.time || '-'}</TableCell>
                        <TableCell>{appt.doctor?.fullName || 'N/A'}</TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={appt.operationalStatus || 'scheduled'} 
                                color={getStatusColor(appt.operationalStatus) as any}
                            />
                        </TableCell>
                    </TableRow>
                ));

            case 'pacotes':
                return data.map((pkg: PackageData) => (
                    <TableRow key={pkg._id} hover>
                        <TableCell>{pkg.patient?.fullName || 'N/A'}</TableCell>
                        <TableCell>{pkg.patient?.phone || '-'}</TableCell>
                        <TableCell>{pkg.doctor?.fullName || 'N/A'}</TableCell>
                        <TableCell>
                            {pkg.sessionsUsed || 0} / {pkg.totalSessions || 0}
                        </TableCell>
                        <TableCell>{formatCurrency(pkg.totalPaid)}</TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={pkg.status || 'active'} 
                                color={getStatusColor(pkg.status) as any}
                            />
                        </TableCell>
                    </TableRow>
                ));

            case 'sessoes':
                return data.map((appt: AppointmentData) => (
                    <TableRow key={appt._id} hover>
                        <TableCell>{appt.patient?.fullName || 'N/A'}</TableCell>
                        <TableCell>{formatDate(appt.date)}</TableCell>
                        <TableCell>{appt.time || '-'}</TableCell>
                        <TableCell>{appt.doctor?.fullName || 'N/A'}</TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={appt.serviceType || 'session'} 
                                variant="outlined"
                            />
                        </TableCell>
                        <TableCell>
                            <Chip 
                                size="small" 
                                label={appt.operationalStatus || 'scheduled'} 
                                color={getStatusColor(appt.operationalStatus) as any}
                            />
                        </TableCell>
                    </TableRow>
                ));

            default:
                return null;
        }
    };

    const getTableHeaders = () => {
        switch (type) {
            case 'leads':
                return ['Nome', 'Telefone', 'Origem', 'Data', 'Status', 'Score'];
            case 'avaliacoes-agendadas':
            case 'avaliacoes-realizadas':
                return ['Paciente', 'Telefone', 'Data', 'Hora', 'Profissional', 'Status'];
            case 'pacotes':
                return ['Paciente', 'Telefone', 'Profissional', 'Sessões', 'Valor Pago', 'Status'];
            case 'sessoes':
                return ['Paciente', 'Data', 'Hora', 'Profissional', 'Tipo', 'Status'];
            default:
                return [];
        }
    };

    const hasActiveFilters = Object.values(filters).some(v => v !== '');

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="lg" 
            fullWidth
            PaperProps={{ sx: { minHeight: '80vh', maxHeight: '95vh' } }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: color, width: 36, height: 36 }}>
                        <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
                            {title.charAt(0)}
                        </Typography>
                    </Avatar>
                    <Box>
                        <Typography variant="h6" fontWeight="600">{title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {total} registros encontrados {hasActiveFilters && '(filtrados)'}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 2, py: 1 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Filtros */}
                {renderFilters()}

                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.50' }}>
                                {getTableHeaders().map((header) => (
                                    <TableCell key={header} sx={{ fontWeight: 600 }}>
                                        {header}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                                            <CircularProgress size={32} />
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                renderTableContent()
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                    labelRowsPerPage="Itens por página:"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
                />
            </DialogContent>
        </Dialog>
    );
};

export default MetricDetailModal;
