// src/components/AuthGuard.tsx
import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const publicRoutes = ['/login', '/signup', '/'];

        if (!user && !publicRoutes.includes(location.pathname)) {
            navigate('/login', {
                state: { from: location },
                replace: true
            });
        }
    }, [user, navigate, location]);

    return <>{children}</>;
}