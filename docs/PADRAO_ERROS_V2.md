# 🚨 Padrão de Tratamento de Erros V2

Guia completo para tratamento padronizado de erros no frontend.

## 🎯 Objetivo

- ✅ Mensagens de erro consistentes
- ✅ Sem spam de toasts repetidos
- ✅ Erros críticos aparecem no chat
- ✅ Código blindado (nunca quebra)

---

## 📦 Imports Necessários

```typescript
import { extractErrorMessage, isCriticalError } from '../utils/errorUtils';
import { useChatOptional } from '../contexts/ChatContext';
import toast from 'react-hot-toast';
```

---

## 🚀 Uso Básico (Padrão Recomendado)

### Em Components/Hooks

```typescript
const MeuComponente = () => {
  const chat = useChatOptional();

  const handleAction = async () => {
    try {
      await minhaOperacao();
      toast.success('Sucesso!');
    } catch (error) {
      const msg = extractErrorMessage(error, 'Erro na operação');
      
      // Toast com ID evita spam
      toast.error(msg, { id: msg });
      
      // Só envia pro chat se for crítico
      if (isCriticalError(error)) {
        chat?.addSystemMessage?.(`❌ ${msg}`, 'error');
      }
    }
  };
};
```

---

## 🛡️ Uso Avançado (safeAction)

### Para operações simples

```typescript
import { safeAction } from '../utils/safeAction';

const handleClick = async () => {
  const { data, error, success } = await safeAction(
    () => api.post('/endpoint', dados),
    {
      successMessage: 'Salvo com sucesso!',
      errorMessage: 'Falha ao salvar',
      showToast: true,
      notifyChat: true // só envia se for crítico
    }
  );

  if (success) {
    // continua com data
  }
};
```

### Hook useSafeAction

```typescript
import { useSafeAction } from '../utils/safeAction';

const MeuComponente = () => {
  const { execute, isLoading, error } = useSafeAction();

  const handleSubmit = () => {
    execute(() => salvarDados(dados), {
      successMessage: 'Salvo!',
      throwOnError: false
    });
  };

  return (
    <button disabled={isLoading} onClick={handleSubmit}>
      {isLoading ? 'Salvando...' : 'Salvar'}
    </button>
  );
};
```

---

## 🧪 Categorias de Erro

| Função | Uso |
|--------|-----|
| `isConflictError(error)` | Já existe, já foi completado, etc |
| `isValidationError(error)` | Campos inválidos, formatos |
| `isNotFoundError(error)` | Não encontrado |
| `isCriticalError(error)` | Deve aparecer no chat |
| `isNetworkError(error)` | Problemas de conexão |

---

## 📋 Checklist de Implementação

- [ ] Usar `extractErrorMessage()` em todos os catch
- [ ] Toast com `{ id: msg }` para evitar spam
- [ ] Verificar `isCriticalError()` antes de enviar pro chat
- [ ] Usar `useChatOptional()` (não quebra se não houver contexto)
- [ ] Mensagens padrão descritivas

---

## ❌ Anti-padrões (Evitar)

```typescript
// ❌ NÃO FAÇA ISSO
.catch(error => {
  toast.error(error.response.data.message); // Pode quebrar
});

// ❌ NÃO FAÇA ISSO
.catch(error => {
  toast.error('Erro'); // Muito genérico
  chat?.addSystemMessage('Erro'); // Sem filtro
});

// ❌ NÃO FAÇA ISSO (spam)
.catch(error => {
  toast.error(error.message);
  toast.error(error.message); // Repetido!
});
```

```typescript
// ✅ FAÇA ASSIM
.catch(error => {
  const msg = extractErrorMessage(error, 'Erro ao salvar');
  toast.error(msg, { id: msg }); // Sem spam
  
  if (isCriticalError(error)) {
    chat?.addSystemMessage?.(`❌ ${msg}`, 'error');
  }
});
```

---

## 🔧 Evolução Futura

### Códigos de erro do backend

Quando o backend retornar:

```json
{
  "code": "APPOINTMENT_ALREADY_COMPLETED",
  "message": "Esta sessão já foi completada"
}
```

Você pode usar:

```typescript
import { extractErrorCode } from '../utils/errorUtils';

const code = extractErrorCode(error);

if (code === 'APPOINTMENT_ALREADY_COMPLETED') {
  // Ação específica
}
```

---

## 📊 Debug

Habilitar logs:

```typescript
// No console do browser
localStorage.setItem('debug_errors', 'true');
```

Isso mostra:
- Código do erro
- Mensagem extraída
- Se foi enviado pro chat
- Por que foi filtrado

---

## 💡 Dicas

1. **Sempre use fallback**: `extractErrorMessage(error, 'Fallback')`
2. **Toast ID é crucial**: Evita spam de retry automático
3. **Chat é opcional**: Não quebra sem contexto
4. **Erros críticos**: Conflitos, regras de negócio, falhas graves
5. **Network errors**: Timeout, offline, conexão perdida

---

## 🏆 Exemplo Completo

```typescript
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { extractErrorMessage, isCriticalError, isNetworkError } from '../utils/errorUtils';
import { useChatOptional } from '../contexts/ChatContext';
import { useAppointmentsContext } from '../contexts/AppointmentsContext';

export const useAppointmentActions = () => {
  const { completeAppointment } = useAppointmentsContext();
  const chat = useChatOptional();

  const complete = useCallback(async (id: string) => {
    try {
      await completeAppointment(id);
      toast.success('Agendamento concluído!');
    } catch (error) {
      const msg = extractErrorMessage(error, 'Erro ao concluir');
      
      // Network error = mensagem diferente
      if (isNetworkError(error)) {
        toast.error('Problema de conexão. Tente novamente.', { id: 'network' });
        return;
      }
      
      // Erro normal
      toast.error(msg, { id: msg });
      
      // Só chat se for crítico
      if (isCriticalError(error)) {
        chat?.addSystemMessage?.(`❌ ${msg}`, 'error');
      }
      
      throw error;
    }
  }, [completeAppointment, chat]);

  return { complete };
};
```

---

**Última atualização**: 2025
**Versão**: 2.0
