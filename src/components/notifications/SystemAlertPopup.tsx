import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, X, AlertCircle, Info } from 'lucide-react';
import { socketManager } from '../../utils/socketManager';

interface SystemAlert {
  id: string;
  type: 'anomaly' | 'silence' | 'error' | 'info';
  message: string;
  timestamp: number;
}

const MAX_ALERTS = 3;
const AUTO_CLOSE_TIME = 8000; // 8 segundos

export const SystemAlertPopup: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  const addAlert = useCallback((payload: { type: string; message: string }) => {
    const newAlert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: payload.type as SystemAlert['type'],
      message: payload.message,
      timestamp: Date.now(),
    };

    console.log('[SystemAlertPopup] 🔔 Novo alerta:', newAlert);

    setAlerts(prev => {
      // Remove alertas duplicados (mesma mensagem)
      const filtered = prev.filter(a => a.message !== newAlert.message);
      // Adiciona novo e limita a quantidade
      return [newAlert, ...filtered].slice(0, MAX_ALERTS);
    });

    // Auto-remove após tempo
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
    }, AUTO_CLOSE_TIME);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Escuta alertas via socket
  useEffect(() => {
    console.log('[SystemAlertPopup] 📡 Registrando listener...');
    
    const unsubscribe = socketManager.onSystemAlert((payload) => {
      console.log('[SystemAlertPopup] 📨 Alerta recebido:', payload);
      addAlert(payload);
    });

    return () => {
      console.log('[SystemAlertPopup] 🧹 Removendo listener');
      unsubscribe();
    };
  }, [addAlert]);

  if (alerts.length === 0) return null;

  const getAlertStyles = (type: SystemAlert['type']) => {
    switch (type) {
      case 'anomaly':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          iconBg: 'bg-yellow-100',
          title: 'Alerta de Anomalia'
        };
      case 'error':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          title: 'Erro'
        };
      case 'silence':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50',
          icon: 'text-orange-600',
          iconBg: 'bg-orange-100',
          title: 'Silêncio Detectado'
        };
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          title: 'Informação'
        };
    }
  };

  const getIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'silence':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {alerts.map((alert) => {
        const styles = getAlertStyles(alert.type);
        
        return (
          <div
            key={alert.id}
            className={`bg-white border-l-4 ${styles.border} rounded-lg shadow-lg p-3 min-w-[280px] max-w-[350px] animate-in slide-in-from-right fade-in duration-300 pointer-events-auto`}
          >
            <div className="flex items-start gap-3">
              <div className={`${styles.iconBg} p-2 rounded-full flex-shrink-0`}>
                <div className={styles.icon}>
                  {getIcon(alert.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium mb-0.5 ${styles.icon}`}>
                  {styles.title}
                </p>
                <p className="text-sm text-gray-700 line-clamp-3 mt-0.5">
                  {alert.message}
                </p>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="text-gray-400 hover:text-gray-600 p-1 -mr-1 -mt-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SystemAlertPopup;
