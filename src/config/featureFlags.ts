/**
 * 🎛️ Feature Flags
 *
 * Centraliza flags de funcionalidade do frontend.
 * Todas as flags devem ser lidas de `import.meta.env` e ter fallback seguro.
 */

export const FEATURE_FLAGS = {
  /**
   * Sprint 3.10 — Financial Source of Truth
   * Quando true, o frontend consome /api/v2/financial/* em vez dos endpoints legados.
   */
  USE_FINANCIAL_V2: import.meta.env.VITE_USE_FINANCIAL_V2 === "true" || true,

  /**
   * Sprint 3.10 — Projeção & Cenários
   * Quando false, oculta a aba que depende de /financial/dashboard/projection-daily
   * e FinancialDailySnapshot. Usada para validar se a secretaria usa essa funcionalidade.
   * Padrão: true (visível). Defina VITE_SHOW_PROJECTION_TAB=false para ocultar.
   */
  SHOW_PROJECTION_TAB: import.meta.env.VITE_SHOW_PROJECTION_TAB !== "false",
} as const;
