import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-sm text-left text-gray-800 ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <thead className={`text-xs font-medium uppercase bg-gray-50 text-gray-700 ${className}`}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
};

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  isHeader?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({ 
  children, 
  className = '',
  isHeader = false,
  ...props 
}) => {
  const baseStyles = isHeader 
    ? 'bg-gray-50' 
    : 'bg-white border-b hover:bg-gray-50 transition-colors';
  
  return (
    <tr className={`${baseStyles} ${className}`} {...props}>
      {children}
    </tr>
  );
};

interface TableCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <td className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </td>
  );
};

interface TableHeadCellProps extends React.HTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export const TableHeadCell: React.FC<TableHeadCellProps> = ({ 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <th className={`px-6 py-3 ${className}`} {...props}>
      {children}
    </th>
  );
}; 