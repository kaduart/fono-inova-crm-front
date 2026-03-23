import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { socketManager } from '../utils/socketManager';

export function useSystemAlerts() {
    useEffect(() => {
        const unsubscribe = socketManager.onSystemAlert((alert) => {
            console.log('[SystemAlert]', alert);

            const msg = `${alert.type}: ${alert.message}`;

            switch (alert.type) {
                case 'silence':
                    toast.error(msg, { 
                        autoClose: false,
                        closeOnClick: false
                    });
                    break;
                case 'anomaly':
                    toast.warning(msg, { autoClose: 10000 });
                    break;
                case 'error':
                    toast.error(msg, { autoClose: 8000 });
                    break;
                default:
                    toast.info(msg);
            }
        });

        return () => unsubscribe();
    }, []);
}

export default useSystemAlerts;
