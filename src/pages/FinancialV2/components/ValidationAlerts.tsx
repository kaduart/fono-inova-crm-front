import { AlertCircle, AlertTriangle, Lightbulb, XCircle } from 'lucide-react';
import { FinancialV2Validation } from '../hooks/useFinancialV2';

interface ValidationAlertsProps {
    blockingErrors?: FinancialV2Validation[];
    warnings?: FinancialV2Validation[];
}

export const ValidationAlerts = ({ blockingErrors, warnings }: ValidationAlertsProps) => {
    const hasErrors = blockingErrors && blockingErrors.length > 0;
    const hasWarnings = warnings && warnings.length > 0;
    
    if (!hasErrors && !hasWarnings) return null;
    
    return (
        <div className="space-y-3">
            {/* Erros Bloqueantes */}
            {hasErrors && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-900">Erros Críticos Detectados</h3>
                    </div>
                    <div className="space-y-2">
                        {blockingErrors!.map((error, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-red-100">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-red-900">{error.message}</p>
                                        {error.details && (
                                            <pre className="text-xs text-red-700 mt-2 bg-red-50 p-2 rounded overflow-auto">
                                                {JSON.stringify(error.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Warnings */}
            {hasWarnings && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <h3 className="font-semibold text-amber-900">Alertas de Atenção</h3>
                    </div>
                    <div className="space-y-2">
                        {warnings!.map((warning, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-amber-100">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-amber-900">{warning.message}</p>
                                        <p className="text-xs text-amber-700 mt-1">Código: {warning.code}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente para insights (sugestões positivas)
interface InsightsProps {
    kpis: {
        packageExecutionRate: number;
        operationalRisk: number;
        defaultRate: number;
        cashEfficiency: number;
        operationalRiskStatus: string;
        defaultRateStatus: string;
        cashEfficiencyStatus: string;
    } | null;
}

export const Insights = ({ kpis }: InsightsProps) => {
    if (!kpis) return null;
    
    const insights = [];
    
    if (kpis.packageExecutionRate > 80) {
        insights.push({
            icon: <Lightbulb className="w-4 h-4 text-emerald-600" />,
            title: 'Pacotes bem utilizados',
            message: `${kpis.packageExecutionRate.toFixed(1)}% das sessões contratadas já foram realizadas.`,
            color: 'emerald',
        });
    }
    
    if (kpis.cashEfficiency > 90) {
        insights.push({
            icon: <Lightbulb className="w-4 h-4 text-blue-600" />,
            title: 'Eficiência de caixa excelente',
            message: `${kpis.cashEfficiency.toFixed(1)}% da produção já foi recebida.`,
            color: 'blue',
        });
    }
    
    if (insights.length === 0) return null;
    
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Insights</h3>
            </div>
            <div className="space-y-2">
                {insights.map((insight, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-start gap-2">
                            {insight.icon}
                            <div>
                                <p className="font-medium text-blue-900">{insight.title}</p>
                                <p className="text-sm text-blue-700">{insight.message}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
