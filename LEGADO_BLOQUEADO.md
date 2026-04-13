# 🚫 LEGADO BLOQUEADO - FOCO TOTAL V2

> Data: 2026-04-12
> Status: MIGRAÇÃO FORÇADA PARA V2

---

## 🎯 Regra de Ouro

**NENHUMA CHAMADA LEGADO DEVE FUNCIONAR**

Se algo quebrar, o erro deve aparecer no console para ser corrigido com V2.

---

## 📁 Serviços Legados BLOQUEADOS

### ❌ therapyPackageApi.ts
```typescript
// 🚫 BLOQUEADO - Use packageService.ts
// Todas as funções retornam erro
```

### ❌ useTherapyPackage.ts
```typescript
// 🚫 BLOQUEADO - Use usePackagesV2.ts
// Todas as mutations retornam erro
```

### ❌ endpoints legados
```
/packages           → Use /v2/packages
/therapy-packages   → Use /v2/packages  
/api/packages       → Use /api/v2/packages
```

---

## 🧪 Teste de Validação

Para garantir que não há vazamentos:

```bash
# Buscar por qualquer referência legada
grep -r "therapy-packages" src/ --include="*.ts" --include="*.tsx"
grep -r "/packages[^/]" src/ --include="*.ts" --include="*.tsx"
grep -r "useTherapyPackage" src/ --include="*.ts" --include="*.tsx"
```

Se encontrar algo = BUG. Corrigir imediatamente.

---

## ✅ Lista de Permissões V2

| ✅ Permitido | Endpoint |
|-------------|----------|
| ✅ | `/api/v2/packages` |
| ✅ | `/api/v2/packages/:id` |
| ✅ | `/api/v2/packages/:id/sessions` |
| ✅ | `/api/v2/packages/:id/payments` |
| ✅ | `/api/v2/appointments` |
| ✅ | `/api/v2/appointments/:id/complete` |
| ✅ | `/api/v2/appointments/:id/cancel` |
| ✅ | `/api/v2/patients` |
| ✅ | `/api/v2/balance` |

---

## 🚨 Mensagem de Erro Padrão

Se algo legado for chamado:

```
🚫 ERRO: Chamada legado detectada!
Arquivo: [nome do arquivo]
Função: [nome da função]
Ação: Migre para V2 imediatamente.
Documentação: /docs/API_CONTRACT_V2.md
```

---

## 💀 FOCO TOTAL

```
┌─────────────────────────────────────────┐
│  SE NÃO É V2, NÃO EXISTE               │
│  SE QUEBRA, CORRIGE COM V2             │
│  NENHUM FALLBACK PARA LEGADO           │
└─────────────────────────────────────────┘
```

**Não negociamos com legado.**
