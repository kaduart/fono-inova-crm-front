// Financeiro em 3 menus pelo tipo de trabalho. Arquivo leve: o header importa sem puxar as telas.
export type FinancialSection = 'caixa' | 'convenios' | 'gestao';
export const SECTION_TABS: Record<FinancialSection, string[]> = {
    caixa: ['caixa-unificado', 'pagamentos'],
    convenios: ['convenios'],
    gestao: ['despesas', 'profissionais', 'nfse', 'dashboard'],
};
export const SECTION_MENU: Record<FinancialSection, string> = { caixa: 'Caixa', convenios: 'Convenios', gestao: 'Financeiro' };
export const sectionOfTab = (tabId: string): FinancialSection =>
    (Object.keys(SECTION_TABS) as FinancialSection[]).find(k => SECTION_TABS[k].includes(tabId)) ?? 'gestao';
// Metas do ano agora mora dentro de Resultados (financialTab=planejamento continua abrindo).
export const MERGED_INTO: Record<string, string> = { planejamento: 'dashboard' };
