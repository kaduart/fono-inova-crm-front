# 🗺️ Mapeamento Integração Frontend V2

> Só mapeamento, sem mudanças de código

---

## 🎯 Endpoints Críticos (O que o front usa hoje)

### 1. Appointments (Complete/Cancel)

| Arquivo | Endpoint Atual | Deve Usar V2 |
|---------|---------------|--------------|
| `useAppointments.ts` | `/appointments/*` | ✅ `/v2/appointments/*` |
| `AppointmentsContext.tsx` | `/appointments/*` | ✅ `/v2/appointments/*` |
| `CalendarView.tsx` | `/appointments/*` | ✅ `/v2/appointments/*` |
| `create.tsx` | `/appointments/*` | ✅ `/v2/appointments/*` |

**Verificar:**
- [ ] Se há chamada a `/appointments/${id}/complete`
- [ ] Se há chamada a `/appointments/${id}/cancel`
- [ ] Se URL inclui `/v2/` ou não

---

### 2. Packages (Pacotes)

| Arquivo | Endpoint Atual | Deve Usar V2 |
|---------|---------------|--------------|
| `packageService.ts` | `/packages/*` | ✅ `/v2/packages/*` |
| `TherapyPackageFormModal.tsx` | `/packages/*` | ✅ `/v2/packages/*` |
| `ScheduleWithPackageFlow.tsx` | `/packages/*` | ✅ `/v2/packages/*` |

**Verificar:**
- [ ] POST `/packages` → deve ser `/v2/packages`
- [ ] GET `/packages/${id}` → deve ser `/v2/packages/${id}`

---

### 3. Payments (Financeiro)

| Arquivo | Endpoint Atual | Deve Usar V2 |
|---------|---------------|--------------|
| `paymentService.ts` | `/payments/*` | ✅ `/v2/payments/*` |
| `FinancialDashboard.tsx` | `/payments/*` | ✅ `/v2/payments/*` |
| `PaymentPage.tsx` | `/payments/*` | ✅ `/v2/payments/*` |

---

## 🔍 Checklist de Verificação (Não alterar, só anotar)

### Appointments
```bash
# Procurar no código:
grep -r "fetch.*appointments" src/ --include="*.ts" --include="*.tsx"
grep -r "axios.*appointments" src/ --include="*.ts" --include="*.tsx"
grep -r "\/appointments\/" src/ --include="*.ts" --include="*.tsx"
```

**Resultado esperado:**
- ❌ Nenhum `/appointments/` (sem v2)
- ✅ Todos `/v2/appointments/`

### Packages
```bash
grep -r "fetch.*packages" src/ --include="*.ts" --include="*.tsx"
grep -r "\/packages\/" src/ --include="*.ts" --include="*.tsx" | grep -v "/v2/"
```

**Resultado esperado:**
- ❌ Nenhum `/packages/` (sem v2)  
- ✅ Todos `/v2/packages/`

---

## 📋 Campos DTO vs Campos Antigos

### Response de Complete (O que backend retorna)
```json
{
  "success": true,
  "data": {
    "appointmentId": "...",
    "clinicalStatus": "completed",
    "operationalStatus": "completed",
    "paymentStatus": "unpaid",
    "balanceAmount": 150,
    "sessionValue": 150,
    "isPaid": false,
    "completedAt": "..."
  },
  "meta": {
    "version": "v2",
    "correlationId": "...",
    "timestamp": "..."
  }
}
```

### O que front DEVE usar
| Campo DTO | Campo Antigo | Status |
|-----------|--------------|--------|
| `data.operationalStatus` | `status` | Verificar |
| `data.clinicalStatus` | `clinicalStatus` | Verificar |
| `data.paymentStatus` | `paymentStatus` | Verificar |
| `data.balanceAmount` | `balance` | ⚠️ MUDOU NOME |
| `data.sessionValue` | `sessionValue` | Igual |
| `data.isPaid` | `isPaid` | Igual |

**⚠️ ATENÇÃO:** `balance` → `balanceAmount` (mudou nome!)

---

## 🎯 Arquivos para Verificar Campo a Campo

### 1. PaymentPage.tsx
```tsx
// Verificar se usa:
const balance = data.balanceAmount;  // ✅ CORRETO (V2)
// ou
const balance = data.balance;        // ❌ ERRADO (V1 legado)
```

### 2. FinancialDashboard.tsx
```tsx
// Verificar se usa:
const paymentStatus = data.paymentStatus;  // ✅ CORRETO
const operationalStatus = data.operationalStatus;  // ✅ CORRETO
```

### 3. TherapyPackageFormModal.tsx
```tsx
// Verificar chamada:
fetch('/v2/packages', {...})  // ✅ CORRETO
// ou
fetch('/packages', {...})     // ❌ ERRADO
```

---

## 🚨 Comandos para Rodar (Só verificar)

```bash
# 1. Verificar endpoints antigos ainda em uso
cd /home/user/projetos/crm/front
grep -r "\/appointments\/" src/ --include="*.ts" --include="*.tsx" | grep -v "/v2/" | grep -v "node_modules"

# 2. Verificar packages sem v2
grep -r "\/packages\/" src/ --include="*.ts" --include="*.tsx" | grep -v "/v2/" | grep -v "node_modules"

# 3. Verificar campo balance antigo
grep -r "\.balance[^A]" src/ --include="*.ts" --include="*.tsx" | grep -v "balanceAmount"
```

---

## 📝 Resumo do que precisa ser conferido

| # | Item | Prioridade |
|---|------|------------|
| 1 | Endpoints com `/v2/` | 🔴 Crítico |
| 2 | Campo `balanceAmount` (não `balance`) | 🔴 Crítico |
| 3 | Campo `operationalStatus` | 🟡 Médio |
| 4 | Campo `clinicalStatus` | 🟡 Médio |
| 5 | Campo `paymentStatus` | 🟡 Médio |

---

**Só mapear, não alterar código ainda!** 💀
