// src/components/doctor/QuickActions.tsx
import { Box, Button, Card, CardContent, CardHeader, Typography, useTheme } from '@mui/material';
import { Calendar, FileText, Plus, User } from 'lucide-react';

interface QuickActionsProps {
    onNewAppointment: () => void;
    onNewPatient: () => void;
    onQuickEvolution: () => void;
    onViewCalendar: () => void;
}

export default function QuickActions({
    onNewAppointment,
    onNewPatient,
    onQuickEvolution,
    onViewCalendar
}: QuickActionsProps) {
    const theme = useTheme();

    const actions = [
        {
            label: 'Nova Consulta',
            icon: Calendar,
            onClick: onNewAppointment,
            color: theme.palette.primary.main,
            bg: `${theme.palette.primary.main}10`
        },
        {
            label: 'Novo Paciente',
            icon: User,
            onClick: onNewPatient,
            color: theme.palette.success.main,
            bg: `${theme.palette.success.main}10`
        },
        {
            label: 'Evolução Rápida',
            icon: FileText,
            onClick: onQuickEvolution,
            color: theme.palette.info.main,
            bg: `${theme.palette.info.main}10`
        },
        {
            label: 'Ver Agenda',
            icon: Calendar,
            onClick: onViewCalendar,
            color: theme.palette.warning.main,
            bg: `${theme.palette.warning.main}10`
        }
    ];

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
            }}
        >
            <CardHeader
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`
                }}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Plus size={20} color={theme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                            Ações Rápidas
                        </Typography>
                    </Box>
                }
            />
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.label}
                                onClick={action.onClick}
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    border: `2px solid ${theme.palette.divider}`,
                                    backgroundColor: action.bg,
                                    flexDirection: 'column',
                                    gap: 1,
                                    height: 'auto',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        backgroundColor: action.bg,
                                        borderColor: action.color,
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[4]
                                    }
                                }}
                            >
                                <Icon size={24} color={action.color} />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        fontWeight: 600,
                                        color: 'grey.800'
                                    }}
                                >
                                    {action.label}
                                </Typography>
                            </Button>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
}