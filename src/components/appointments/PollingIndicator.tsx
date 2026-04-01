// components/appointments/PollingIndicator.tsx
// 🚀 Indicador visual de polling para operações async V2

import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface PollingIndicatorProps {
  isPolling: boolean;
  progress?: { current: number; total: number } | null;
  error?: string | null;
  success?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const PollingIndicator: React.FC<PollingIndicatorProps> = ({
  isPolling,
  progress,
  error,
  success,
  onCancel,
  onRetry,
  className = ''
}) => {
  // Estado de sucesso
  if (success) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Concluído com sucesso!</span>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  // Estado de polling
  if (isPolling) {
    const percent = progress 
      ? Math.round((progress.current / progress.total) * 100) 
      : 0;

    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-gray-600">
            Processando{progress ? `... ${progress.current}/${progress.total}` : '...'}
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Cancelar
            </button>
          )}
        </div>
        
        {/* Barra de progresso */}
        {progress && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Badge de status para appointments
interface StatusBadgeProps {
  status: string;
  isProcessing?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  isProcessing,
  className = '' 
}) => {
  const config: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
    scheduled: { color: 'bg-yellow-100 text-yellow-800', label: 'Agendado' },
    confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmado' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Concluído' },
    canceled: { color: 'bg-red-100 text-red-800', label: 'Cancelado' },
    processing_create: { color: 'bg-purple-100 text-purple-800', label: 'Criando...' },
    processing_complete: { color: 'bg-purple-100 text-purple-800', label: 'Finalizando...' },
    processing_cancel: { color: 'bg-purple-100 text-purple-800', label: 'Cancelando...' },
    failed: { color: 'bg-red-100 text-red-800', label: 'Falhou' },
    error: { color: 'bg-red-100 text-red-800', label: 'Erro' },
  };

  const { color, label } = config[status] || { color: 'bg-gray-100 text-gray-800', label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color} ${className}`}>
      {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </span>
  );
};

export default PollingIndicator;
