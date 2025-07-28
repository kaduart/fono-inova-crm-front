// pages/professional/index.tsx
import { useUser } from '@/context/UserContext';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfessionalHomePage() {
    const { user } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        // Redireciona baseado na especialidade principal
        if (user?.specialties?.length) {
            navigate(`/specialty/${user.specialties[0]}/schedule`);
        } else {
            navigate('/schedule');
        }
    }, [user, navigate]);

    return <div>Carregando...</div>;
}