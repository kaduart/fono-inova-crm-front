import React, { ForwardedRef } from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    children: React.ReactNode;
}

export const Select = React.forwardRef((
    { children, ...props }: SelectProps,
    ref: ForwardedRef<HTMLSelectElement>
) => (
    <select
        ref={ref}
        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm
        focus:border-blue-500 focus:ring-2 focus:ring-blue-200 
        appearance-none bg-no-repeat pr-10
        bg-[url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iIzY3Mjg4MCIgZD0iTTcgMTBsNSA1IDUtNXoiLz48L3N2Zz4=)] 
        bg-[position:right_0.75rem_center] bg-[length:1.5em] text-gray-500"
        {...props}
    >
        {children}
    </select>
));