import React, { useState, useCallback } from 'react';

interface PatientSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const PatientSearch: React.FC<PatientSearchProps> = ({
    value,
    onChange,
    placeholder = "Buscar paciente..."
}) => {
    const [localValue, setLocalValue] = useState(value);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onChange(localValue);
    }, [localValue, onChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    }, []);

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="relative">
                <input
                    type="text"
                    value={localValue}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
                {localValue && (
                    <button
                        type="button"
                        onClick={() => {
                            setLocalValue('');
                            onChange('');
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </form>
    );
};

export default PatientSearch;
