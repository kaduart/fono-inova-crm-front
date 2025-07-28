// ui/SelectTrigger.tsx
import { ChevronDown } from 'lucide-react';
import React, { useContext } from 'react';
import { SelectContext } from './Select-new';

export const SelectTrigger = ({ children }: { children: React.ReactNode }) => {
    const context = useContext(SelectContext);

    if (!context) throw new Error('SelectTrigger must be used within Select');

    return (
        <div
            className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-background"
            onClick={() => context.setOpen(!context.open)}
        >
            {children}
            <ChevronDown className="w-4 h-4 opacity-50" />
        </div>
    );
};