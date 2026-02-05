import { useEffect, useState, useCallback } from 'react';
import { doctorService, Doctor } from '../services/doctorService';

export const useDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await doctorService.getAllDoctors();
      setDoctors(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar médicos');
      console.error('Erro ao buscar médicos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    loading,
    error,
    refetch: fetchDoctors,
    fetchDoctors
  };
};

export default useDoctors;
