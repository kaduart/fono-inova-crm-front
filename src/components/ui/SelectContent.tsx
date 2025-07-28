// ui/SelectContent.tsx
import React, { useContext } from 'react';
import { SelectContext } from './Select-new';

export const SelectContent = ({ children }: { children: React.ReactNode }) => {
    const context = useContext(SelectContext);

    if (!context) throw new Error('SelectContent must be used within Select');

    return context.open ? (
        <div className="absolute z-50 w-full mt-1 overflow-hidden border rounded-md shadow-md top-full bg-background">
            <div className="p-1">
                {children}
            </div>
        </div>
    ) : null;
};