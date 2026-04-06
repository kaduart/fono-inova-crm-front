import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'pink';
    size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    orange: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    pink: 'bg-pink-50 border-pink-200 text-pink-900',
};

const iconColors = {
    green: 'text-emerald-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-amber-600',
    red: 'text-red-600',
    pink: 'text-pink-600',
};

export const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    trendValue,
    color = 'blue',
    size = 'md',
}: MetricCardProps) => {
    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };
    
    const valueSizeClasses = {
        sm: 'text-2xl',
        md: 'text-3xl',
        lg: 'text-4xl',
    };
    
    return (
        <div className={`rounded-xl border ${colorClasses[color]} ${sizeClasses[size]} shadow-sm`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium opacity-70 mb-1">{title}</p>
                    <p className={`${valueSizeClasses[size]} font-bold`}>
                        {typeof value === 'number' ? value.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                        }) : value}
                    </p>
                    {subtitle && (
                        <p className="text-sm opacity-60 mt-1">{subtitle}</p>
                    )}
                    {trend && trendValue && (
                        <div className="flex items-center gap-1 mt-2">
                            {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-600" />}
                            {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
                            {trend === 'neutral' && <Minus className="w-4 h-4 text-gray-600" />}
                            <span className={`text-sm ${
                                trend === 'up' ? 'text-emerald-600' :
                                trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                                {trendValue}
                            </span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`${iconColors[color]}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

// Card especial para KPIs com barra de progresso
interface KPICardProps {
    title: string;
    value: number;
    unit?: string;
    max: number;
    status: 'good' | 'warning' | 'critical';
    description: string;
}

export const KPICard = ({ title, value, unit = '%', max, status, description }: KPICardProps) => {
    const percentage = Math.min((value / max) * 100, 100);
    
    const statusColors = {
        good: 'bg-emerald-500',
        warning: 'bg-amber-500',
        critical: 'bg-red-500',
    };
    
    const statusBg = {
        good: 'bg-emerald-50 border-emerald-200',
        warning: 'bg-amber-50 border-amber-200',
        critical: 'bg-red-50 border-red-200',
    };
    
    return (
        <div className={`rounded-xl border ${statusBg[status]} p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-70">{title}</p>
                <span className={`text-2xl font-bold ${
                    status === 'good' ? 'text-emerald-700' :
                    status === 'warning' ? 'text-amber-700' : 'text-red-700'
                }`}>
                    {value.toFixed(1)}{unit}
                </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                    className={`h-2.5 rounded-full ${statusColors[status]} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            
            <p className="text-sm opacity-70">{description}</p>
        </div>
    );
};
