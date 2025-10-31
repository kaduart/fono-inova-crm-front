// src/components/patients/PatientsTable.tsx
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
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

// Interface para o paciente
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

interface PatientsTableProps {
    patients: any[];
    onPatientClick?: (patient: Patient) => void;
    onViewPatientDetails?: (patient: Patient) => void;
    onCreateAnamnesis?: (patient: Patient) => void;
    onCreateSchoolReport?: (patient: Patient) => void;
    onViewMedicalReports?: (patient: Patient) => void;
    onAddNewPatient?: () => void;
}

export default function PatientsTable({
    patients,
    onPatientClick,
    onViewPatientDetails,
    onCreateAnamnesis,
    onCreateSchoolReport,
    onViewMedicalReports,
    onAddNewPatient
}: PatientsTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();

    const filteredPatients = patients?.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Handler para visualização rápida (modal)
    const handleQuickView = (patient: Patient, event: React.MouseEvent) => {
        event.stopPropagation();
        onPatientClick?.(patient);
    };

    // Handler para visualização completa (dentro do dashboard)
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
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                background: 'white',
                mt: 3
            }}
        >
            <CardHeader
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`,
                    py: 3
                }}
                title={
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UserPlus size={24} color={theme.palette.primary.main} />
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.800' }}>
                                Gestão de Pacientes
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                placeholder="Buscar pacientes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search size={18} color={theme.palette.grey[500]} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    width: { xs: '100%', md: 300 },
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<UserPlus size={18} />}
                                onClick={handleAddNewPatientClick}
                                sx={{
                                    borderRadius: 2,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Novo Paciente
                            </Button>
                        </Box>
                    </Box>
                }
            />
            <CardContent sx={{ p: 0 }}>
                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        border: 'none',
                        borderRadius: '0 0 12px 12px'
                    }}
                >
                    <Table sx={{ minWidth: 800 }}>
                        <TableHead sx={{ backgroundColor: theme.palette.grey[50] }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Paciente</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Diagnóstico</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Relatórios</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Última Consulta</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPatients?.length > 0 ? (
                                filteredPatients.map(patient => {
                                    const reportCounts = getReportCounts(patient);

                                    return (
                                        <TableRow
                                            key={patient._id}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: theme.palette.grey[50]
                                                }
                                            }}
                                        >
                                            {/* Coluna do Paciente - Clique rápido para modal */}
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Box
                                                        sx={{
                                                            width: 40,
                                                            height: 40,
                                                            backgroundColor: theme.palette.primary.light,
                                                            borderRadius: 2,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.875rem',
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.primary.main,
                                                                transform: 'scale(1.05)'
                                                            }
                                                        }}
                                                        onClick={(e) => handleQuickView(patient, e)}
                                                    >
                                                        {patient.fullName.split(' ').map(n => n[0]).join('')}
                                                    </Box>
                                                    <Box>
                                                        <Typography
                                                            variant="body1"
                                                            sx={{
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    color: theme.palette.primary.main,
                                                                    textDecoration: 'underline'
                                                                }
                                                            }}
                                                            onClick={(e) => handleQuickView(patient, e)}
                                                        >
                                                            {patient.fullName}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ color: 'grey.600' }}>
                                                            {patient.healthPlan?.name || 'Particular'} • {patient.age} anos
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        maxWidth: 200,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    {patient.diagnosis || 'Não informado'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    <Chip
                                                        icon={<Stethoscope size={14} />}
                                                        label={`${reportCounts.anamnesis} Anamnese`}
                                                        size="small"
                                                        variant={reportCounts.anamnesis > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.anamnesis > 0 ? "primary" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                    />
                                                    <Chip
                                                        icon={<School size={14} />}
                                                        label={`${reportCounts.school} Escolar`}
                                                        size="small"
                                                        variant={reportCounts.school > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.school > 0 ? "secondary" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                    />
                                                    <Chip
                                                        icon={<FileText size={14} />}
                                                        label={`${reportCounts.medical} Médico`}
                                                        size="small"
                                                        variant={reportCounts.medical > 0 ? "filled" : "outlined"}
                                                        color={reportCounts.medical > 0 ? "success" : "default"}
                                                        onClick={() => handleViewMedicalReports(patient)}
                                                        clickable={!!onViewMedicalReports}
                                                    />
                                                </Box>
                                            </TableCell>

                                            <TableCell>
                                                <Typography variant="body2">
                                                    {patient.lastAppointment
                                                        ? new Date(patient.lastAppointment).toLocaleDateString('pt-BR')
                                                        : 'N/A'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Chip
                                                    label={patient.status === 'active' ? 'Ativo' : 'Inativo'}
                                                    size="small"
                                                    sx={{
                                                        backgroundColor: patient.status === 'active' ? theme.palette.success.light : theme.palette.grey[300],
                                                        color: patient.status === 'active' ? theme.palette.success.dark : theme.palette.grey[600],
                                                        fontWeight: 500
                                                    }}
                                                />
                                            </TableCell>

                                            {/* Coluna de Ações - Todas as ações via callbacks */}
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                                    <Button
                                                        variant="outlined"
                                                        size="small"
                                                        startIcon={<Eye size={14} />}
                                                        onClick={() => handleViewPatientDetails(patient)}
                                                        sx={{ mb: 1 }}
                                                    >
                                                        Ver Detalhes
                                                    </Button>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            startIcon={<Stethoscope size={14} />}
                                                            onClick={() => handleCreateAnamnesis(patient)}
                                                        >
                                                            Anamnese
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            startIcon={<School size={14} />}
                                                            onClick={() => handleCreateSchoolReport(patient)}
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
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <UserPlus size={48} color={theme.palette.grey[400]} />
                                            <Typography variant="body1" sx={{ color: 'grey.500' }}>
                                                {patients?.length === 0 ? 'Nenhum paciente cadastrado' : 'Nenhum paciente encontrado'}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                                {searchTerm ? 'Tente ajustar sua busca' : 'Adicione seu primeiro paciente'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
}