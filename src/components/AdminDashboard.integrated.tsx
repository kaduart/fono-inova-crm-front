// ============================================================================
// AdminDashboard.tsx INTEGRADO COM V2
// ============================================================================
// 
// Este arquivo mostra como ficaria o AdminDashboard completo com V2 integrado.
// Você pode copiar as partes relevantes ou usar como referência.
//
// CHANGES:
// 1. Import do hook V2
// 2. Substituição do handleSavePatient
// 3. Adição de indicadores V2 no modal
//
// ============================================================================

import { Box, Paper, Typography, useTheme } from '@mui/material';
import { BarChart3, CalendarPlus } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ... outros imports ...

// 🆕 IMPORT V2 (adicionar no topo)
import { useAdminDashboardPatientsV2, PatientV2Config } from './AdminDashboardV2';

// ... resto dos imports ...

export default function AdminDashboard() {
  // ... estados existentes ...
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<IPatient | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎯 CONTEXTO EXISTENTE (mantido)
  const { patients, totalPatients, refreshPatients, updatePatient, createPatient } = usePatientsContext();
  
  // 🆕 HOOK V2 (novo - integração transparente)
  const {
    handleSavePatient: handleSavePatientV2,
    isV2Enabled,
    creatingPatient,
    createProgress
  } = useAdminDashboardPatientsV2({
    patients,
    createPatient,
    updatePatient,
    refreshPatients
  });
  
  // 🎯 HANDLER DE SAVE (substitui o original)
  const handleSavePatient = useCallback(async (formData: IPatient): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // 🆕 V2: Fluxo otimista para criação
      if (PatientV2Config.isEnabledForUser() && !formData._id) {
        const success = await handleSavePatientV2(formData);
        
        if (success) {
          // Fecha modal imediatamente (paciente já aparece na lista via UI otimista)
          setIsModalOpen(false);
          setPatientToEdit(undefined);
          
          console.log('✅ Patient created with V2 (optimistic UI)');
        }
        
        return success;
      }
      
      // 📦 V1 ou Edição: fluxo original
      const success = await handleSavePatientV2(formData);
      
      if (success) {
        refreshPatients();
        setIsModalOpen(false);
        setPatientToEdit(undefined);
      }
      
      return success;
      
    } catch (error: any) {
      const msg = error?.message || 'Erro ao salvar paciente';
      toast.error(msg);
      return false;
      
    } finally {
      setIsLoading(false);
    }
  }, [handleSavePatientV2, setIsLoading, setIsModalOpen, setPatientToEdit, refreshPatients]);
  
  // ... resto do componente ...
  
  return (
    <div>
      {/* ... header e navegação ... */}
      
      {/* 🎯 PatientModal com indicadores V2 */}
      {isModalOpen && (
        <PatientModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setPatientToEdit(undefined);
          }}
          patient={patientToEdit}
          onSave={handleSavePatient}
          isLoading={isLoading}
        >
          {/* 🆕 V2: Indicador de paciente sendo criado */}
          {PatientV2Config.isEnabledForUser() && creatingPatient && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
              <Typography variant="body2" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span className="animate-spin">⟳</span>
                Criando paciente...
              </Typography>
              <Typography variant="caption" color="warning.dark">
                {creatingPatient.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                O paciente já aparece na lista. Aguardando confirmação.
              </Typography>
              {createProgress && (
                <Typography variant="caption" color="text.secondary">
                  Status: {createProgress.status}
                </Typography>
              )}
            </Box>
          )}
        </PatientModal>
      )}
      
      {/* ... resto do JSX ... */}
      
      {/* 🆕 Badge V2 no header (opcional) */}
      {PatientV2Config.isEnabledForUser() && (
        <Box 
          component="span" 
          sx={{ 
            px: 1, 
            py: 0.5, 
            fontSize: '0.75rem', 
            bgcolor: 'success.main', 
            color: 'white',
            borderRadius: 1,
            ml: 2
          }}
        >
          V2
        </Box>
      )}
    </div>
  );
}
