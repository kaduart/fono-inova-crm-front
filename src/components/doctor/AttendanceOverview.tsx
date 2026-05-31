/**
 * AttendanceOverview — componente dumb de frequência.
 *
 * Não faz fetch. Recebe dados de useDoctorInsights() via DoctorDashboard.
 * Mantido como componente separado para compatibilidade com outros pontos de uso futuro.
 */

import { Card, CardContent, Chip, LinearProgress, Typography } from '@mui/material';
import { Users } from 'lucide-react';
import type { AttendanceSummary } from '../../utils/derivePatientRisk';
import { formatDateBrazilian } from '../../utils/dateFormat';

interface Props {
    data: AttendanceSummary[];
    loading?: boolean;
    onPatientClick?: (patient: AttendanceSummary) => void;
}

export default function AttendanceOverview({ data, loading, onPatientClick }: Props) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-10 text-gray-500 text-sm">
                Carregando dados de frequência...
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="text-center py-12 text-gray-500 text-sm">
                Nenhum dado de frequência disponível.
            </div>
        );
    }

    const avgFreq = Math.round(
        data.reduce((acc, p) => acc + p.frequency, 0) / data.length
    );

    return (
        <div className="space-y-6">
            <Card sx={{ borderRadius: 3, border: '1px solid #e5e7eb', background: '#f9fafb', p: 2 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 0 } }}>
                    <Users size={28} color="#16a34a" />
                    <div>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#065f46' }}>
                            Média Geral de Frequência
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                            {avgFreq}%
                        </Typography>
                    </div>
                </CardContent>
            </Card>

            {data.map((item) => (
                <Card
                    key={item.patient._id}
                    sx={{
                        borderRadius: 3,
                        border: '1px solid #e5e7eb',
                        cursor: onPatientClick ? 'pointer' : 'default',
                        transition: '0.2s',
                        '&:hover': onPatientClick ? { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } : {},
                    }}
                    onClick={onPatientClick ? () => onPatientClick(item) : undefined}
                >
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                                {item.patient.fullName}
                            </Typography>
                            <Chip
                                label={`${item.frequency}%`}
                                color={item.frequency >= 90 ? 'success' : item.frequency >= 75 ? 'warning' : 'error'}
                                variant="outlined"
                            />
                        </div>

                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                            Última sessão: {formatDateBrazilian(item.lastSession)}
                        </Typography>

                        <LinearProgress
                            variant="determinate"
                            value={item.frequency}
                            sx={{ height: 8, borderRadius: 4, mb: 2, backgroundColor: '#f3f4f6' }}
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-y-1 text-sm text-gray-600">
                            <span>Total: {item.total}</span>
                            <span>Presenças: {item.attended}</span>
                            <span>Faltas: {item.missed}</span>
                            <span>Canceladas: {item.canceled}</span>
                            <span>Pendentes: {item.pending}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
