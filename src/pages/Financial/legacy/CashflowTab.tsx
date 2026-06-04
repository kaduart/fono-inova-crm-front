// ⚠️ DEPRECATED — Este componente foi substituído por UnifiedCashflowTab.tsx
//
// MOTIVO: Semântica financeira desatualizada. Este componente usava cálculos
// próprios de caixa/produção que divergiam do backend unifiedFinancialService.
//
// DATA DE DEPRECATION: 2026-06-04
// SUBSTITUTO: ../UnifiedCashflowTab.tsx
//
// NÃO importe este componente em código novo. NÃO faça modificações.
// Para histórico/backup apenas.

// @ts-nocheck
const CashflowTab = () => {
  throw new Error(
    'CashflowTab foi movido para /legacy e não deve ser usado. ' +
    'Use UnifiedCashflowTab em vez disso.'
  );
};

export default CashflowTab;
