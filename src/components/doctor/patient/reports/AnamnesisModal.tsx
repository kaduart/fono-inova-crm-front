// components/reports/AnamnesisModal.tsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper,
    Divider
} from '@mui/material';
import { useState } from 'react';

interface AnamnesisModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

const steps = [
    'Identificação e Queixa',
    'Histórico Médico',
    'Histórico Familiar',
    'Desenvolvimento',
    'Hábitos',
    'Aspectos Escolares',
    'Observações',
    'Conclusões'
];

export default function AnamnesisModal({ open, onClose, onSave, patient, loading = false }: AnamnesisModalProps) {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        // Seção 1: Identificação e Queixa Principal
        identification: {
            interviewDate: new Date().toISOString().split('T')[0],
            interviewer: '',
            mainComplaint: '',
            complaintDuration: '',
            complaintEvolution: ''
        },
        
        // Seção 2: Histórico Médico
        medicalHistory: {
            pregnancy: '',
            birth: '',
            birthWeight: '',
            birthHeight: '',
            motorDevelopment: '',
            languageDevelopment: '',
            medicalConditions: '',
            hospitalizations: '',
            surgeries: '',
            allergies: '',
            medications: '',
            complementaryExams: ''
        },
        
        // Seção 3: Histórico Familiar
        familyHistory: {
            parents: {
                mother: { age: '', education: '', occupation: '', health: '' },
                father: { age: '', education: '', occupation: '', health: '' }
            },
            siblings: [],
            familyDiseases: '',
            geneticConditions: ''
        },
        
        // Seção 4: Desenvolvimento
        development: {
            gestationalAge: '',
            prenatalCare: '',
            deliveryType: '',
            apgarScore: '',
            firstWordsAge: '',
            phraseFormationAge: '',
            currentSpeech: '',
            socialInteraction: '',
            playHabits: ''
        },
        
        // Seção 5: Hábitos
        habits: {
            feeding: '',
            sleep: '',
            elimination: '',
            oralHabits: '',
            screenTime: ''
        },
        
        // Seção 6: Escolar
        school: {
            attendsSchool: true,
            schoolName: '',
            grade: '',
            teacher: '',
            performance: '',
            difficulties: '',
            relationshipPeers: '',
            relationshipTeachers: '',
            adaptations: ''
        },
        
        // Seção 7: Observações
        behavior: {
            generalAppearance: '',
            attention: '',
            concentration: '',
            behaviorDuringAssessment: '',
            cooperation: '',
            emotionalState: ''
        },
        
        // Seção 8: Conclusões
        conclusions: {
            diagnosticHypotheses: '',
            recommendations: '',
            referrals: '',
            observations: '',
            nextAppointment: ''
        }
    });

    const handleNext = () => {
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    const handleSave = () => {
        const anamnesisData = {
            type: 'anamnesis',
            title: `Anamnese - ${patient.fullName} - ${new Date().toLocaleDateString('pt-BR')}`,
            patientId: patient._id,
            patientName: patient.fullName,
            date: formData.identification.interviewDate,
            content: formData,
            status: 'completed'
        };
        onSave(anamnesisData);
    };

    const updateFormData = (section: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [field]: value
            }
        }));
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0: // Identificação e Queixa
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Data da Entrevista"
                                type="date"
                                value={formData.identification.interviewDate}
                                onChange={(e) => updateFormData('identification', 'interviewDate', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Entrevistador"
                                value={formData.identification.interviewer}
                                onChange={(e) => updateFormData('identification', 'interviewer', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Queixa Principal"
                                multiline
                                rows={3}
                                value={formData.identification.mainComplaint}
                                onChange={(e) => updateFormData('identification', 'mainComplaint', e.target.value)}
                                placeholder="Descreva detalhadamente a queixa que trouxe o paciente à terapia..."
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Tempo de Duração"
                                value={formData.identification.complaintDuration}
                                onChange={(e) => updateFormData('identification', 'complaintDuration', e.target.value)}
                                placeholder="Ex: 1 ano, 6 meses..."
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Evolução da Queixa"
                                value={formData.identification.complaintEvolution}
                                onChange={(e) => updateFormData('identification', 'complaintEvolution', e.target.value)}
                                placeholder="Ex: Piorou, melhorou, estável..."
                            />
                        </Grid>
                    </Grid>
                );

            case 1: // Histórico Médico
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Gestação"
                                multiline
                                rows={2}
                                value={formData.medicalHistory.pregnancy}
                                onChange={(e) => updateFormData('medicalHistory', 'pregnancy', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Nascimento"
                                multiline
                                rows={2}
                                value={formData.medicalHistory.birth}
                                onChange={(e) => updateFormData('medicalHistory', 'birth', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Desenvolvimento Motor"
                                multiline
                                rows={2}
                                value={formData.medicalHistory.motorDevelopment}
                                onChange={(e) => updateFormData('medicalHistory', 'motorDevelopment', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Desenvolvimento de Linguagem"
                                multiline
                                rows={2}
                                value={formData.medicalHistory.languageDevelopment}
                                onChange={(e) => updateFormData('medicalHistory', 'languageDevelopment', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Histórico Médico"
                                multiline
                                rows={3}
                                value={formData.medicalHistory.medicalConditions}
                                onChange={(e) => updateFormData('medicalHistory', 'medicalConditions', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                );

            // ... (Implementar os outros steps de forma similar)

            case 7: // Conclusões
                return (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Hipóteses Diagnósticas"
                                multiline
                                rows={3}
                                value={formData.conclusions.diagnosticHypotheses}
                                onChange={(e) => updateFormData('conclusions', 'diagnosticHypotheses', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Recomendações"
                                multiline
                                rows={3}
                                value={formData.conclusions.recommendations}
                                onChange={(e) => updateFormData('conclusions', 'recommendations', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Encaminhamentos"
                                value={formData.conclusions.referrals}
                                onChange={(e) => updateFormData('conclusions', 'referrals', e.target.value)}
                            />
                        </Grid>
                    </Grid>
                );

            default:
                return <Typography>Seção em desenvolvimento</Typography>;
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                Nova Anamnese - {patient.fullName}
            </DialogTitle>
            <DialogContent>
                <Stepper activeStep={activeStep} orientation="vertical" sx={{ mt: 2 }}>
                    {steps.map((label, index) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                            <StepContent>
                                <Paper sx={{ p: 2, mb: 2 }}>
                                    {renderStepContent(index)}
                                </Paper>
                                <Box sx={{ mb: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={index === steps.length - 1 ? handleSave : handleNext}
                                        sx={{ mt: 1, mr: 1 }}
                                    >
                                        {index === steps.length - 1 ? 'Finalizar' : 'Continuar'}
                                    </Button>
                                    <Button
                                        disabled={index === 0}
                                        onClick={handleBack}
                                        sx={{ mt: 1, mr: 1 }}
                                    >
                                        Voltar
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : 'Salvar Anamnese'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}