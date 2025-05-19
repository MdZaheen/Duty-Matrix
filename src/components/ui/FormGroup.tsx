import React from 'react';

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'column';
  spacing?: 'tight' | 'normal' | 'loose';
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className = '',
  direction = 'column',
  spacing = 'normal',
}) => {
  const directionClass = direction === 'row' ? 'flex flex-row' : 'flex flex-col';
  
  const spacingClasses = {
    tight: direction === 'row' ? 'gap-2' : 'gap-2',
    normal: direction === 'row' ? 'gap-4' : 'gap-4',
    loose: direction === 'row' ? 'gap-6' : 'gap-6',
  };
  
  return (
    <div className={`${directionClass} ${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
};

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      {title && <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>}
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  );
};

interface FormLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({
  htmlFor,
  children,
  className = '',
  required = false,
}) => {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
};

interface FormErrorProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({
  id,
  children,
  className = '',
}) => {
  return (
    <p id={id} className={`mt-1 text-sm text-red-600 ${className}`}>
      {children}
    </p>
  );
};

interface FormHintProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormHint: React.FC<FormHintProps> = ({
  id,
  children,
  className = '',
}) => {
  return (
    <p id={id} className={`mt-1 text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  );
}; 