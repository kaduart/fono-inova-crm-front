import React from 'react';

export type BillingType = 'particular' | 'convenio' | 'liminar';

type Props = {
    value: BillingType;
    onChange: (value: BillingType) => void;
    /**
     * Exibe "Liminar" como terceira opção clicável. Só deve ser true quando o
     * agendamento tem contrato judicial vinculado — a aba "Finalizar" já fazia
     * isso condicionalmente e o comportamento foi preservado.
     */
    showLiminar?: boolean;
    disabled?: boolean;
    className?: string;
};

/**
 * Seletor compacto de tipo de faturamento, compartilhado entre
 * "Editar Agendamento" e "Finalizar Atendimento".
 *
 * Largura fixa (~224px) em vez de `flex-1`: o seletor não precisa atravessar
 * o modal inteiro, e esticá-lo dava a ele um peso visual maior que o dos
 * campos de valor e método, que são os realmente preenchidos.
 *
 * ⚠️ billingType tem TRÊS estados no domínio (particular | convenio | liminar).
 * Só os dois primeiros são escolhidos à mão — `liminar` é derivado dos dados
 * pelo resolvedor do modal. Por isso, quando o valor é 'liminar' este seletor
 * mostra um rótulo estático em vez de forçar a escolha entre os outros dois:
 * renderizar só os dois botões faria um agendamento judicial parecer
 * "particular" na tela e um clique acidental o reclassificaria.
 */
export default function BillingTypeSelector({
    value,
    onChange,
    showLiminar = false,
    disabled = false,
    className = '',
}: Props) {
    if (value === 'liminar' && !showLiminar) {
        return (
            <div
                className={`inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 ${className}`}
                title="Definido pelo contrato judicial vinculado — não editável aqui"
            >
                <span className="text-xs font-semibold text-purple-700">Liminar</span>
                <span className="text-3xs text-purple-500">(judicial)</span>
            </div>
        );
    }

    const options: { key: BillingType; label: string; active: string }[] = [
        { key: 'particular', label: 'Particular', active: 'bg-green-600 text-white shadow-sm' },
        { key: 'convenio', label: 'Convênio', active: 'bg-blue-600 text-white shadow-sm' },
        ...(showLiminar
            ? [{ key: 'liminar' as BillingType, label: 'Liminar', active: 'bg-purple-600 text-white shadow-sm' }]
            : []),
    ];

    return (
        <div
            className={`inline-flex gap-1 rounded-lg border border-gray-200 bg-white p-1 ${
                showLiminar ? 'w-72' : 'w-56'
            } ${className}`}
        >
            {options.map(opt => (
                <button
                    key={opt.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(opt.key)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        value === opt.key ? opt.active : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}
