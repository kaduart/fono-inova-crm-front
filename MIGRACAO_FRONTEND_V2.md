# 🚀 Guia de Migração - Frontend Patients V2

> Migração gradual do fluxo atual para CQRS + Event-Driven

---

## 📋 Resumo

| Aspecto | Antes (V1) | Depois (V2) |
|---------|------------|-------------|
| **Listagem** | `fetchAll()` - 300-500ms | `list()` - 10-50ms |
| **Criação** | Síncrona, trava UI | Async, UI otimista |
| **Cache** | Manual (cacheManager) | React Query (automático) |
| **Search** | Sem debounce | Com debounce |
| **UX** | Loading pesado | Instantâneo + confirmação |

---

## 🔄 Migração Gradual (Passo a Passo)

### PASSO 1: Ativar Feature Flag (5 min)

```env
# .env
VITE_USE_V2_PATIENT=true
```

O `patientServiceHybrid` detecta automaticamente e usa V2.

---

### PASSO 2: Substituir Listagem (15 min)

**Antes:**
```tsx
// PatientTable.tsx (código atual)
import { usePatients } from '../../hooks/usePatients';

const { patients, loading, fetchPatients } = usePatients();
```

**Depois:**
```tsx
// PatientTable.tsx
import { usePatientList } from '../../hooks/usePatientV2';

const { patients, isLoading, meta } = usePatientList({ limit: 50 });

// Mostra performance
{meta?.duration && <span>{meta.duration}</span>}
```

---

### PASSO 3: Substituir Formulário (20 min)

**Antes:**
```tsx
// addPatient.tsx
const handleSubmit = async (data) => {
  setLoading(true);
  await patientService.create(data); // trava aqui
  setLoading(false);
  toast.success('Criado!');
};
```

**Depois:**
```tsx
// PatientFormV2.tsx
import { useCreatePatient } from '../../hooks/usePatientV2';

const { createPatientAsync, isCreating, creatingPatient } = useCreatePatient({
  onSuccess: (patient) => {
    toast.success(`${patient.fullName} criado!`);
  }
});

const handleSubmit = async (data) => {
  // Retorna imediatamente (UI otimista)
  await createPatientAsync(data);
};

// Mostra paciente sendo criado
{creatingPatient && (
  <div>Criando {creatingPatient.fullName}...</div>
)}
```

---

### PASSO 4: Adicionar Search com Debounce (10 min)

**Antes:**
```tsx
const [search, setSearch] = useState('');

// Busca em toda mudança (sem debounce)
useEffect(() => {
  patientService.search(search);
}, [search]);
```

**Depois:**
```tsx
import { usePatientSearch } from '../../hooks/usePatientV2';

const { searchTerm, setSearch, results, isSearching } = usePatientSearch(300);

<input 
  value={searchTerm}
  onChange={(e) => setSearch(e.target.value)}
/>
```

---

## 🧩 Componentes Prontos

### 1. PatientFormV2
```tsx
import { PatientFormV2 } from './components/patients/PatientFormV2';

<PatientFormV2 
  onSuccess={(patient) => {
    console.log('Criado:', patient);
    closeModal();
  }}
/>
```

### 2. PatientTableV2
```tsx
import { PatientTableV2 } from './components/patients/PatientTableV2';

<PatientTableV2 
  onEdit={(patient) => openEditModal(patient)}
  onView={(patient) => navigate(`/patients/${patient._id}`)}
/>
```

---

## 🔧 Hooks Disponíveis

| Hook | Uso | Retorna |
|------|-----|---------|
| `usePatientList` | Listagem paginada | patients, pagination, meta |
| `usePatient` | Detalhe por ID | patient, isLoading |
| `usePatientSearch` | Busca com debounce | results, isSearching |
| `useCreatePatient` | Criar (UI otimista) | createPatient, isCreating, creatingPatient |
| `useUpdatePatient` | Atualizar | updatePatient, isUpdating |
| `useDeletePatient` | Deletar (UI otimista) | deletePatient, isDeleting |
| `usePatientsV2` | Tudo junto (compat) | Todos os estados |

---

## 🎯 Exemplo Completo: AdminDashboard

```tsx
// AdminDashboard.tsx
import { PatientTableV2 } from '../patients/PatientTableV2';
import { PatientFormV2 } from '../patients/PatientFormV2';
import { useState } from 'react';

export const AdminDashboard = () => {
  const [showForm, setShowForm] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        + Novo Paciente
      </button>
      
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <PatientFormV2 
            onSuccess={() => {
              setShowForm(false);
              // Cache já invalidado automaticamente!
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}
      
      <PatientTableV2 
        onEdit={(patient) => openEditModal(patient)}
      />
    </div>
  );
};
```

---

## ⚠️ Pontos de Atenção

### 1. Paciente recém-criado pode não aparecer imediatamente

**Solução:** UI Otimista já resolve isso (mostra antes de confirmar)

### 2. Dados desatualizados (stale)

**Solução:** Hook já detecta e marca como "Atualizando..."

### 3. Erro de rede durante polling

**Solução:** Hook tenta novamente automaticamente

---

## 🐛 Debug

```tsx
// Verificar consistência de um paciente
const debug = await patientServiceV2.debugCheck(patientId);
console.log(debug.diff); // mostra diferenças

// Corrigir view inconsistente
await patientServiceV2.debugFix(patientId);
```

---

## ✅ Checklist de Migração

- [ ] Feature flag ativada
- [ ] Listagem usando `usePatientList`
- [ ] Formulário usando `useCreatePatient`
- [ ] Search com `usePatientSearch`
- [ ] Testado criação de paciente
- [ ] Testado busca
- [ ] Testado edição
- [ ] Testado deleção
- [ ] Performance < 100ms na listagem

---

## 🚀 Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Tempo de listagem | 300-500ms | 10-50ms |
| Percepção de criação | 1-2s travado | Instantâneo |
| Busca | Lenta | Rápida com debounce |
| Cache | Manual | Automático |

---

**Pronto para produção!** 🎉
