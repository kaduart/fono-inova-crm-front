// src/components/patients/PatientsTable.tsx
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    InputAdornment,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme
} from '@mui/material';
import { Eye, FileText, School, Search, Stethoscope, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Patient {
    _id: string;
    fullName: string;
    age: number;
    diagnosis?: string;
    healthPlan?: { name: string };
    phone?: string;
    lastAppointment?: string;
    status: string;
    reports?: any[];
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    search: string;
}

interface PatientsTableProps {
    patients: any[];
    pagination?: PaginationInfo;
    onPageChange?: (page: number) => void;
    onSearchChange?: (search: string) => void;
    onPatientClick?: (patient: Patient) => void;
    onViewPatientDetails?: (patient: Patient) => void;
    onCreateAnamnesis?: (patient: Patient) => void;
    onCreateSchoolReport?: (patient: Patient) => void;
    onViewMedicalReports?: (patient: Patient) => void;
    onAddNewPatient?: () => void;
}

export default function PatientsTable({
    patients,
    pagination,
    onPageChange,
    onSearchChange,
    onPatientClick,
    onViewPatientDetails,
    onCreateAnamnesis,
    onCreateSchoolReport,
    onViewMedicalReports,
    onAddNewPatient
}: PatientsTableProps) {
    const [localSearch, setLocalSearch] = useState(pagination?.search || '');
    const theme = useTheme();

    // Se houver paginação do backend, usa patients direto; senão filtra local
    const filteredPatients = pagination
        ? patients
        : patients?.filter(patient =>
            patient.fullName.toLowerCase().includes(localSearch.toLowerCase()) ||
            (patient.diagnosis && patient.diagnosis.toLowerCase().includes(localSearch.toLowerCase()))
        );

    const handleQuickView = (patient: Patient, event: React.MouseEvent) => {
        event.stopPropagation();
        onPatientClick?.(patient);
    };

    const handleViewPatientDetails = (patient: Patient) => {
        onViewPatientDetails?.(patient);
    };

    const handleCreateAnamnesis = (patient: Patient) => {
        onCreateAnamnesis?.(patient);
    };

    const handleCreateSchoolReport = (patient: Patient) => {
        onCreateSchoolReport?.(patient);
    };

    const handleViewMedicalReports = (patient: Patient) => {
        onViewMedicalReports?.(patient);
    };

    const handleAddNewPatientClick = () => {
        onAddNewPatient?.();
    };

    const getReportCounts = (patient: Patient) => {
        return {
            anamnesis: patient.reports?.filter((r: any) => r.type === 'anamnesis').length || 0,
            school: patient.reports?.filter((r: any) => r.type === 'school').length || 0,
            medical: patient.reports?.filter((r: any) => r.type === 'medical').length || 0
        };
    };

    return (
        <Card
            sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                background: 'white',
                mt: 3,
                boxShadow: 'none'
            }}
        >
            {/* Header simplificado */}
            <Box
                sx={{
                    px: 2,
                    py: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 2
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserPlus size={20} color={theme.palette.primary.main} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                        Gestão de Pacientes
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        placeholder="Buscar pacientes..."
                        value={localSearch}
                        onChange={(e) => {
                            setLocalSearch(e.target.value);
                            if (onSearchChange) {
                                onSearchChange(e.target.value);
                            }
                        }}
                        size="small"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={16} color={theme.palette.grey[500]} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: { xs: '100%', md: 260 },
                            '& .MuiOutlinedInput-root': { borderRadius: 1.5 }
                        }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<UserPlus size={16} />}
                        onClick={handleAddNewPatientClick}
                        size="small"
                        sx={{
                            borderRadius: 1.5,
                            fontWeight: 500,
                            textTransform: 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Novo Paciente
                    </Button>
                </Box>
            </Box>

            <CardContent sx={{ p: 0 }}>
                <TableContainer component={Paper} elevation={0} sx={{ border: 'none', borderRadius: 0 }}>
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ backgroundColor: '#F9FAFB' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Paciente</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Diagnóstico</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Relatórios</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Última Consulta</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.600', fontSize: '0.75rem', py: 1.5 }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPatients?.length > 0 ? (
                                filteredPatients.map(patient => {
                                    const reportCounts = getReportCounts(patient);
                                    return (
                                        <TableRow
                                            key={patient._id}
                                            hover
                                            sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}
                                        >
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box
                                                        sx={{
                                                            width: 36,
                                                            height: 36,
                                                            backgroundColor: theme.palette.primary.light,
                                                            borderRadius: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.primary.main,
                                                            }
                                                        }}
                                                        onClick={(e) => handleQuickView(patient, e)}
                                                    >
                                                        {patient.fullName.split(' ').map(n => n[0]).join('')}
                                                    </Box>
                                                    <Box>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                '&:hover': { color: theme.palette.primary.main }
                                                            }}
                                                            onClick={(e) => handleQuickView(patient, e)}
                                                        >
                                                            {patient.fullName}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                                            {patient.healthPlan?.name || 'Particular'} • {patient.age} anos
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'grey.700' }}>
                                                    {patient.diagnosis || '—'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        icon={<Stethoscope size={12} />}
                                                        label={`${reportCounts.anamnesis}`}
                                                        size="small"
                                                        variant={reportCounts.anamnesis > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.anamnesis > 0 ? "primary" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                        sx={{ height: 24, fontSize: '0.7rem' }}
                                                    />
                                                    <Chip
                                                        icon={<School size={12} />}
                                                        label={`${reportCounts.school}`}
                                                        size="small"
                                                        variant={reportCounts.school > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.school > 0 ? "secondary" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                        sx={{ height: 24, fontSize: '0.7rem' }}
                                                    />
                                                    <Chip
                                                        icon={<FileText size={12} />}
                                                        label={`${reportCounts.medical}`}
                                                        size="small"
                                                        variant={reportCounts.medical > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.medical > 0 ? "success" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                        sx={{ height: 24, fontSize: '0.7rem' }}
                                                    />
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2" sx={{ color: 'grey.700' }}>
                                                    {patient.lastAppointment
                                                        ? new Date(patient.lastAppointment).toLocaleDateString('pt-BR')
                                                        : '—'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    label={patient.status === 'active' ? 'Ativo' : 'Inativo'}
                                                    size="small"
                                                    sx={{
                                                        height: 24,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 500,
                                                        bgcolor: patient.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                                                        color: patient.status === 'active' ? '#2E7D32' : '#757575'
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<Eye size={12} />}
                                                        onClick={() => handleViewPatientDetails(patient)}
                                                        sx={{
                                                            borderRadius: 1.5,
                                                            textTransform: 'none',
                                                            fontSize: '0.7rem',
                                                            py: 0.5,
                                                            px: 1
                                                        }}
                                                    >
                                                        Ver Detalhes
                                                    </Button>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            startIcon={<Stethoscope size={12} />}
                                                            onClick={() => handleCreateAnamnesis(patient)}
                                                            sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1 }}
                                                        >
                                                            Anamnese
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            startIcon={<School size={12} />}
                                                            onClick={() => handleCreateSchoolReport(patient)}
                                                            sx={{ fontSize: '0.65rem', minWidth: 'auto', px: 1 }}
                                                        >
                                                            Escolar
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <UserPlus size={32} color={theme.palette.grey[400]} />
                                            <Typography variant="body2" sx={{ color: 'grey.500' }}>
                                                {patients?.length === 0 ? 'Nenhum paciente cadastrado' : 'Nenhum paciente encontrado'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: 'grey.500' }}>
                                                {localSearch ? 'Tente ajustar sua busca' : 'Adicione seu primeiro paciente'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Paginação */}
                {pagination && pagination.totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 2, pb: 2 }}>
                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                            Página {pagination.page} de {pagination.totalPages} ({pagination.total} pacientes)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={pagination.page <= 1}
                                onClick={() => onPageChange?.(pagination.page - 1)}
                            >
                                Anterior
                            </Button>
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                    key={page}
                                    variant={page === pagination.page ? 'contained' : 'outlined'}
                                    size="small"
                                    onClick={() => onPageChange?.(page)}
                                    sx={{ minWidth: 36, px: 1 }}
                                >
                                    {page}
                                </Button>
                            ))}
                            <Button
                                variant="outlined"
                                size="small"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => onPageChange?.(pagination.page + 1)}
                            >
                                Próxima
                            </Button>
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}