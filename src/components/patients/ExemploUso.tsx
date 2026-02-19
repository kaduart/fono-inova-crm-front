// Exemplo de como usar o PatientTable com busca na API

import { useState, useCallback, useEffect } from 'react';
import PatientTable from './PatientTable';

interface Patient {
  _id: string;
  fullName?: string;
  phone?: string;
  cpf?: string;
  // ... outros campos
}

export default function PatientDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allPatients, setAllPatients] = useState<Patient[]>([]); // Cache inicial

  // Busca inicial (primeira vez)
  useEffect(() => {
    fetch('/api/patients?limit=50', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(r => r.json())
      .then(data => {
        setPatients(data);
        setAllPatients(data);
      });
  }, []);

  // Função de busca
  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      // Se termo vazio, volta para lista inicial
      setPatients(allPatients);
      return;
    }

    setIsSearching(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/patients?search=${encodeURIComponent(term)}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  }, [allPatients]);

  return (
    <PatientTable 
      patients={patients}
      onSearch={handleSearch}
      isSearching={isSearching}
      onEditPatient={(p) => console.log('Editar:', p)}
    />
  );
}
