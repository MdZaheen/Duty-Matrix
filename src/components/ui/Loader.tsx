import React from 'react';

type LoaderSize = 'sm' | 'md' | 'lg';
type LoaderVariant = 'circle' | 'dots';

interface LoaderProps {
  size?: LoaderSize;
  variant?: LoaderVariant;
  className?: string;
  label?: string;
  fullPage?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  size = 'md',
  variant = 'circle',
  className = '',
  label = 'Loading...',
  fullPage = false,
}) => {
  // Size classes
  const sizeClasses = {
    sm: variant === 'circle' ? 'h-4 w-4' : 'h-3',
    md: variant === 'circle' ? 'h-8 w-8' : 'h-4',
    lg: variant === 'circle' ? 'h-12 w-12' : 'h-5',
  };
  
  // Container styles for full page loading
  const containerClasses = fullPage 
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 z-50' 
    : 'flex items-center justify-center';
  
  // Render spinner/circle loader
  const renderCircleLoader = () => (
    <svg 
      className={`animate-spin text-primary ${sizeClasses[size]} ${className}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
  
  // Render dots loader
  const renderDotsLoader = () => (
    <div className={`flex space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} w-2 bg-primary rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${sizeClasses[size]} w-2 bg-primary rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${sizeClasses[size]} w-2 bg-primary rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
  
  return (
    <div className={containerClasses} role="status">
      <div className="flex flex-col items-center">
        {variant === 'circle' ? renderCircleLoader() : renderDotsLoader()}
        {label && (
          <span className="mt-2 text-sm text-gray-500">{label}</span>
        )}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default Loader; 