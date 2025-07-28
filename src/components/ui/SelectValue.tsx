// ui/SelectValue.tsx
import { useContext } from 'react';
import { SelectContext } from './Select-new';

interface SelectValueProps {
    placeholder: string;
}

export const SelectValue = ({ placeholder }: SelectValueProps) => {
    const context = useContext(SelectContext);

    if (!context) throw new Error('SelectValue must be used within Select');

    return (
        <span className={!context.value ? 'text-muted-foreground' : ''}>
            {context.value || placeholder}
        </span>
    );
};