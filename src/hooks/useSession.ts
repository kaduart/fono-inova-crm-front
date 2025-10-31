
// src/hooks/useSession.ts
import { useState } from 'react';
import packageService from '../services/packageService';
import { ISession } from '../utils/types/types';

export const useSession = (packageId: string) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const registerSession = async (sessionData: Omit<ISession, '_id'>) => {
        setLoading(true);
        try {
            // Cria a sessão e vincula ao pacote
            const newSession = await packageService.createSession(packageId, {
                ...sessionData,
                date: sessionData.date.toString()
            });

            return newSession.data;
        } catch (err) {
            setError('Erro ao registrar sessão');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { registerSession, loading, error };
};