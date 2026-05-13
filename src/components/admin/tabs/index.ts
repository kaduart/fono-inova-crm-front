/**
 * Admin Tabs - Lazy Loading Components
 * 
 * Cada aba carrega seus próprios dados apenas quando ativada.
 * Use estes componentes no AdminDashboard para lazy loading.
 */

export { DashboardTab } from './DashboardTab';
// FinancialTab: código morto — FinancialDashboard é usado diretamente no AdminDashboard e AppRoutes
export { CalendarTab } from './CalendarTab';
export { AnalyticsTab } from './AnalyticsTab';
export { PatientsTab } from './PatientsTab';

// Re-exporta como default para lazy loading com React.lazy
export { default } from './DashboardTab';
