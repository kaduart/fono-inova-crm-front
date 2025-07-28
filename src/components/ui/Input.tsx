import React, { useState, forwardRef } from 'react';
import InputMask from 'react-input-mask';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  mask?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, mask, className = '', value, onChange, ...props }, ref) => {
    const inputClassName = `mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ease-in-out ${className}`;

    // Se estiver usando value/onChange, o componente é controlado,
    // então vamos passar os props para o InputMask e o input corretamente.

    if (mask) {
      return (
        <div className="flex flex-col">
          {label && (
            <label htmlFor={id} className="font-medium text-gray-700">
              {label}
            </label>
          )}
          <InputMask
            mask={mask}
            value={value}
            onChange={onChange}
            id={id}
            inputRef={ref as React.Ref<HTMLInputElement>}
            className={inputClassName}
            {...props}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        {label && (
          <label htmlFor={id} className="font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          value={value}
          onChange={onChange}
          className={inputClassName}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
