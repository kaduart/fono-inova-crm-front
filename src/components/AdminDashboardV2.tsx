// src/components/AdminDashboardV2.tsx
/**
 * AdminDashboard com Patients V2 integrado
 * 
 * Features:
 * - Feature flag por componente (sem risco)
 * - Mantém fluxo atual (modais, contextos, callbacks)
 * - UI Otimista para criação de pacientes
 * - Fallback automático para V1
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { IPatient } from '../utils/types/types';

// 🎯 Feature Flag - controla migração gradual
const USE_V2_PATIENT = import.meta.env.VITE_USE_V2_PATIENT === 'true' || false;

// 🆕 Imports V2 (só carrega se flag ativada)
import { useCreatePatient as useCreatePatientV2, useUpdatePatient as useUpdatePatientV2 } from '../hooks/usePatientV2';

// 📋 Interface compatível com AdminDashboard original
interface AdminDashboardV2Props {
  // Props do PatientModal
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  patientToEdit?: IPatient;
  setPatientToEdit: (patient: IPatient | undefined) => void;
  
  // Callbacks do contexto original
  onCreatePatient: (data: IPatient) => Promise<boolean>;
  onUpdatePatient: (id: string, data: Partial<IPatient>) => Promise<boolean>;
  onRefreshPatients: () => void;
  
  // Estado de loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// ============================================
// HOOK: Patient Operations (V1/V2 híbrido)
// ============================================

export function usePatientOperationsV2(props: AdminDashboardV2Props) {
  const { 
    onCreatePatient, 
    onUpdatePatient, 
    onRefreshPatients,
    setIsLoading,
    setIsModalOpen 
  } = props;
  
  // 🆕 Hooks V2 (só ativos se USE_V2_PATIENT = true)
  const createV2 = useCreatePatientV2({
    onSuccess: (patient) => {
      toast.success(`Paciente ${patient.fullName} criado!`);
      setIsModalOpen(false);
      // Não precisa chamar refresh - cache já atualizado via UI otimista
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  const updateV2 = useUpdatePatientV2({
    onSuccess: (patient) => {
      toast.success(`Paciente ${patient.fullName} atualizado!`);
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });
  
  // 🎯 Handler de Save (decide V1 vs V2 automaticamente)
  const handleSavePatient = useCallback(async (formData: IPatient): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      if (USE_V2_PATIENT) {
        // 🆕 Fluxo V2 (async com UI otimista)
        if (formData._id) {
          // Update
          await updateV2.updatePatientAsync({
            id: formData._id,
            data: {
              ...formData,
              dateOfBirth: new Date(formData.dateOfBirth).toISOString()
            }
          });
        } else {
          // Create (UI otimista - retorna imediatamente)
          await createV2.createPatientAsync({
            ...formData,
            dateOfBirth: new Date(formData.dateOfBirth).toISOString()
          });
          
          // Modal fecha imediatamente (paciente já aparece na lista)
          setIsModalOpen(false);
        }
        
        return true;
        
      } else {
        // 📦 Fluxo V1 (síncrono, legado)
        const success = formData._id
          ? await onUpdatePatient(formData._id, {
              ...formData,
              dateOfBirth: new Date(formData.dateOfBirth).toISOString()
            })
          : await onCreatePatient({
              ...formData,
              dateOfBirth: new Date(formData.dateOfBirth).toISOString()
            });
        
        if (success) {
          onRefreshPatients();
        }
        
        return success;
      }
      
    } catch (error: any) {
      const msg = error?.message || error?.response?.data?.message || 'Erro ao salvar paciente';
      toast.error(msg);
      return false;
      
    } finally {
      setIsLoading(false);
    }
  }, [
    USE_V2_PATIENT, 
    createV2.createPatientAsync, 
    updateV2.updatePatientAsync,
    onCreatePatient, 
    onUpdatePatient, 
    onRefreshPatients,
    setIsLoading,
    setIsModalOpen
  ]);
  
  // 🎯 Estados de loading unificados
  const isCreating = USE_V2_PATIENT ? createV2.isCreating : false;
  const isUpdating = USE_V2_PATIENT ? updateV2.isUpdating : false;
  const isProcessing = isCreating || isUpdating;
  
  // 🎯 Paciente sendo criado (para UI otimista)
  const creatingPatient = USE_V2_PATIENT ? createV2.creatingPatient : null;
  const createProgress = USE_V2_PATIENT ? createV2.progress : null;
  
  return {
    handleSavePatient,
    isProcessing,
    creatingPatient,
    createProgress,
    // Expor estados V2 para debug
    isV2Enabled: USE_V2_PATIENT
  };
}

// ============================================
// COMPONENTE: PatientModal V2 Wrapper
// ============================================

import { PatientModal } from './patients/PatientModal';
import { PatientFormV2 } from './patients/PatientFormV2';

interface PatientModalV2WrapperProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: IPatient;
  onSave: (data: IPatient) => Promise<boolean>;
  isLoading: boolean;
  // Props V2 extras
  creatingPatient?: IPatient | null;
  createProgress?: { status: string; attempt: number } | null;
  isV2Enabled?: boolean;
}

export const PatientModalV2Wrapper: React.FC<PatientModalV2WrapperProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  isLoading,
  creatingPatient,
  createProgress,
  isV2Enabled
}) => {
  // Se V2 desabilitado, usa modal original
  if (!isV2Enabled) {
    return (
      <PatientModal
        isOpen={isOpen}
        onClose={onClose}
        patient={patient}
        onSave={onSave}
        isLoading={isLoading}
      />
    );
  }
  
  // 🆕 V2: Usa novo form com UI otimista
  return (
    <PatientModal
      isOpen={isOpen}
      onClose={onClose}
      patient={patient}
      onSave={onSave}
      isLoading={isLoading}
    >
      {/* Slot para renderizar form customizado */}
      <PatientFormV2
        patient={patient}
        onSuccess={(savedPatient) => {
          onSave(savedPatient as IPatient);
        }}
        onCancel={onClose}
      />
      
      {/* Indicadores V2 */}
      {creatingPatient && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">Criando paciente...</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            {creatingPatient.fullName}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            O paciente já aparece na lista. Aguardando confirmação do servidor.
          </p>
          {createProgress && (
            <p className="text-xs text-yellow-500 mt-1">
              Status: {createProgress.status} (tentativa {createProgress.attempt})
            </p>
          )}
        </div>
      )}
    </PatientModal>
  );
};

