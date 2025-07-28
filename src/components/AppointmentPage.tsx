import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Appointment } from '../hooks/useTempAppointments';

type ScheduleModalProps = {
    open: boolean;
    mode: 'create' | 'edit';
    initialData: Appointment;
    onSave: (data: Appointment) => void;
    onClose: () => void;
};

const ScheduleModal: React.FC<ScheduleModalProps> = ({ open, mode, initialData, onSave, onClose }) => {
    const [formState, setFormState] = useState<Appointment>(initialData);
    const [errors, setErrors] = useState<Partial<Record<keyof Appointment, string>>>({});

    useEffect(() => {
        setFormState(initialData);
        setErrors({});
    }, [initialData]);

    const handleChange = (field: keyof Appointment) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { value: unknown }>
    ) => {
        const value = 'target' in e ? e.target.value : (e.value as string);
        setFormState(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof Appointment, string>> = {};
        if (!formState.doctor) newErrors.doctor = 'Profissional obrigatório';
        if (!formState.dataHora) newErrors.dataHora = 'Data e hora obrigatórias';
        if (!formState.sessionType) newErrors.sessionType = 'Tipo de sessão obrigatório';
        if (!formState.reason) newErrors.reason = 'Motivo obrigatório';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        onSave(formState);
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">z
            <DialogTitle>{mode === 'edit' ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="doctor"
                            value={formState.doctor}
                            onChange={handleChange('doctor')}
                            error={!!errors.doctor}
                            helperText={errors.doctor}
                            fullWidth
                        />
                        <TextField
                            label="Data e Hora"
                            type="datetime-local"
                            value={formState.dataHora}
                            onChange={handleChange('dataHora')}
                            error={!!errors.dataHora}
                            helperText={errors.dataHora}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                        />
                        <TextField
                            label="Tipo de Sessão"
                            value={formState.sessionType}
                            onChange={handleChange('sessionType')}
                            error={!!errors.sessionType}
                            helperText={errors.sessionType}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formState.status}
                                label="Status"
                                onChange={handleChange('status')}
                            >
                                <MenuItem value="agendado">Agendado</MenuItem>
                                <MenuItem value="concluído">Concluído</MenuItem>
                                <MenuItem value="cancelado">Cancelado</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Motivo"
                            value={formState.reason}
                            onChange={handleChange('reason')}
                            error={!!errors.reason}
                            helperText={errors.reason}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Anotações"
                            value={formState.anotacoes}
                            onChange={handleChange('anotacoes')}
                            fullWidth
                            multiline
                            rows={2}
                        />
                    </Box>
                    <DialogActions>
                        <Button onClick={onClose}>Fechar</Button>
                        <Button variant="contained" type="submit">Salvar</Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleModal;
