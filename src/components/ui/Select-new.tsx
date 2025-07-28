// ui/Select.tsx
import React, { createContext, useState } from 'react';

interface SelectProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
}

interface SelectContextProps {
    value: string;
    onValueChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}

export const SelectContext = createContext<SelectContextProps | undefined>(undefined);

export const Select = ({ value, onValueChange, children }: SelectProps) => {
    const [open, setOpen] = useState(false);

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative w-full">
                {children}
            </div>
        </SelectContext.Provider>
    );
};