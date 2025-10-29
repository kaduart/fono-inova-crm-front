// components/reports/SchoolReportModal.tsx
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
    Card,
    CardContent,
    FormControlLabel,
    Checkbox,
    Divider
} from '@mui/material';
import { useState } from 'react';

interface SchoolReportModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

export default function SchoolReportModal({ open, onClose, onSave, patient, loading = false }: SchoolReportModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        schoolYear: new Date().getFullYear().toString(),
        semester: 'annual',
        schoolInfo: {
            schoolName: '',
            grade: '',
            teacher: '',
            schoolPhone: '',
            schoolEmail: ''
        },
        academicPerformance: {
            portuguese: {
                performance: 'not_evaluated',
                observations: '',
                specificSkills: { reading: '', writing: '', interpretation: '', oralExpression: '' }
            },
            mathematics: {
                performance: 'not_evaluated',
                observations: '',
                specificSkills: { calculations: '', problemSolving: '', logicalReasoning: '' }
            },
            sciences: { performance: 'not_evaluated', observations: '' },
            history: { performance: 'not_evaluated', observations: '' },
            geography: { performance: 'not_evaluated', observations: '' },
            overallObservations: ''
        },
        skills: {
            cognitive: { attention: '', memory: '', reasoning: '', concentration: '' },
            social: { interactionPeers: '', interactionAdults: '', teamwork: '', conflictResolution: '' },
            emotional: { selfControl: '', frustrationTolerance: '', selfEsteem: '', motivation: '' }
        },
        behavior: {
            classroomParticipation: '',
            homeworkCompletion: '',
            organization: '',
            punctuality: '',
            followingRules: ''
        },
        support: {
            currentAdaptations: [],
            neededAdaptations: [],
            specializedSupport: '',
            familySupport: '',
            observations: ''
        },
        recommendations: {
            strengths: [],
            difficulties: [],
            goals: [],
            strategies: [],
            familyGuidance: '',
            schoolGuidance: ''
        }
    });

    const performanceOptions = [
        { value: 'excellent', label: 'Excelente' },
        { value: 'good', label: 'Bom' },
        { value: 'regular', label: 'Regular' },
        { value: 'poor', label: 'Insuficiente' },
        { value: 'not_evaluated', label: 'Não Avaliado' }
    ];

    const handleSave = () => {
        const reportData = {
            type: 'school',
            title: formData.title || `Relatório Escolar - ${patient.fullName} - ${formData.schoolInfo.grade} - ${formData.schoolYear}`,
            patientId: patient._id,
            patientName: patient.fullName,
            date: new Date().toISOString().split('T')[0],
            content: formData,
            status: 'completed'
        };
        onSave(reportData);
    };

    const updateFormData = (section: string, subsection: string, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section as keyof typeof prev],
                [subsection]: {
                    ...(prev[section as keyof typeof prev] as any)?.[subsection],
                    [field]: value
                }
            }
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>
                Novo Relatório Escolar - {patient.fullName}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    {/* Informações Básicas */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Informações do Relatório
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Título do Relatório"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder={`Relatório Escolar - ${patient.fullName}`}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="Ano Letivo"
                                            value={formData.schoolYear}
                                            onChange={(e) => setFormData(prev => ({ ...prev, schoolYear: e.target.value }))}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={4}>
                                        <FormControl fullWidth>
                                            <InputLabel>Semestre</InputLabel>
                                            <Select
                                                value={formData.semester}
                                                label="Semestre"
                                                onChange={(e) => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                                            >
                                                <MenuItem value="1º">1º Semestre</MenuItem>
                                                <MenuItem value="2º">2º Semestre</MenuItem>
                                                <MenuItem value="3º">3º Semestre</MenuItem>
                                                <MenuItem value="4º">4º Semestre</MenuItem>
                                                <MenuItem value="annual">Anual</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Informações Escolares */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Informações Escolares
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Nome da Escola"
                                            value={formData.schoolInfo.schoolName}
                                            onChange={(e) => updateFormData('schoolInfo', '', 'schoolName', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Série/Ano"
                                            value={formData.schoolInfo.grade}
                                            onChange={(e) => updateFormData('schoolInfo', '', 'grade', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Professor Responsável"
                                            value={formData.schoolInfo.teacher}
                                            onChange={(e) => updateFormData('schoolInfo', '', 'teacher', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Desempenho Acadêmico */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Desempenho Acadêmico
                                </Typography>
                                
                                {/* Língua Portuguesa */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Língua Portuguesa
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <InputLabel>Desempenho</InputLabel>
                                                <Select
                                                    value={formData.academicPerformance.portuguese.performance}
                                                    label="Desempenho"
                                                    onChange={(e) => updateFormData('academicPerformance', 'portuguese', 'performance', e.target.value)}
                                                >
                                                    {performanceOptions.map(option => (
                                                        <MenuItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Observações"
                                                multiline
                                                rows={2}
                                                value={formData.academicPerformance.portuguese.observations}
                                                onChange={(e) => updateFormData('academicPerformance', 'portuguese', 'observations', e.target.value)}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Matemática */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Matemática
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <InputLabel>Desempenho</InputLabel>
                                                <Select
                                                    value={formData.academicPerformance.mathematics.performance}
                                                    label="Desempenho"
                                                    onChange={(e) => updateFormData('academicPerformance', 'mathematics', 'performance', e.target.value)}
                                                >
                                                    {performanceOptions.map(option => (
                                                        <MenuItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Observações"
                                                multiline
                                                rows={2}
                                                value={formData.academicPerformance.mathematics.observations}
                                                onChange={(e) => updateFormData('academicPerformance', 'mathematics', 'observations', e.target.value)}
                                            />
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Observações Gerais */}
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Observações Gerais"
                                        multiline
                                        rows={3}
                                        value={formData.academicPerformance.overallObservations}
                                        onChange={(e) => updateFormData('academicPerformance', '', 'overallObservations', e.target.value)}
                                    />
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Habilidades e Comportamento */}
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Habilidades Cognitivas
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Atenção"
                                            multiline
                                            rows={2}
                                            value={formData.skills.cognitive.attention}
                                            onChange={(e) => updateFormData('skills', 'cognitive', 'attention', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Memória"
                                            multiline
                                            rows={2}
                                            value={formData.skills.cognitive.memory}
                                            onChange={(e) => updateFormData('skills', 'cognitive', 'memory', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Comportamento
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Participação em Sala"
                                            multiline
                                            rows={2}
                                            value={formData.behavior.classroomParticipation}
                                            onChange={(e) => updateFormData('behavior', '', 'classroomParticipation', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Realização de Tarefas"
                                            multiline
                                            rows={2}
                                            value={formData.behavior.homeworkCompletion}
                                            onChange={(e) => updateFormData('behavior', '', 'homeworkCompletion', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Recomendações */}
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Recomendações
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Pontos Fortes"
                                            multiline
                                            rows={3}
                                            value={formData.recommendations.strengths.join(', ')}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                recommendations: {
                                                    ...prev.recommendations,
                                                    strengths: e.target.value.split(', ')
                                                }
                                            }))}
                                            placeholder="Separe por vírgulas"
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="Dificuldades"
                                            multiline
                                            rows={3}
                                            value={formData.recommendations.difficulties.join(', ')}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                recommendations: {
                                                    ...prev.recommendations,
                                                    difficulties: e.target.value.split(', ')
                                                }
                                            }))}
                                            placeholder="Separe por vírgulas"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Orientações para a Escola"
                                            multiline
                                            rows={3}
                                            value={formData.recommendations.schoolGuidance}
                                            onChange={(e) => updateFormData('recommendations', '', 'schoolGuidance', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Orientações para a Família"
                                            multiline
                                            rows={3}
                                            value={formData.recommendations.familyGuidance}
                                            onChange={(e) => updateFormData('recommendations', '', 'familyGuidance', e.target.value)}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : 'Salvar Relatório'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}