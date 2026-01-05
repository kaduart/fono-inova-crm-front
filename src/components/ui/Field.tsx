// src/components/ui/Field.tsx
import React from "react";

type Props = {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
};

export function Field({ label, required, error, hint, children }: Props) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required ? <span className="text-red-600">*</span> : null}
            </label>

            {children}

            {error ? (
                <p className="text-sm text-red-600">{error}</p>
            ) : hint ? (
                <p className="text-xs text-gray-500">{hint}</p>
            ) : null}
        </div>
    );
}
