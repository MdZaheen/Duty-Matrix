import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  hintClassName?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      fullWidth = true,
      icon,
      leftIcon,
      rightIcon,
      containerClassName = '',
      labelClassName = '',
      inputClassName = '',
      errorClassName = '',
      hintClassName = '',
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    
    // Determine if an icon is present
    const hasLeftIcon = !!leftIcon || !!icon;
    const hasRightIcon = !!rightIcon;
    
    // Set width styles
    const widthStyles = fullWidth ? 'w-full' : '';
    
    // Handle error state
    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
    
    // Icon positioning
    const leftIconPadding = hasLeftIcon ? 'pl-10' : '';
    const rightIconPadding = hasRightIcon ? 'pr-10' : '';
    
    return (
      <div className={`mb-4 ${widthStyles} ${containerClassName}`}>
        {label && (
          <label htmlFor={inputId} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {hasLeftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
              {leftIcon || icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              px-4 py-2 bg-white border border-gray-300 rounded-md 
              shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 
              focus:border-blue-500 block h-10 ${leftIconPadding} ${rightIconPadding}
              ${errorStyles} ${widthStyles} ${inputClassName} ${className}
            `}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          
          {hasRightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p id={`${inputId}-error`} className={`mt-1 text-sm text-red-600 ${errorClassName}`}>
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p id={`${inputId}-hint`} className={`mt-1 text-sm text-gray-500 ${hintClassName}`}>
            {hint}
          </p>
        )}
      </div>
    );
  }
);

// Display name for debugging
Input.displayName = 'Input';

export default Input; 