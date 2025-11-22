// src/components/doctor/AlertsPanel.tsx
import { AlertCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { Box, Card, CardContent, CardHeader, Chip, Typography, useTheme } from '@mui/material';

interface Alert {
    id: string;
    type: 'urgent' | 'warning' | 'info';
    title: string;
    description: string;
    count?: number;
    onClick?: () => void;
}

interface AlertsPanelProps {
    alerts: Alert[];
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
    const theme = useTheme();

    const getAlertIcon = (type: Alert['type']) => {
        switch (type) {
            case 'urgent':
                return <AlertCircle size={20} color={theme.palette.error.main} />;
            case 'warning':
                return <AlertTriangle size={20} color={theme.palette.warning.main} />;
            case 'info':
                return <Clock size={20} color={theme.palette.info.main} />;
        }
    };

    const getAlertColor = (type: Alert['type']) => {
        switch (type) {
            case 'urgent':
                return {
                    bg: `${theme.palette.error.main}08`,
                    border: theme.palette.error.main,
                    text: theme.palette.error.dark
                };
            case 'warning':
                return {
                    bg: `${theme.palette.warning.main}08`,
                    border: theme.palette.warning.main,
                    text: theme.palette.warning.dark
                };
            case 'info':
                return {
                    bg: `${theme.palette.info.main}08`,
                    border: theme.palette.info.main,
                    text: theme.palette.info.dark
                };
        }
    };

    if (alerts.length === 0) {
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
                        background: `linear-gradient(135deg, ${theme.palette.success.light}10, ${theme.palette.success.light}05)`
                    }}
                    title={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <FileText size={20} color={theme.palette.success.main} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                                Notificações
                            </Typography>
                        </Box>
                    }
                />
                <CardContent>
                    <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
                        <FileText size={48} color={theme.palette.grey[300]} style={{ marginBottom: '16px' }} />
                        <Typography variant="body1" sx={{ mb: 1, color: 'grey.600' }}>
                            Tudo em dia! 🎉
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.500' }}>
                            Nenhuma pendência no momento
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    // Ordenar por prioridade
    const sortedAlerts = [...alerts].sort((a, b) => {
        const priority = { urgent: 3, warning: 2, info: 1 };
        return priority[b.type] - priority[a.type];
    });

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
                    background: `linear-gradient(135deg, ${theme.palette.warning.light}10, ${theme.palette.error.light}05)`
                }}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AlertTriangle size={20} color={theme.palette.warning.main} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                            Alertas e Pendências
                        </Typography>
                        <Chip
                            label={alerts.length}
                            size="small"
                            sx={{
                                ml: 1,
                                fontWeight: 700,
                                backgroundColor: theme.palette.error.main,
                                color: 'white'
                            }}
                        />
                    </Box>
                }
            />
            <CardContent sx={{ p: 0 }}>
                <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {sortedAlerts.map((alert, index) => {
                        const colors = getAlertColor(alert.type);
                        return (
                            <Box
                                key={alert.id}
                                onClick={alert.onClick}
                                sx={{
                                    p: 2.5,
                                    borderBottom: index < sortedAlerts.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                                    cursor: alert.onClick ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: colors.bg,
                                    borderLeft: `4px solid ${colors.border}`,
                                    '&:hover': alert.onClick ? {
                                        backgroundColor: `${colors.border}15`,
                                        transform: 'translateX(4px)'
                                    } : {}
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Box sx={{ mt: 0.5 }}>
                                        {getAlertIcon(alert.type)}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: colors.text
                                                }}
                                            >
                                                {alert.title}
                                            </Typography>
                                            {alert.count !== undefined && (
                                                <Chip
                                                    label={alert.count}
                                                    size="small"
                                                    sx={{
                                                        height: 20,
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        backgroundColor: colors.border,
                                                        color: 'white'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: 'grey.600' }}
                                        >
                                            {alert.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </CardContent>
        </Card>
    );
}