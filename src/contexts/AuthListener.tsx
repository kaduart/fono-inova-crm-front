// src/components/AuthListener.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const AuthListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthError = (event: CustomEvent) => {
            navigate('/login', {
                state: {
                    from: window.location.pathname,
                    error: event.detail
                },
                replace: true
            });
        };

        window.addEventListener('authError', handleAuthError as EventListener);
        return () => {
            window.removeEventListener('authError', handleAuthError as EventListener);
        };
    }, [navigate]);

    return null;
};
