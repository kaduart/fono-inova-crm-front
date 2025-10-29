import {
    Box,
    Breadcrumbs,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    Grid,
    Link,
    Tab,
    Tabs,
    Typography,
    useTheme
} from '@mui/material';
import {
    ArrowLeft,
    Calendar,
    FileText,
    Heart,
    Mail,
    MapPin,
    Phone,
    School,
    Stethoscope,
    User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import API from '../../../services/api';
import MedicalReportsSection from './reports/MedicalReportsSection';

// Interfaces para tipagem baseada na sua API real
interface Address {
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
}

interface HealthPlan {
    name: string;
    policyNumber: string;
}

interface EmergencyContact {
    name: string;
    phone: string;
    relationship: string;
}

interface Patient {
    _id: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    maritalStatus: string;
    profession: string;
    placeOfBirth: string;
    phone: string;
    email: string;
    cpf: string;
    rg: string;
    mainComplaint: string;
    clinicalHistory: string;
    medications: string;
    allergies: string;
    familyHistory: string;
    legalGuardian: string;
    imageAuthorization: boolean;
    createdAt: string;
    updatedAt: string;
    lastAppointment?: string;
    nextAppointment?: string;
    status: string;
    address: Address;
    healthPlan: HealthPlan;
    emergencyContact: EmergencyContact;
    appointments: string[];
    reports?: any[];
}

interface TabPanelProps {
    children?: React.ReactNode;
    value: number;
    index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`patient-tabpanel-${index}`}
            aria-labelledby={`patient-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

// Função para calcular idade a partir da data de nascimento
function calculateAge(dateOfBirth: string): number {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    return age;
}

// Função para formatar data
function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
}

export default function PatientDetail() {
    const theme = useTheme();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const [currentTab, setCurrentTab] = useState(0);
    const [isCreatingReport, setIsCreatingReport] = useState(false);
    const [reportType, setReportType] = useState('');
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Buscar dados do paciente da API real
    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await API.get(`/patients/${id}`);
                console.log('Dados completos do paciente:', response.data);

                setPatient(response.data);

            } catch (error) {
                console.error('Erro ao buscar paciente:', error);
                setError('Erro ao carregar dados do paciente');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchPatient();
        }
    }, [id]);

    // Processar query parameters para abrir abas específicas
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const tab = searchParams.get('tab');
        const create = searchParams.get('create');

        if (tab === 'anamnesis') setCurrentTab(1);
        if (tab === 'school') setCurrentTab(2);
        if (tab === 'medical') setCurrentTab(3);

        if (create === 'new') {
            setIsCreatingReport(true);
            setReportType(tab || '');
        }
    }, [location.search]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
        setIsCreatingReport(false);
    };

    const handleBack = () => {
        navigate('/patients');
    };

    const handleCreateReport = (type: string) => {
        setReportType(type);
        setIsCreatingReport(true);
        // Mudar para a aba correspondente
        if (type === 'anamnesis') setCurrentTab(1);
        if (type === 'school') setCurrentTab(2);
        if (type === 'medical') setCurrentTab(3);
    };

    const handleSaveReport = (reportData: any) => {
        console.log('Relatório salvo:', reportData);
        setIsCreatingReport(false);
        // Aqui você atualizaria a lista de relatórios do paciente
    };

    // Estados de loading e error
    if (loading) {
        return (
            <Card sx={{ p: 3, textAlign: 'center', mt: 3 }}>
                <Typography variant="h6">Carregando paciente...</Typography>
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ p: 3, textAlign: 'center', mt: 3 }}>
                <Typography variant="h6" color="error">{error}</Typography>
                <Button onClick={handleBack} sx={{ mt: 2 }}>
                    Voltar para lista de pacientes
                </Button>
            </Card>
        );
    }

    if (!patient) {
        return (
            <Card sx={{ p: 3, textAlign: 'center', mt: 3 }}>
                <Typography variant="h6">Paciente não encontrado</Typography>
                <Button onClick={handleBack} sx={{ mt: 2 }}>
                    Voltar para lista de pacientes
                </Button>
            </Card>
        );
    }

    const age = calculateAge(patient.dateOfBirth);

    return (
        <Box>
            {/* Cabeçalho e Navegação */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Breadcrumbs sx={{ mb: 2 }}>
                        <Link
                            color="inherit"
                            onClick={handleBack}
                            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                            <ArrowLeft size={16} />
                            Pacientes
                        </Link>
                        <Typography color="text.primary">{patient.fullName}</Typography>
                    </Breadcrumbs>

                    <Grid container spacing={3} alignItems="center">
                        <Grid item>
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    backgroundColor: theme.palette.primary.light,
                                    borderRadius: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '2rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                {patient.fullName.split(' ').map(n => n[0]).join('')}
                            </Box>
                        </Grid>
                        <Grid item xs>
                            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                                {patient.fullName}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <User size={16} color={theme.palette.grey[600]} />
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        {age} anos • {patient.gender}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Stethoscope size={16} color={theme.palette.grey[600]} />
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        {patient.mainComplaint || 'Queixa principal não informada'}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Calendar size={16} color={theme.palette.grey[600]} />
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        Última consulta: {patient.lastAppointment
                                            ? formatDate(patient.lastAppointment)
                                            : 'N/A'
                                        }
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item>
                            <Chip
                                label={patient.appointments && patient.appointments.length > 0 ? 'Ativo' : 'Sem consultas'}
                                color={patient.appointments && patient.appointments.length > 0 ? 'success' : 'default'}
                                variant="filled"
                                sx={{ fontWeight: 600 }}
                            />
                        </Grid>
                    </Grid>

                    {/* Informações de Contato */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {patient.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Phone size={16} color={theme.palette.grey[600]} />
                                <Typography variant="body2">{patient.phone}</Typography>
                            </Box>
                        )}
                        {patient.email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Mail size={16} color={theme.palette.grey[600]} />
                                <Typography variant="body2">{patient.email}</Typography>
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FileText size={16} color={theme.palette.grey[600]} />
                            <Typography variant="body2">
                                {patient.healthPlan?.name || 'Particular'}
                            </Typography>
                        </Box>
                        {patient.address && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MapPin size={16} color={theme.palette.grey[600]} />
                                <Typography variant="body2">
                                    {patient.address.city} - {patient.address.state}
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {/* Informações Adicionais */}
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="body2">
                                    <strong>Nascimento:</strong> {formatDate(patient.dateOfBirth)}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Naturalidade:</strong> {patient.placeOfBirth}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Profissão:</strong> {patient.profession}
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="body2">
                                    <strong>CPF:</strong> {patient.cpf}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>RG:</strong> {patient.rg}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Estado Civil:</strong> {patient.maritalStatus}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Contato de Emergência */}
                    {patient.emergencyContact && (
                        <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.warning.light + '20', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Heart size={16} color={theme.palette.warning.main} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Contato de Emergência
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                <strong>{patient.emergencyContact.name}</strong> ({patient.emergencyContact.relationship}) - {patient.emergencyContact.phone}
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Abas Principais */}
            <Card>
                <CardHeader
                    sx={{
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.grey[50]
                    }}
                    title={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                            <Tabs value={currentTab} onChange={handleTabChange}>
                                <Tab label="Visão Geral" />
                                <Tab label="Anamnese" />
                                <Tab label="Relatórios Escolares" />
                                <Tab label="Relatórios Médicos" />
                                <Tab label="Evolução" />
                            </Tabs>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<Stethoscope size={16} />}
                                    onClick={() => handleCreateReport('anamnesis')}
                                >
                                    Nova Anamnese
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<School size={16} />}
                                    onClick={() => handleCreateReport('school')}
                                >
                                    Novo Relatório Escolar
                                </Button>
                            </Box>
                        </Box>
                    }
                />
                <CardContent>
                    <TabPanel value={currentTab} index={0}>
                        {/* Visão Geral */}
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Resumo do Paciente
                        </Typography>
                        <Grid container spacing={3}>
                            {/* Histórico Clínico */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Histórico Clínico
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Queixa Principal:</strong> {patient.mainComplaint || 'Não informado'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Histórico Clínico:</strong> {patient.clinicalHistory || 'Não informado'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Medicações:</strong> {patient.medications || 'Nenhuma'}
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 1 }}>
                                            <strong>Alergias:</strong> {patient.allergies || 'Nenhuma'}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Histórico Familiar:</strong> {patient.familyHistory || 'Não informado'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Estatísticas */}
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" sx={{ mb: 2 }}>
                                            Estatísticas
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                            <Chip
                                                label={`${patient.appointments?.length || 0} Consultas`}
                                                color="primary"
                                                variant="filled"
                                            />
                                            <Chip
                                                label={`${patient.reports?.filter((r: any) => r.type === 'anamnesis').length || 0} Anamneses`}
                                                color="secondary"
                                                variant="filled"
                                            />
                                            <Chip
                                                label={`${patient.reports?.filter((r: any) => r.type === 'school').length || 0} Escolares`}
                                                color="info"
                                                variant="filled"
                                            />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                            {patient.nextAppointment ? (
                                                <>
                                                    <strong>Próxima consulta:</strong> {formatDate(patient.nextAppointment)}
                                                </>
                                            ) : (
                                                'Agende a próxima consulta do paciente.'
                                            )}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Endereço */}
                            {patient.address && (
                                <Grid item xs={12}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ mb: 2 }}>
                                                Endereço
                                            </Typography>
                                            <Typography variant="body2">
                                                {patient.address.street} {patient.address.number && `, ${patient.address.number}`}
                                            </Typography>
                                            <Typography variant="body2">
                                                {patient.address.district} - {patient.address.city} - {patient.address.state}
                                            </Typography>
                                            <Typography variant="body2">
                                                CEP: {patient.address.zipCode}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            )}
                        </Grid>
                    </TabPanel>

                    <TabPanel value={currentTab} index={1}>
                        {/* Anamnese */}
                        {isCreatingReport && reportType === 'anamnesis' ? (
                            <div>
                                <Typography variant="h6">
                                    Formulário de Anamnese (Em desenvolvimento)
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'grey.600', mt: 1 }}>
                                    Em breve você poderá criar fichas de anamnese completas para este paciente.
                                </Typography>
                            </div>
                        ) : (
                            <MedicalReportsSection
                                patient={patient}
                                reportType="anamnesis"
                            />
                        )}
                    </TabPanel>

                    <TabPanel value={currentTab} index={2}>
                        {/* Relatórios Escolares */}
                        {isCreatingReport && reportType === 'school' ? (
                            <div>
                                <Typography variant="h6">
                                    Relatório Escolar (Em desenvolvimento)
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'grey.600', mt: 1 }}>
                                    Em breve você poderá criar relatórios escolares completos para este paciente.
                                </Typography>
                            </div>
                        ) : (
                            <MedicalReportsSection
                                patient={patient}
                                reportType="school"
                            />
                        )}
                    </TabPanel>

                    <TabPanel value={currentTab} index={3}>
                        {/* Relatórios Médicos */}
                        <MedicalReportsSection
                            patient={patient}
                            reportType="medical"
                        />
                    </TabPanel>

                    <TabPanel value={currentTab} index={4}>
                        {/* Evolução */}
                        <Typography variant="h6">
                            Gráficos de Evolução
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.600', mt: 1 }}>
                            Aqui serão exibidos os gráficos de progresso do paciente ao longo do tempo.
                        </Typography>
                        {patient.appointments && patient.appointments.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2">
                                    <strong>Total de consultas realizadas:</strong> {patient.appointments.length}
                                </Typography>
                            </Box>
                        )}
                    </TabPanel>
                </CardContent>
            </Card>
        </Box>
    );
}