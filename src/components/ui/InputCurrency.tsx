// InputCurrency.tsx
import React from 'react';

type InputCurrencyProps = {
    name: string;
    value: number;
    label?: string;
    onChange: (e: { target: { name: string; value: number; type: string } }) => void;
    disabled?: boolean;
    className?: string;
};

export const InputCurrency = ({ name, value, label, onChange, disabled, className }: InputCurrencyProps) => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;

    const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(safeValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove todos os caracteres não numéricos
        const rawValue = e.target.value.replace(/\D/g, '');

        // Converte para número dividindo por 100 para considerar centavos
        const numericValue = parseFloat(rawValue) / 100;

        // Simula o evento esperado pelo handleChange
        onChange({
            target: {
                name: name,
                value: numericValue,
                type: "number" // Força o tipo para number
            }
        });
    };

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-gray-600 mb-1">
                    {label}
                </label>
            )}
            <input
                type="text"
                name={name}
                value={formattedValue}
                onChange={handleChange}
                disabled={disabled}
                className={`mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out ${className}`}

            />
        </div>
    );
};

export default InputCurrency;
