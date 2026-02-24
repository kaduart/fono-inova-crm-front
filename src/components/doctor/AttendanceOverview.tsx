import { Card, CardContent, Chip, LinearProgress, Typography } from '@mui/material';
import axios from 'axios';
import { Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BASE_URL } from '../../constants/constants';
import API from '../../services/api';
import { formatDateBrazilian, formatDateTimeBR } from '../../utils/dateFormat';

interface AttendanceSummary {
    patient: { _id: string; fullName: string };
    total: number;
    attended: number;
    missed: number;
    canceled: number;
    pending: number;
    frequency: number;
    lastSession: string;
}

export default function AttendanceOverview({ doctorId }: { doctorId: string }) {
    const [data, setData] = useState<AttendanceSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (doctorId) fetchAttendance();
    }, [doctorId]);

    const fetchAttendance = async () => {
        try {
            const res = await API.get(`${BASE_URL}/doctors/${doctorId}/attendance-summary`);
            if (res.data.success) setData(res.data.data);
        } catch (err) {
            console.error('Erro ao carregar frequência:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-10 text-gray-500">
                Carregando dados de frequência...
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="text-center py-12 text-gray-500">
                Nenhum dado de frequência disponível no momento.
            </div>
        );
    }

    // Média geral do doutor
    const avgFreq = Math.round(
        data.reduce((acc, p) => acc + p.frequency, 0) / data.length
    );

    return (
        <div className="space-y-6">
            {/* Cabeçalho com média geral */}
            <Card
                sx={{
                    borderRadius: 3,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    p: 2
                }}
            >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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

            {/* Lista de pacientes */}
            {data.map((item) => (
                <Card
                    key={item.patient._id}
                    sx={{
                        borderRadius: 3,
                        border: '1px solid #e5e7eb',
                        transition: '0.2s',
                        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }
                    }}
                >
                    <CardContent>
                        <div className="flex justify-between items-center mb-2">
                            <Typography variant="h6" fontWeight={600} color="text.primary">
                                {item.patient.fullName}
                            </Typography>
                            <Chip
                                label={`${item.frequency}%`}
                                color={
                                    item.frequency >= 90
                                        ? 'success'
                                        : item.frequency >= 75
                                            ? 'warning'
                                            : 'error'
                                }
                                variant="outlined"
                            />
                        </div>

                        <Typography
                            variant="body2"
                            sx={{ color: 'text.secondary', mb: 2 }}
                        >
                            Última sessão: {formatDateBrazilian(item.lastSession)}
                        </Typography>

                        <LinearProgress
                            variant="determinate"
                            value={item.frequency}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                mb: 2,
                                backgroundColor: '#f3f4f6'
                            }}
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
