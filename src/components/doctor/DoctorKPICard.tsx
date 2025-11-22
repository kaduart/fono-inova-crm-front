// src/components/doctor/KPICard.tsx
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
    onClick?: () => void;
}

export default function KPICard({
    title,
    value,
    icon: Icon,
    trend,
    color = 'primary',
    onClick
}: KPICardProps) {
    const theme = useTheme();

    const colorMap = {
        primary: theme.palette.primary.main,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        info: theme.palette.info.main
    };

    const bgColorMap = {
        primary: `${theme.palette.primary.main}10`,
        success: `${theme.palette.success.main}10`,
        warning: `${theme.palette.warning.main}10`,
        error: `${theme.palette.error.main}10`,
        info: `${theme.palette.info.main}10`
    };

    return (
        <Card
            onClick={onClick}
            sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease',
                '&:hover': onClick ? {
                    boxShadow: theme.shadows[6],
                    transform: 'translateY(-2px)'
                } : {}
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: bgColorMap[color],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icon size={24} color={colorMap[color]} />
                    </Box>

                    {trend && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                backgroundColor: trend.isPositive
                                    ? `${theme.palette.success.main}15`
                                    : `${theme.palette.error.main}15`
                            }}
                        >
                            {trend.isPositive ? (
                                <TrendingUp size={14} color={theme.palette.success.main} />
                            ) : (
                                <TrendingDown size={14} color={theme.palette.error.main} />
                            )}
                            <Typography
                                variant="caption"
                                sx={{
                                    fontWeight: 600,
                                    color: trend.isPositive
                                        ? theme.palette.success.main
                                        : theme.palette.error.main
                                }}
                            >
                                {Math.abs(trend.value)}%
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 700,
                        color: 'grey.900',
                        mb: 0.5
                    }}
                >
                    {value}
                </Typography>

                <Typography
                    variant="body2"
                    sx={{
                        color: 'grey.600',
                        fontWeight: 500
                    }}
                >
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );
}