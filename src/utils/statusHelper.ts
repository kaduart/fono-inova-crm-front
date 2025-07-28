// statusHelper.ts
import { AppointmentStatus } from '../utils/types/types';

export const STATUS_OPTIONS = [
    { value: 'agendado', label: 'Agendado', type: 'operational' },
    { value: 'confirmado', label: 'Confirmado', type: 'operational' },
    { value: 'cancelado', label: 'Cancelado', type: 'operational' },
    { value: 'pago', label: 'Pago', type: 'operational' },
    { value: 'pendente', label: 'Pendente', type: 'clinical' },
    { value: 'em_andamento', label: 'Em Andamento', type: 'clinical' },
    { value: 'concluído', label: 'Concluído', type: 'clinical' },
    { value: 'faltou', label: 'Faltou', type: 'clinical' },
] as const;

export const getStatusConfig = (status: AppointmentStatus) => {
    return STATUS_OPTIONS.find(option => option.value === status);
};

export const resolveStatus = (
    action: 'create' | 'update' | 'complete' | 'cancel',
    currentStatus?: AppointmentStatus
): { operationalStatus: string; clinicalStatus: string } => {
    const defaults = {
        operationalStatus: 'agendado',
        clinicalStatus: 'pendente'
    };

    const statusMap: Record<string, { operationalStatus: string; clinicalStatus: string }> = {
        create: defaults,
        complete: { operationalStatus: 'pago', clinicalStatus: 'concluído' },
        cancel: { operationalStatus: 'cancelado', clinicalStatus: 'cancelado' },
        update: currentStatus ? {
            operationalStatus: getStatusConfig(currentStatus)?.type === 'operational' ? currentStatus : defaults.operationalStatus,
            clinicalStatus: getStatusConfig(currentStatus)?.type === 'clinical' ? currentStatus : defaults.clinicalStatus
        } : defaults
    };

    return statusMap[action] || defaults;
};

export const getStatusColor = (status: AppointmentStatus) => {
    const colors: Record<string, string> = {
        concluído: '#4CAF50',
        em_andamento: '#2196F3',
        pago: '#4CAF50',
        cancelado: '#F44336',
        faltou: '#F44336',
        agendado: '#FF9800',
        pendente: '#9E9E9E',
        confirmado: '#4CAF50'
    };

    return colors[status] || '#9E9E9E';
};