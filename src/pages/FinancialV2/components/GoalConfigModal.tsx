import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Alert, FormControl, InputLabel, Select, MenuItem, Divider } from '@mui/material';
import { TrackChanges, Save, CalendarToday, CalendarViewWeek, CalendarMonth } from '@mui/icons-material';
import { useGoals } from '../hooks/useGoals';
import { formatCurrency } from '../../../utils/format';

interface GoalConfigModalProps {
    open: boolean;
    onClose: () => void;
    month: number;
    year: number;
}

type GoalType = 'daily' | 'weekly' | 'monthly';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const GoalConfigModal = ({ open, onClose, month, year }: GoalConfigModalProps) => {
    const { data: goal, saveGoal, isSaving } = useGoals(month, year);
    
    const [goalType, setGoalType] = useState<GoalType>('monthly');
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [selectedWeek, setSelectedWeek] = useState(dayjs().startOf('week').format('YYYY-MM-DD'));
    const [expectedRevenue, setExpectedRevenue] = useState('');
    const [totalSessions, setTotalSessions] = useState('');
    const [workHours, setWorkHours] = useState('');
    const [saved, setSaved] = useState(false);
    
    useEffect(() => {
        if (goal && goal.exists) {
            setExpectedRevenue(goal.targets.expectedRevenue > 0 ? String(goal.targets.expectedRevenue) : '');
            setTotalSessions(goal.targets.totalSessions > 0 ? String(goal.targets.totalSessions) : '');
            setWorkHours(goal.targets.workHours > 0 ? String(goal.targets.workHours) : '');
        }
    }, [goal, open]);
    
    const handleSave = () => {
        let startDate, endDate;
        
        if (goalType === 'daily') {
            startDate = selectedDate;
            endDate = selectedDate;
        } else if (goalType === 'weekly') {
            startDate = selectedWeek;
            endDate = dayjs(selectedWeek).endOf('week').format('YYYY-MM-DD');
        } else {
            // Monthly - usa o mês/ano selecionados
            startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            endDate = dayjs(`${year}-${month}`).endOf('month').format('YYYY-MM-DD');
        }
        
        saveGoal({
            month,
            year,
            type: goalType,
            startDate,
            endDate,
            expectedRevenue: Number(expectedRevenue) || 0,
            totalSessions: Number(totalSessions) || 0,
            workHours: Number(workHours) || 0
        });
        
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 1500);
    };
    
    const getPeriodLabel = () => {
        if (goalType === 'daily') {
            return dayjs(selectedDate).format('DD/MM/YYYY');
        } else if (goalType === 'weekly') {
            const start = dayjs(selectedWeek);
            const end = start.endOf('week');
            return `${start.format('DD/MM')} → ${end.format('DD/MM')}`;
        } else {
            return `${monthNames[month - 1]} de ${year}`;
        }
    };
    
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrackChanges color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                        Configurar Meta
                    </Typography>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                {saved && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        ✅ Meta salva com sucesso!
                    </Alert>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                    
                    {/* TIPO DE META */}
                    <FormControl fullWidth>
                        <InputLabel>Tipo de Meta</InputLabel>
                        <Select
                            value={goalType}
                            onChange={(e) => setGoalType(e.target.value as GoalType)}
                            label="Tipo de Meta"
                        >
                            <MenuItem value="daily">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarToday fontSize="small" />
                                    📅 Diária (um dia específico)
                                </Box>
                            </MenuItem>
                            <MenuItem value="weekly">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarViewWeek fontSize="small" />
                                    📆 Semanal (7 dias)
                                </Box>
                            </MenuItem>
                            <MenuItem value="monthly">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CalendarMonth fontSize="small" />
                                    🗓️ Mensal (mês inteiro)
                                </Box>
                            </MenuItem>
                        </Select>
                    </FormControl>
                    
                    {/* SELETOR DE DATA BASEADO NO TIPO */}
                    {goalType === 'daily' && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Qual dia?
                            </Typography>
                            <TextField
                                fullWidth
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                inputProps={{ max: dayjs().add(1, 'month').format('YYYY-MM-DD') }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {weekDays[dayjs(selectedDate).day()]}, {dayjs(selectedDate).format('DD/MM/YYYY')}
                            </Typography>
                        </Box>
                    )}
                    
                    {goalType === 'weekly' && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Qual semana? (selecione o domingo de início)
                            </Typography>
                            <TextField
                                fullWidth
                                type="date"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(dayjs(e.target.value).startOf('week').format('YYYY-MM-DD'))}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Semana: {dayjs(selectedWeek).format('DD/MM')} → {dayjs(selectedWeek).endOf('week').format('DD/MM')}
                            </Typography>
                        </Box>
                    )}
                    
                    {goalType === 'monthly' && (
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Período:
                            </Typography>
                            <Typography variant="body1">
                                {monthNames[month - 1]} de {year}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {dayjs(`${year}-${month}-01`).startOf('month').format('DD/MM')} → {dayjs(`${year}-${month}-01`).endOf('month').format('DD/MM')}
                            </Typography>
                        </Box>
                    )}
                    
                    <Divider />
                    
                    {/* Meta de Receita */}
                    <Box>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            💰 Meta de Receita (Principal)
                        </Typography>
                        <TextField
                            fullWidth
                            label={`Quanto quer faturar ${goalType === 'daily' ? 'neste dia' : goalType === 'weekly' ? 'nesta semana' : 'neste mês'}?`}
                            type="number"
                            value={expectedRevenue}
                            onChange={(e) => setExpectedRevenue(e.target.value)}
                            placeholder="Ex: 50000"
                            InputProps={{
                                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>R$</Typography>
                            }}
                            helperText={expectedRevenue ? `Meta: ${formatCurrency(Number(expectedRevenue))}` : 'Digite o valor em reais'}
                        />
                    </Box>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {/* Meta de Sessões */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                📅 Sessões
                            </Typography>
                            <TextField
                                fullWidth
                                label="Quantas?"
                                type="number"
                                value={totalSessions}
                                onChange={(e) => setTotalSessions(e.target.value)}
                                placeholder={goalType === 'daily' ? 'Ex: 5' : goalType === 'weekly' ? 'Ex: 35' : 'Ex: 120'}
                            />
                        </Box>
                        
                        {/* Meta de Horas */}
                        <Box>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                ⏰ Horas
                            </Typography>
                            <TextField
                                fullWidth
                                label="Quantas?"
                                type="number"
                                value={workHours}
                                onChange={(e) => setWorkHours(e.target.value)}
                                placeholder={goalType === 'daily' ? 'Ex: 8' : goalType === 'weekly' ? 'Ex: 40' : 'Ex: 160'}
                            />
                        </Box>
                    </Box>
                    
                    {/* Preview */}
                    {expectedRevenue && (
                        <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                Resumo da Meta:
                            </Typography>
                            <Typography variant="h5" fontWeight="bold">
                                {formatCurrency(Number(expectedRevenue))}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {getPeriodLabel()}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose} color="inherit">
                    Cancelar
                </Button>
                <Button 
                    onClick={handleSave} 
                    variant="contained" 
                    startIcon={<Save />}
                    disabled={!expectedRevenue || isSaving}
                >
                    {isSaving ? 'Salvando...' : `Salvar Meta ${goalType === 'daily' ? 'Diária' : goalType === 'weekly' ? 'Semanal' : 'Mensal'}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GoalConfigModal;
