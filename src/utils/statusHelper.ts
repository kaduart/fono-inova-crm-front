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
        operationalStatus: 'scheduled',
        clinicalStatus: 'pending'
    };

    const statusMap: Record<string, { operationalStatus: string; clinicalStatus: string }> = {
        create: defaults,
        complete: { operationalStatus: 'paid', clinicalStatus: 'completed' },
        cancel: { operationalStatus: 'canceled', clinicalStatus: 'missed' },
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

// 🚀 V2: Helper para determinar status visual baseado nos dois campos
export const getAppointmentVisualStatus = (
    operationalStatus?: string,
    clinicalStatus?: string
): { label: string; color: string; priority: 'high' | 'medium' | 'low' } => {
    // Prioridade: completed > canceled > confirmed > scheduled > pending
    
    if (operationalStatus === 'completed' || clinicalStatus === 'completed') {
        return { label: 'Concluído', color: 'bg-blue-100 text-blue-800', priority: 'high' };
    }
    
    if (operationalStatus === 'canceled' || clinicalStatus === 'missed') {
        return { label: 'Cancelado', color: 'bg-red-100 text-red-800', priority: 'high' };
    }
    
    if (operationalStatus === 'confirmed') {
        return { label: 'Confirmado', color: 'bg-green-100 text-green-800', priority: 'medium' };
    }
    
    if (operationalStatus === 'scheduled') {
        return { label: 'Agendado', color: 'bg-yellow-100 text-yellow-800', priority: 'medium' };
    }
    
    if (operationalStatus === 'processing_create' || operationalStatus === 'processing_complete') {
        return { label: 'Processando', color: 'bg-purple-100 text-purple-800', priority: 'high' };
    }
    
    return { label: 'Pendente', color: 'bg-gray-100 text-gray-800', priority: 'low' };
};