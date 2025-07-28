import React, { ForwardedRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const Textarea = React.forwardRef((
    { label, ...props }: TextareaProps,
    ref: ForwardedRef<HTMLTextAreaElement>
) => {
    return (
        <div className="space-y-1">
            {label && <label className="block text-sm font-semibold">{label}</label>}
            <textarea
                ref={ref}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
                {...props}
            />
        </div>
    );
});