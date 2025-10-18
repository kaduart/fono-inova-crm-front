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
import { Search, UserPlus } from 'lucide-react';
import { useState } from 'react';

export default function PatientsTable({ patients }: { patients: any[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme();

    const filteredPatients = patients.filter(patient =>
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.diagnosis && patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                background: 'white'
            }}
        >
            <CardHeader
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`
                }}
                title={
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'start', md: 'center' }, justifyContent: 'between', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <UserPlus size={24} color={theme.palette.primary.main} />
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.800' }}>
                                Gestão de Pacientes
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
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
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Contato</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Última Consulta</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Status</TableCell>
                                <TableCell sx={{ fontWeight: 600, color: 'grey.700' }}>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map(patient => (
                                    <TableRow
                                        key={patient._id}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[50]
                                            }
                                        }}
                                    >
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        backgroundColor: theme.palette.grey[200],
                                                        border: `2px dashed ${theme.palette.grey[400]}`,
                                                        borderRadius: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                />
                                                <Box>
                                                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                        {patient.fullName}
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: 'grey.600' }}>
                                                        {patient.healthPlan?.name || 'Particular'}
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
                                            <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                                {patient.phone || 'N/A'}
                                            </Typography>
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
                                                label="Ativo"
                                                size="small"
                                                sx={{
                                                    backgroundColor: theme.palette.success.light,
                                                    color: theme.palette.success.dark,
                                                    fontWeight: 500
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button variant="outlined" size="small">
                                                    Visualizar
                                                </Button>
                                                <Button variant="outlined" size="small">
                                                    Agendar
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <UserPlus size={48} color={theme.palette.grey[400]} />
                                            <Typography variant="body1" sx={{ color: 'grey.500' }}>
                                                Nenhum paciente encontrado
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