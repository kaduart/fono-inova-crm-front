# Migração ABA AGENDA (CalendarTab) - V2 Event-Driven

## Resumo da Migração

Data: 2026-04-05

## ✅ Status: MIGRADO

A ABA AGENDA já está 100% migrada para V2 Event-Driven.

---

## Arquivos Analisados

### 1. CalendarTab.tsx
**Status:** ✅ Já estava migrado

- Usa `useAppointmentsContext` → que chama `appointmentService.listV2()`
- Flag `USE_V2_LIST: true` ativada
- Não faz chamadas diretas à API legada
- Proteção contra duplicação já implementada no contexto

### 2. appointmentService.ts
**Status:** ✅ Já estava migrado

Todas as flags V2 estão ativadas:
- `USE_V2_CREATE: true`
- `USE_V2_UPDATE: true`
- `USE_V2_DELETE: true`
- `USE_V2_CONFIRM: true`
- `USE_V2_RESCHEDULE: true`
- `USE_V2_COMPLETE: true`
- `USE_V2_CANCEL: true`
- `USE_V2_GET_BY_ID: true`
- `USE_V2_LIST: true`

Endpoints V2 disponíveis:
- `POST /v2/appointments` - Criar (async)
- `GET /v2/appointments` - Listar
- `GET /v2/appointments/:id` - Buscar
- `PUT /v2/appointments/:id` - Atualizar
- `DELETE /v2/appointments/:id` - Deletar
- `PATCH /v2/appointments/:id/confirm` - Confirmar
- `PATCH /v2/appointments/:id/reschedule` - Reagendar
- `PATCH /v2/appointments/:id/complete` - Completar (async)
- `PATCH /v2/appointments/:id/cancel` - Cancelar (async)
- `GET /v2/appointments/:id/status` - Status para polling

### 3. AppointmentsContext.tsx
**Status:** ✅ Já estava migrado

Features implementadas:
- ✅ Cache por período (evita refetch do mesmo range)
- ✅ Proteção contra chamadas simultâneas (`isFetchingRef`)
- ✅ Proteção contra race conditions (`requestIdRef`)
- ✅ Socket listeners para atualizações em tempo real
- ✅ Polling automático para operações async (202 Accepted)

### 4. useAppointments.ts
**Status:** ✅ Já estava migrado

- Usa `appointmentService.listV2()` quando `USE_V2_LIST` está true
- Implementa polling para operações async
- Cache local com duração de 2 minutos

### 5. bookingService.ts
**Status:** ✅ Já estava migrado

- Totalmente V2 Event-Driven
- Usa `POST /v2/appointments`
- Implementa polling automático

---

## Arquivos Criados/Atualizados Nesta Migração

### Criados

1. **`/front/src/services/calendarServiceV2.ts`**
   - Versão V2 do serviço de calendário
   - Cache em memória para feriados
   - Fallback para V1 se necessário
   - Tipagem completa

2. **`/front/src/hooks/useCalendarV2.ts`**
   - Hook otimizado para calendário
   - Loading states e error handling
   - Métodos utilitários (`isHoliday`, `isTimeBlocked`)

### Atualizados

3. **`/front/src/components/calendar/EnhancedCalendar.tsx`**
   - Atualizado import de `calendarService` para `calendarServiceV2`
   - Atualizadas chamadas: `getHolidays`, `holidaysToMap`, `isHoliday`

4. **`/front/src/components/admin/tabs/CalendarTab.tsx`**
   - Removido import não utilizado do `appointmentService`

---

## APIs Migradas

| Operação | API Legada | API V2 | Status |
|----------|------------|--------|--------|
| Listar Agendamentos | `GET /appointments` | `GET /v2/appointments` | ✅ MIGRADO |
| Criar Agendamento | `POST /appointments` | `POST /v2/appointments` | ✅ MIGRADO |
| Buscar Agendamento | `GET /appointments/:id` | `GET /v2/appointments/:id` | ✅ MIGRADO |
| Atualizar Agendamento | `PUT /appointments/:id` | `PUT /v2/appointments/:id` | ✅ MIGRADO |
| Deletar Agendamento | `DELETE /appointments/:id` | `DELETE /v2/appointments/:id` | ✅ MIGRADO |
| Confirmar Agendamento | `PATCH /appointments/:id/confirm` | `PATCH /v2/appointments/:id/confirm` | ✅ MIGRADO |
| Reagendar | `PATCH /appointments/:id/reschedule` | `PATCH /v2/appointments/:id/reschedule` | ✅ MIGRADO |
| Completar Agendamento | `PATCH /appointments/:id/complete` | `PATCH /v2/appointments/:id/complete` | ✅ MIGRADO |
| Cancelar Agendamento | `PATCH /appointments/:id/cancel` | `PATCH /v2/appointments/:id/cancel` | ✅ MIGRADO |
| Status (Polling) | - | `GET /v2/appointments/:id/status` | ✅ NOVO |
| Buscar Feriados | `GET /calendar/holidays` | `GET /v2/calendar/holidays` | ✅ MIGRADO |

