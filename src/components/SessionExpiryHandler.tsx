// components/SessionExpiryHandler.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clearAuthTokens } from '../services/authService';

const SessionExpiryHandler: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const handleSessionExpired = async () => {
            // 🧹 LIMPEZA COMPLETA - Remove TODOS os dados de autenticação
            clearAuthTokens();
            
            // Chama logout do contexto para atualizar estado (forceClear=true)
            await logout({ forceClear: true });
            
            // Redireciona forçando login (forceLogin=true evita auto-redirect)
            navigate('/login?sessionExpired=true&forceLogin=true', { replace: true });
        };

        window.addEventListener('sessionExpired', handleSessionExpired);

        // Listener para erros de autenticação da API
        const handleAuthError = (event: CustomEvent) => {
            const detail = event?.detail;
            const code = detail?.code;
            if (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED' || code === 'TOKEN_REQUIRED' || code === 'INVALID_TOKEN') {
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