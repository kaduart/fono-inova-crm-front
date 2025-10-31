// src/hooks/useSpecialties.js
import api from '@/services/api';
import { useEffect, useState } from 'react';

export default function useSpecialties() {
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSpecialties = async () => {
            try {
                setLoading(true);
                const response = await api.get('/specialties');
                setSpecialties(response.data);
                setError(null);
            } catch (err) {
                setError('Falha ao carregar especialidades');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSpecialties();
    }, []);

    return { specialties, loading, error };
}