# 🚀 Integração AdminDashboard + Patients V2

> Guia passo a passo para integrar V2 no seu AdminDashboard existente

---

## 📋 Resumo (3 passos)

1. **Importar** hook V2
2. **Substituir** `handleSavePatient`
3. **Adicionar** indicadores no modal

**Tempo estimado:** 10 minutos

---

## 🎯 Passo 1: Import (1 min)

No topo do `AdminDashboard.tsx`, adicione:

```tsx
// Após os imports existentes
import { useAdminDashboardPatientsV2, PatientV2Config } from './AdminDashboardV2';
```

---

## 🎯 Passo 2: Substituir Handler (5 min)

### Encontre a função `handleSavePatient` (aprox. linha 300)

**SUBSTITUA TUDO** por:

```tsx
// 🆕 HOOK V2 (adicione antes do handleSavePatient)
const {
  handleSavePatient: handleSavePatientV2,
  creatingPatient,
  createProgress
} = useAdminDashboardPatientsV2({
  patients,
  createPatient,
  updatePatient,
  refreshPatients
});

// 🎯 HANDLER UNIFICADO (substitui o original)
const handleSavePatient = useCallback(async (formData: IPatient): Promise<boolean> => {
  setIsLoading(true);
  
  try {
    // 🆕 V2: Fluxo otimista para criação
    if (PatientV2Config.isEnabledForUser() && !formData._id) {
      const success = await handleSavePatientV2(formData);
      
      if (success) {
        setIsModalOpen(false);
        setPatientToEdit(undefined);
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
    toast.error(error?.message || 'Erro ao salvar paciente');
    return false;
    
  } finally {
    setIsLoading(false);
  }
}, [handleSavePatientV2, setIsLoading, setIsModalOpen, setPatientToEdit, refreshPatients]);
```

---

## 🎯 Passo 3: Indicadores no Modal (4 min)

### Encontre onde renderiza `<PatientModal />`

**ADICIONE** dentro do modal (como children):

```tsx
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
        <Typography variant="body2" color="warning.main">
          ⟳ Criando paciente...
        </Typography>
        <Typography variant="caption" display="block">
          {creatingPatient.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          O paciente já aparece na lista. Aguardando confirmação.
        </Typography>
      </Box>
    )}
  </PatientModal>
)}
```

---

## ✅ Teste

### 1. Ativar V2
```bash
# .env
VITE_USE_V2_PATIENT=true
```

### 2. Reiniciar dev server
```bash
npm run dev
```

### 3. Testar fluxo
1. Abrir modal "Add Paciente"
2. Preencher dados
3. Clicar "Salvar"
4. ✅ Modal fecha imediatamente
5. ✅ Paciente aparece na lista
6. ✅ Toast confirma criação

---

## 🐛 Debug

### Verificar se V2 está ativo:
```tsx
console.log('V2 enabled:', PatientV2Config.isEnabledForUser());
```

### Forçar V2 para teste (console do browser):
```js
localStorage.setItem('useV2Patient', 'true');
location.reload();
```

### Voltar para V1:
```js
localStorage.setItem('useV2Patient', 'false');
location.reload();
```

---

## 📊 Resultado Esperado

| Antes (V1) | Depois (V2) |
|------------|-------------|
| Modal trava 1-2s | Modal fecha instantâneo |
| Lista atualiza depois | Paciente aparece imediatamente |
| Toast "Criando..." | Toast "Criado!" + confirmação |
| Loading pesado | UI fluida |

---

## 🚀 Rollback (se necessário)

### Opção 1: Desativar flag
```bash
# .env
VITE_USE_V2_PATIENT=false
```

### Opção 2: User override
```js
localStorage.setItem('useV2Patient', 'false');
location.reload();
```

---

**Pronto!** 🎉 Seu AdminDashboard agora tem Patients V2 integrado.
