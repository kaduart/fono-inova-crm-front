import React, { useEffect, useState } from 'react';

type InputCurrencyProps = {
    name: string;
    value: number;
    label?: string;
    onChange: (e: { target: { name: string; value: number; type: string } }) => void;
    disabled?: boolean;
    className?: string;
};

export const InputCurrency = ({ name, value, label, onChange, disabled, className }: InputCurrencyProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (!isFocused) {
            // Fora do foco → mostra formatado
            const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
            setDisplayValue(
                new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(safeValue)
            );
        } else {
            // Em foco → mostra cru (sem R$)
            setDisplayValue(value ? value.toString().replace('.', ',') : '');
        }
    }, [value, isFocused]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const numericValue = parseFloat(rawValue) / 100 || 0;

        setDisplayValue(e.target.value);
        onChange({
            target: { name, value: numericValue, type: 'number' }
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
                value={displayValue}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                className={`mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out ${className}`}
            />
        </div>
    );
};

export default InputCurrency;
