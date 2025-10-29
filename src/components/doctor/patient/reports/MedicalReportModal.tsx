// components/reports/MedicalReportModal.tsx
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
    Box
} from '@mui/material';
import { useState } from 'react';

interface MedicalReportModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    patient: any;
    loading?: boolean;
}

export default function MedicalReportModal({ open, onClose, onSave, patient, loading = false }: MedicalReportModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'medical' as 'medical' | 'progress' | 'evolution' | 'assessment',
        date: new Date().toISOString().split('T')[0],
        content: {
            diagnosis: '',
            observations: '',
            progress: '',
            goals: '',
            recommendations: '',
            nextSteps: '',
            treatmentPlan: '',
            medications: '',
            exams: ''
        },
        status: 'completed' as 'draft' | 'completed' | 'archived'
    });

    const handleSave = () => {
        const reportData = {
            ...formData,
            title: formData.title || `Relatório ${formData.type === 'medical' ? 'Médico' : formData.type === 'progress' ? 'de Progresso' : formData.type === 'evolution' ? 'de Evolução' : 'de Avaliação'} - ${patient.fullName}`,
            patientId: patient._id,
            patientName: patient.fullName
        };
        onSave(reportData);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                Novo Relatório Médico - {patient.fullName}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Título do Relatório"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={`Relatório Médico - ${patient.fullName}`}
                        />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Tipo de Relatório</InputLabel>
                            <Select
                                value={formData.type}
                                label="Tipo de Relatório"
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <MenuItem value="medical">Relatório Médico</MenuItem>
                                <MenuItem value="progress">Relatório de Progresso</MenuItem>
                                <MenuItem value="evolution">Relatório de Evolução</MenuItem>
                                <MenuItem value="assessment">Avaliação</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Diagnóstico"
                            multiline
                            rows={3}
                            value={formData.content.diagnosis}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, diagnosis: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Observações"
                            multiline
                            rows={4}
                            value={formData.content.observations}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, observations: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Progresso"
                            multiline
                            rows={3}
                            value={formData.content.progress}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, progress: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Metas"
                            multiline
                            rows={3}
                            value={formData.content.goals}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, goals: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Plano de Tratamento"
                            multiline
                            rows={3}
                            value={formData.content.treatmentPlan}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, treatmentPlan: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Medicações"
                            multiline
                            rows={2}
                            value={formData.content.medications}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, medications: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Exames Solicitados/Realizados"
                            multiline
                            rows={2}
                            value={formData.content.exams}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, exams: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Recomendações"
                            multiline
                            rows={3}
                            value={formData.content.recommendations}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, recommendations: e.target.value }
                            }))}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Próximos Passos"
                            multiline
                            rows={2}
                            value={formData.content.nextSteps}
                            onChange={(e) => setFormData(prev => ({
                                ...prev,
                                content: { ...prev.content, nextSteps: e.target.value }
                            }))}
                        />
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