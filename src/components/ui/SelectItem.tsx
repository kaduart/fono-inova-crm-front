import React from "react";

interface SelectItemProps {
    value: string;
    children: React.ReactNode;
}

export const SelectItem = ({ value, children }: SelectItemProps) => {
    return <option value={value}>{children}</option>;
};