---

## Otimizações Implementadas

### 1. Cache de Período
```typescript
// AppointmentsContext.tsx
if (currentPeriodRef.current?.startDate === effectiveFilters.startDate &&
    currentPeriodRef.current?.endDate === effectiveFilters.endDate &&
    appointmentsRef.current.length > 0) {
  return; // Não busca de novo
}
```

### 2. Proteção Contra Chamadas Simultâneas
```typescript
// AppointmentsContext.tsx
if (isFetchingRef.current) {
  console.log('[AppointmentsContext] Já está carregando, ignorando chamada');
  return;
}
```

### 3. Proteção Contra Race Conditions
```typescript
// AppointmentsContext.tsx
const currentRequest = ++requestIdRef.current;
// ... após fetch
if (currentRequest !== requestIdRef.current) {
  console.log('[AppointmentsContext] Resposta ignorada (request antigo)');
  return;
}
```

### 4. Cache de Feriados
```typescript
// calendarServiceV2.ts
const holidaysCache: Map<number, Holiday[]> = new Map();
// Retorna do cache se disponível
if (holidaysCache.has(targetYear)) {
  return holidaysCache.get(targetYear)!;
}
```

### 5. Debounce de Socket Events
```typescript
// AppointmentsContext.tsx
const debouncedRefresh = useCallback(() => {
  if (refreshTimeoutRef.current) {
    clearTimeout(refreshTimeoutRef.current);
  }
  refreshTimeoutRef.current = setTimeout(() => {
    refreshAppointments();
  }, 1000);
}, [refreshAppointments]);
```

---

## Componentes que Usam a Agenda V2

1. **CalendarTab.tsx** - Tab principal (via AppointmentsContext)
2. **ScheduleAppointmentModal.tsx** - Modal de agendamento (via callbacks)
3. **appointmentDetailModal.tsx** - Modal de detalhes (via callbacks)
4. **EnhancedCalendar.tsx** - Componente de calendário (visualização)

---

## Fluxo de Dados V2

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│  CalendarTab → EnhancedCalendar → ScheduleAppointmentModal       │
│              → appointmentDetailModal                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPOINTMENTS CONTEXT                        │
│  - Cache por período                                             │
│  - Proteção contra duplicação                                    │
│  - Socket events                                                 │
│  - Polling automático                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT SERVICE V2                        │
│  - listV2()                                                      │
│  - create() → POST /v2/appointments                              │
│  - update() → PUT /v2/appointments/:id                           │
│  - delete() → DELETE /v2/appointments/:id                        │
│  - complete() → PATCH /v2/appointments/:id/complete              │
│  - cancel() → PATCH /v2/appointments/:id/cancel                  │
│  - pollStatus() → GET /v2/appointments/:id/status                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT-DRIVEN BACKEND                         │
│  - Command Handler (async)                                       │
│  - Event Store                                                   │
│  - Read Model Projection                                         │
│  - Socket emission                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testes Recomendados

1. **Listagem de Agendamentos**
   - Trocar de mês no calendário
   - Verificar se não há chamadas duplicadas no network tab

2. **Criar Agendamento**
   - Criar novo agendamento
   - Verificar polling de status
   - Confirmar atualização automática no calendário

3. **Completar Agendamento**
   - Completar um agendamento
   - Verificar se status atualiza automaticamente

4. **Cancelar Agendamento**
   - Cancelar um agendamento
   - Verificar atualização no calendário

5. **Feriados**
   - Verificar se feriados carregam corretamente
   - Verificar cache (não deve fazer nova requisição ao trocar de mês)

---

## Remoções Futuras (Cleanup)

Após período de estabilidade, remover:

1. Flags de controle no `appointmentService.ts`:
   - `USE_V2_CREATE`, `USE_V2_UPDATE`, etc.

2. Métodos legados no `appointmentService.ts`:
   - Métodos que não têm prefixo V2

3. `calendarService.ts` (legado) - quando V2 estiver 100% validado

---

## Conclusão

A ABA AGENDA está totalmente migrada para V2 Event-Driven. Todas as operações usam os endpoints V2 com:
- Cache inteligente
- Polling automático para operações async
- Atualizações em tempo real via sockets
- Proteção contra chamadas duplicadas

**NÃO** foi encontrada chamada duplicada atualmente - a proteção implementada no `AppointmentsContext` impede isso.
