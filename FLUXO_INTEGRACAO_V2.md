# 🔄 Fluxo de Integração V2 - Documentação Completa

## 📊 Diagrama do Fluxo Frontend → Backend

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO CREATE PACKAGE V2                            │
└─────────────────────────────────────────────────────────────────────────────┘

[USUÁRIO]
    ↓ Preenche formulário
[TherapyPackageFormModal.tsx]
    ↓ Monta payload com campos do form
    ↓ type: 'therapy' (valor do select)
    ↓ selectedSlots: [...] (horários selecionados)
    ↓ paymentType: 'full' | 'per-session'
    ↓ ...outros campos
    
[packageService.createPackage()]
    ↓ RECEBE payload
    ↓ 🔥 MAPEAMENTO V2:
        - type: 'therapy' → type: 'package'
        - paymentType: 'per-session' → model: 'per_session'
        - paymentType: 'full' → model: 'prepaid'
        - selectedSlots → schedule
    ↓ REMOVE campos legado (sanitize)
    ↓ ENVIA para /v2/packages
    
[Backend V2]
    ↓ Valida payload
    ↓ Cria Package
    ↓ Cria Appointments + Sessions
    ↓ Retorna DTO V2
    
[packageService]
    ↓ Recebe DTO
    ↓ Retorna para o Modal
    
[TherapyPackageFormModal]
    ↓ Extrai packageId
    ↓ Chama onSubmit() → Atualiza UI pai
```

---

## 🎯 Hooks de Atualização - O que Falta Implementar

### 1. Atualização da Lista de Pacotes (Query Invalidation)

```typescript
// No componente PAI (que lista os pacotes)
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const handlePackageCreated = (newPackageId?: string) => {
  // 🚨 INVALIDA O CACHE - Força recarregar a lista
  queryClient.invalidateQueries({ queryKey: ['packages'] });
  queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'packages'] });
  
  // Opcional: Adicionar o novo pacote no cache diretamente (otimista)
  if (newPackageId) {
    toast.success(`Pacote criado: ${newPackageId}`);
  }
  
  // Fecha modal
  setShowModal(false);
};
```

### 2. Hook usePackages Otimizado

```typescript
// hooks/usePackages.ts
import { useQuery } from '@tanstack/react-query';
import { packageService } from '@/services/packageService';

export const usePackages = (patientId: string) => {
  return useQuery({
    queryKey: ['packages', patientId],
    queryFn: () => packageService.listPackages({ patientId }),
    // 🔄 Configurações importantes:
    staleTime: 1000 * 30, // 30s - Dados ficam " frescos" por 30s
    refetchOnWindowFocus: true, // Recarrega quando volta para a aba
    refetchOnMount: 'always', // Sempre recarrega ao montar
  });
};
```

### 3. Atualização Otimista (Melhor UX)

```typescript
// No Modal, após criar com sucesso:
const handleSuccess = (newPackage: any) => {
  // Adiciona no cache IMEDIATAMENTE (antes do server responder)
  queryClient.setQueryData(['packages', patientId], (old: any) => {
    return {
      ...old,
      data: [newPackage, ...(old?.data || [])]
    };
  });
};
```

---

## 🐛 Problemas Comuns & Soluções

### ❌ Problema 1: "Criei mas não aparece na lista"
**Causa:** Cache do React Query não foi invalidado
**Solução:**
```typescript
// Depois de createPackage:
queryClient.invalidateQueries({ queryKey: ['packages'] });
```

### ❌ Problema 2: "Dá erro de feriado mas não mostra qual"
**Causa:** Backend retorna erro mas frontend não trata
**Solução:**
```typescript
try {
  await packageService.createPackage(data);
} catch (error: any) {
  if (error.response?.data?.errorCode === 'HOLIDAY_BLOCKED') {
    toast.error(error.response.data.message);
    // Destacar o campo de data no formulário
  }
}
```

### ❌ Problema 3: "F5 resolve o problema"
**Causa:** Cache desatado ou estado local não sincronizado
**Solução:** Implementar invalidação correta + refetch automático

---

## 🔥 Código Pronto para Implementar

### Hook useCreatePackage V2 (completo)

```typescript
// hooks/useCreatePackageV2.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { packageService } from '@/services/packageService';
import { toast } from 'sonner';

export const useCreatePackageV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: packageService.createPackage,
    
    onSuccess: (data, variables) => {
      // 🎉 Sucesso! Invalida caches
      const patientId = variables.patientId;
      
      queryClient.invalidateQueries({ 
        queryKey: ['packages', patientId] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['appointments'] 
      });
      
      toast.success('Pacote criado com sucesso!');
      
      return data;
    },
    
    onError: (error: any) => {
      const code = error.response?.data?.errorCode;
      const message = error.response?.data?.message;
      
      switch (code) {
        case 'HOLIDAY_BLOCKED':
          toast.error(`❌ ${message}`);
          break;
        case 'SCHEDULE_CONFLICT':
          toast.error('❌ Horário já ocupado. Escolha outro.');
          break;
        case 'INVALID_TYPE':
          toast.error('❌ Erro de integração. Contate o suporte.');
          console.error('Payload inválido:', error.config?.data);
          break;
        default:
          toast.error(message || 'Erro ao criar pacote');
      }
    }
  });
};
```

### Componente Modal Atualizado

```typescript
// TherapyPackageFormModal.tsx
const { mutate: createPackage, isPending } = useCreatePackageV2();

const handleSubmit = async (formData: any) => {
  const payload = {
    type: packageType, // 'therapy' | 'convenio' | 'liminar'
    patientId: patient._id,
    doctorId: formData.doctorId,
    specialty: formData.sessionType,
    sessionType: formData.sessionType,
    totalSessions: formData.totalSessions,
    sessionValue: formData.sessionValue,
    paymentType: formData.paymentType, // 'full' | 'per-session'
    selectedSlots: generatedSlots, // Será convertido para schedule
    durationMonths: formData.durationMonths,
    sessionsPerWeek: formData.sessionsPerWeek,
    payments: payments,
  };
  
  createPackage(payload, {
    onSuccess: (data) => {
      const packageId = data?.data?.packageId;
      onSubmit(packageId); // Callback para pai
      onClose();
    }
  });
};
```

---

## ✅ Checklist de Implementação

- [ ] Instalar React Query DevTools (para debugar cache)
- [ ] Criar hook useCreatePackageV2 com mutation
- [ ] Criar hook usePackages com query
- [ ] Atualizar Modal para usar mutation
- [ ] Adicionar tratamento de erro por código
- [ ] Testar: criar → ver lista atualizar automaticamente
- [ ] Testar: erro de feriado → mostrar mensagem clara
- [ ] Remover F5 como "solução"

---

## 🛠️ Ferramentas de Debug

### React Query DevTools
```bash
npm install @tanstack/react-query-devtools
```

```typescript
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### Log de Cache
```typescript
// Ver o estado atual do cache
console.log(queryClient.getQueryData(['packages', patientId]));
```

---

## 🎯 Próximo Passo Recomendado

1. **Implementar useCreatePackageV2** (mutation)
2. **Conectar no Modal** 
3. **Testar sem F5** - A lista deve atualizar sozinha

Quer que eu implemente isso nos arquivos? 💀
