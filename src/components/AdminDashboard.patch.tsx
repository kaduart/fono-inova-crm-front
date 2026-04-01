// ============================================================================
// PATCH para AdminDashboard.tsx - Integração Patients V2
// ============================================================================
// 
// INSTRUÇÕES:
// 1. Copie as seções marcadas abaixo
// 2. Cole no seu AdminDashboard.tsx nos locais indicados
// 3. Ative a feature flag: VITE_USE_V2_PATIENT=true
//
// ============================================================================

// ============================================================================
// SEÇÃO 1: IMPORTS (adicionar no topo, junto com outros imports)
// ============================================================================

// Adicione após os imports existentes:
import { useAdminDashboardPatientsV2, PatientV2Config } from './AdminDashboardV2';

// ============================================================================
// SEÇÃO 2: SUBSTITUIÇÃO DO handleSavePatient (procure a função existente)
// ============================================================================

// ❌ SUBSTITUA a função handleSavePatient existente (linha ~300) por:

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

// 🎯 Handler unificado (V1/V2 automático)
const handleSavePatient = useCallback(async (formData: IPatient): Promise<boolean> => {
  // Se V2 habilitado e é criação (não edição), usa fluxo otimista
  if (PatientV2Config.isEnabledForUser() && !formData._id) {
    setIsLoading(true);
    
    try {
      const success = await handleSavePatientV2(formData);
      
      if (success) {
        // 🎉 V2: Modal fecha imediatamente, paciente já aparece na lista
        setIsModalOpen(false);
        setPatientToEdit(undefined);
        
        // Opcional: tracking
        console.log('✅ Patient created with V2 (optimistic UI)');
      }
      
      return success;
      
    } catch (error: any) {
      const msg = error?.message || 'Erro ao criar paciente';
      toast.error(msg);
      return false;
      
    } finally {
      setIsLoading(false);
    }
  }
  
  // 📦 V1 ou Edição: fluxo original síncrono
  return handleSavePatientV2(formData);
  
}, [handleSavePatientV2, setIsLoading, setIsModalOpen, setPatientToEdit]);

// ============================================================================
// SEÇÃO 3: INDICADOR V2 NO MODAL (adicionar dentro do PatientModal)
// ============================================================================

// No JSX onde renderiza o PatientModal (procure por isModalOpen), adicione:

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
    {/* 🆕 V2: Indicador de paciente sendo criado (UI otimista) */}
    {PatientV2Config.isEnabledForUser() && creatingPatient && (
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-pulse">
        <div className="flex items-center gap-2 text-yellow-800">
          <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-medium">Criando paciente...</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          {creatingPatient.fullName}
        </p>
        <p className="text-xs text-yellow-600 mt-1">
          O paciente já aparece na lista. Aguardando confirmação.
        </p>
        {createProgress && (
          <p className="text-xs text-yellow-500 mt-1">
            Status: {createProgress.status}
          </p>
        )}
      </div>
    )}
  </PatientModal>
)}

// ============================================================================
// SEÇÃO 4: BADGE V2 NO HEADER (opcional - para saber qual versão está ativa)
// ============================================================================

// Adicione no header/dashboard para indicar que V2 está ativo:

{PatientV2Config.isEnabledForUser() && (
  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full ml-2">
    V2
  </span>
)}

// ============================================================================
// SEÇÃO 5: TOGGLE V2 PARA TESTES (opcional - botão para alternar)
// ============================================================================

// Adicione em algum menu de configurações ou debug:

const toggleV2 = () => {
  if (PatientV2Config.isEnabledForUser()) {
    PatientV2Config.disable();
  } else {
    PatientV2Config.enable();
  }
};

// Botão:
<button 
  onClick={toggleV2}
  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
>
  {PatientV2Config.isEnabledForUser() ? 'V2 ON' : 'V2 OFF'}
</button>

// ============================================================================
// FIM DO PATCH
// ============================================================================
