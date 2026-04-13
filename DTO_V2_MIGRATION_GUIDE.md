# 🚀 Guia de Migração DTO V2 - Frontend

## 📋 Resumo da Mudança

O backend V2 usa **DTO padronizado** para todas as respostas. O frontend precisa ajustar como consome os dados.

---

## 🔄 Antes (V1) vs Depois (V2)

### ❌ V1 (Legado)
```typescript
// Resposta direta
const response = await API.post('/appointments', data);
const appointment = response.data; // { _id, status, patient, ... }

// Erro
const error = response.data.error; // string ou objeto variável
```

### ✅ V2 (Novo Padrão)
```typescript
// Resposta encapsulada em DTO
const response = await API.post('/v2/appointments', data);
const result = response.data; // { success, data, meta }

// Dados reais estão em result.data
const appointment = result.data; // { appointmentId, status, ... }

// Erro padronizado
const error = result.error; // { code, message, details }
```

---

## 📊 Estrutura do DTO V2

### Sucesso (2xx)
```typescript
interface DtoSuccess<T> {
  success: true;
  data: T;                    // Payload real
  meta: {
    version: "v2";
    correlationId: string;
    timestamp: string;
    message?: string;
  }
}
```

### Erro (4xx/5xx)
```typescript
interface DtoError {
  success: false;
  error: {
    code: string;             // Código técnico ex: "CONFLICT_STATE"
    message: string;          // Mensagem legível
    details?: any;            // Dados adicionais
  };
  meta: {
    version: "v2";
    timestamp: string;
  }
}
```

---

## 🛠️ Helpers Recomendados

### 1. Extrair Dados Seguro
```typescript
// utils/dtoHelper.ts

export function extractData<T>(response: any): T {
  const dto = response.data;
  
  // Se já for V1 (não tem wrapper), retorna direto
  if (!dto || typeof dto.success !== 'boolean') {
    return dto as T;
  }
  
  // V2: extrai de dto.data
  if (dto.success) {
    return dto.data as T;
  }
  
  throw new Error(dto.error?.message || 'Erro desconhecido');
}

export function extractError(response: any): { code: string; message: string } {
  const dto = response.data;
  
  if (dto?.success === false) {
    return {
      code: dto.error?.code || 'UNKNOWN',
      message: dto.error?.message || 'Erro desconhecido'
    };
  }
  
  return { code: 'UNKNOWN', message: 'Erro desconhecido' };
}

export function isV2Dto(response: any): boolean {
  return response?.data && typeof response.data.success === 'boolean';
}
```

### 2. Hook/Service Pattern
```typescript
// services/appointmentService.ts - EXEMPLO ATUALIZADO

async function handleV2Response<T>(promise: Promise<any>): Promise<T> {
  const response = await promise;
  
  // Verifica se é DTO V2
  if (isV2Dto(response)) {
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Erro na operação');
    }
    return response.data.data as T;
  }
  
  // Fallback V1
  return response.data as T;
}

// Uso
export const appointmentService = {
  create: async (data: CreateParams) => {
    return handleV2Response<Appointment>(
      API.post('/v2/appointments', data)
    );
  },
  
  complete: async (id: string, data?: CompleteData) => {
    return handleV2Response<Appointment>(
      API.patch(`/v2/appointments/${id}/complete`, data)
    );
  }
};
```

---

## 🎯 Checklist de Migração

### Services a Atualizar
- [ ] `appointmentService.ts` - ✅ Já tem flags V2
- [ ] `patientService.ts` - ⚠️ Verificar
- [ ] `paymentService.ts` - ⚠️ Verificar
- [ ] `packageService.ts` - ⚠️ Verificar

### Hooks a Atualizar
- [ ] `useAppointments.ts` - Verificar consumo de `response.data.data`
- [ ] `usePatients.ts` - Verificar
- [ ] `usePayments.ts` - Verificar

### Componentes a Testar
- [ ] Create Appointment → validar `appointmentId` em `data.data`
- [ ] Complete Session → validar `status` em `data.data`
- [ ] Cancel Appointment → validar erro `code` e `message`

---

## ⚠️ Erros Comuns

### ❌ Errado
```typescript
const response = await API.post('/v2/appointments', data);
const id = response.data._id; // ❌ undefined! DTO não tem _id no root
```

### ✅ Certo
```typescript
const response = await API.post('/v2/appointments', data);
const id = response.data.data?.appointmentId; // ✅ correto
```

### ❌ Errado
```typescript
const response = await API.patch(`/v2/appointments/${id}/complete`);
if (response.data.operationalStatus === 'completed') { // ❌
  // ...
}
```

### ✅ Certo
```typescript
const response = await API.patch(`/v2/appointments/${id}/complete`);
if (response.data.data?.operationalStatus === 'completed') { // ✅
  // ...
}
```

---

## 🧪 Testes de Validação

```typescript
// test/dtoV2.test.ts

describe('DTO V2 Integration', () => {
  it('should extract data from V2 response', () => {
    const mockResponse = {
      data: {
        success: true,
        data: { appointmentId: '123', status: 'scheduled' },
        meta: { version: 'v2' }
      }
    };
    
    const data = extractData(mockResponse);
    expect(data.appointmentId).toBe('123');
  });
  
  it('should handle V2 error', () => {
    const mockResponse = {
      data: {
        success: false,
        error: { code: 'CONFLICT', message: 'Conflito detectado' },
        meta: { version: 'v2' }
      }
    };
    
    const error = extractError(mockResponse);
    expect(error.code).toBe('CONFLICT');
  });
});
```

---

## 🔍 Debugging

### Log de Respostas
```typescript
// Adicione temporariamente nos services
console.log('[DTO V2] Response:', {
  url: endpoint,
  success: response.data.success,
  hasData: !!response.data.data,
  hasError: !!response.data.error,
  meta: response.data.meta
});
```

### Verificar no DevTools
```javascript
// Console do navegador
fetch('/api/v2/appointments', {...})
  .then(r => r.json())
  .then(dto => console.log('DTO:', dto));
// Deve mostrar: { success, data, meta }
```

---

## 📞 Suporte

Se encontrar inconsistências:
1. Verifique se o endpoint é `/v2/*`
2. Confirme `meta.version === "v2"` na resposta
3. Reporte ao time backend se faltar campos em `data`
