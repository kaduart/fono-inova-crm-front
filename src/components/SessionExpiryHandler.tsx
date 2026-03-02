// components/SessionExpiryHandler.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SessionExpiryHandler: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const handleSessionExpired = async () => {
            await logout();
            navigate('/login?sessionExpired=true');
        };

        window.addEventListener('sessionExpired', handleSessionExpired);

        // Listener para erros de autenticação da API
        const handleAuthError = (event: CustomEvent) => {
            const detail = event?.detail;
            const code = detail?.code;
            if (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED') {
                handleSessionExpired();
            }
        };

        window.addEventListener('authError', handleAuthError as EventListener);

        return () => {
            window.removeEventListener('sessionExpired', handleSessionExpired);
            window.removeEventListener('authError', handleAuthError as EventListener);
        };
    }, [navigate, logout]);

    return null;
};

export default SessionExpiryHandler;