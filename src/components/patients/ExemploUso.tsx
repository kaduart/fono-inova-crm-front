// Exemplo de como usar o PatientTable com busca na API V2 (Event-Driven)

import { useState, useCallback, useEffect } from 'react';
import PatientTable from './PatientTable';
import patientService from '../../services/patientService';
import { mapPatientListResponseDTO, PatientDTO } from '../../dtos/patient.response.dto';

export default function PatientDashboard() {
  const [patients, setPatients] = useState<PatientDTO[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allPatients, setAllPatients] = useState<PatientDTO[]>([]); // Cache inicial

  // 🚀 V2: Busca inicial (primeira vez) via Event-Driven API
  useEffect(() => {
    patientService.list({ limit: 50 })
      .then((result) => {
        const dtos = mapPatientListResponseDTO(result.patients);
        setPatients(dtos);
        setAllPatients(dtos);
      })
      .catch((error) => {
        console.error('❌ Erro ao buscar pacientes:', error);
      });
  }, []);

  // 🚀 V2: Função de busca via Event-Driven API
  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      // Se termo vazio, volta para lista inicial
      setPatients(allPatients);
      return;
    }

    setIsSearching(true);
    
    try {
      const result = await patientService.list({ 
        search: term, 
        limit: 100 
      });
      setPatients(mapPatientListResponseDTO(result.patients));
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
