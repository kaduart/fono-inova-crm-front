# 🚀 Dashboard Financeiro V2

## Visão Geral

Dashboard financeiro de nível empresarial com separação clara entre:
- 💰 **Caixa** (dinheiro recebido)
- 📊 **Competência** (produção realizada)
- 📦 **Obrigação** (receita diferida)

## 🎯 Diferenciais

### 1. Arquitetura Financeira Correta
```
Particular → Caixa imediato
Convênio → Produção + Caixa (parcial)
Pacote → Caixa antecipado + Produção gradual
```

### 2. Semântica Contábil
```js
contractedRevenue    // Valor contratado
recognizedRevenue    // Receita reconhecida (produzida)
deferredRevenue      // Receita diferida (obrigação)
```

### 3. KPIs Estratégicos
```
Risco Operacional = deferredSessions / capacidade
Taxa de Execução  = recognized / contracted
Eficiência Caixa  = received / production
```

## 📁 Estrutura

```
FinancialV2/
├── FinancialV2Dashboard.tsx    # Componente principal
├── hooks/
│   └── useFinancialV2.ts       # Data fetching + KPIs
├── components/
│   ├── MetricCard.tsx          # Cards de métricas
│   ├── ValidationAlerts.tsx    # Alertas de consistência
│   └── FinancialCharts.tsx     # Gráficos Recharts
└── index.ts                    # Exports
```

## 🔌 Uso

### Dashboard Completo
```tsx
import { FinancialV2Dashboard } from './pages/FinancialV2';

<Route path="/admin/financial-v2" element={<FinancialV2Dashboard />} />
```

### Componentes Individuais
```tsx
import { MetricCard, useFinancialV2 } from './pages/FinancialV2';

const { data } = useFinancialV2({ period: 'month' });
```

## 📊 Layout

```
[ Header com período seletor ]

[ Alertas de Validação (se houver) ]

[ TOP CARDS ]
💰 Caixa Recebido | 📊 Produção | 🏥 A Receber | 📦 Receita Diferida

[ KPIs CRÍTICOS ]
Risco Operacional | Taxa Execução | Eficiência Caixa

[ GRÁFICOS ]
Composição Produção | Pacotes | Convênio

[ DETALHAMENTO ]
Caixa por Tipo | Convênio Detalhado | Conta Corrente

[ PACOTES - SEÇÃO ESPECIAL ]
Contratado | Recebido | Produzido | Obrigação
```

## 🔗 API

```
GET /api/v2/totals?period=month

Response:
{
  totals: {
    totalReceived,
    totalProduction,
    particularReceived,
    insurance: { pendingBilling, billed, received },
    packageCredit: {
      contractedRevenue,
      cashReceived,
      deferredRevenue,
      recognizedRevenue,
      ...
    },
    patientBalance: { totalDebt, totalCredit, ... }
  },
  blockingErrors?,  // Erros críticos
  warnings?         // Alertas
}
```

## 🎨 Tecnologias

- React + TypeScript
- Tailwind CSS
- Recharts (gráficos)
- React Query (cache)
- Lucide React (ícones)

## 📱 Responsivo

- Desktop: 4 colunas
- Tablet: 2 colunas
- Mobile: 1 coluna

## ⚠️ Alertas Automáticos

O dashboard mostra automaticamente:
- Erros de consistência matemática
- Alertas de caixa vs pacote
- Risco operacional (capacidade)

## 🎯 Próximos Passos

1. Adicionar ao menu principal
2. Comparativo período anterior
3. Exportar PDF
4. Alertas em tempo real (WebSocket)

---

**Status**: ✅ Produção
**Nível**: Enterprise