// ============================================
// HOOK: Integração completa para AdminDashboard
// ============================================

export function useAdminDashboardPatientsV2(
  contextPatients: {
    patients: IPatient[];
    createPatient: (data: IPatient) => Promise<any>;
    updatePatient: (id: string, data: Partial<IPatient>) => Promise<any>;
    refreshPatients: () => void;
  }
) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<IPatient | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  
  // 🎯 Handler de save (V1/V2 híbrido)
  const handleSavePatient = useCallback(async (formData: IPatient): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      if (USE_V2_PATIENT && !formData._id) {
        // 🆕 CREATE V2: UI otimista, não espera resposta
        const patientService = await import('../services/patientService.v2');
        
        const result = await patientService.default.create(formData, {
          skipPolling: true, // Retorna imediatamente
          onSuccess: (patient) => {
            toast.success(`${patient.fullName} criado!`);
          }
        });
        
        // Fecha modal imediatamente
        setIsModalOpen(false);
        setPatientToEdit(undefined);
        
        // Atualiza contexto V1 (para compatibilidade)
        contextPatients.refreshPatients();
        
        return true;
        
      } else if (USE_V2_PATIENT && formData._id) {
        // 🆕 UPDATE V2
        const patientService = await import('../services/patientService.v2');
        
        await patientService.default.update(formData._id, formData, {
          skipPolling: true
        });
        
        toast.success('Paciente atualizado!');
        setIsModalOpen(false);
        setPatientToEdit(undefined);
        
        contextPatients.refreshPatients();
        
        return true;
        
      } else {
        // 📦 V1 LEGADO
        const success = formData._id
          ? await contextPatients.updatePatient(formData._id, formData)
          : await contextPatients.createPatient(formData);
        
        if (success) {
          contextPatients.refreshPatients();
        }
        
        return success;
      }
      
    } catch (error: any) {
      const msg = error?.message || 'Erro ao salvar paciente';
      toast.error(msg);
      return false;
      
    } finally {
      setIsLoading(false);
    }
  }, [contextPatients]);
  
  // 🎯 Handlers de modal
  const handleAddPatient = useCallback(() => {
    setPatientToEdit(undefined);
    setIsModalOpen(true);
  }, []);
  
  const handleEditPatient = useCallback((patient: IPatient) => {
    setPatientToEdit(patient);
    setIsModalOpen(true);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setPatientToEdit(undefined);
  }, []);
  
  return {
    // Estados
    isModalOpen,
    patientToEdit,
    isLoading,
    isV2Enabled: USE_V2_PATIENT,
    
    // Handlers
    handleSavePatient,
    handleAddPatient,
    handleEditPatient,
    handleCloseModal,
    setIsModalOpen,
    setPatientToEdit
  };
}

// ============================================
// EXPORT: Configuração para feature flag
// ============================================

export const PatientV2Config = {
  isEnabled: USE_V2_PATIENT,
  
  // Helpers para ativar/desativar em runtime (para testes A/B)
  enable: () => {
    localStorage.setItem('useV2Patient', 'true');
    window.location.reload();
  },
  
  disable: () => {
    localStorage.setItem('useV2Patient', 'false');
    window.location.reload();
  },
  
  // Verifica se usuário atual tem V2 (pode ser por role, %, etc)
  isEnabledForUser: () => {
    const userOverride = localStorage.getItem('useV2Patient');
    if (userOverride !== null) return userOverride === 'true';
    return USE_V2_PATIENT;
  }
};

export default useAdminDashboardPatientsV2;
