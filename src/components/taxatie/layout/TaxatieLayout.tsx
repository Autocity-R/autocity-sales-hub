import React from 'react';
import { cn } from '@/lib/utils';

interface TaxatieLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface ColumnProps {
  children: React.ReactNode;
  className?: string;
}

export const TaxatieLayout = ({ children, className }: TaxatieLayoutProps) => {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-6', className)}>
      {children}
    </div>
  );
};

export const TaxatieColumnA = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
};

export const TaxatieColumnB = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
};

export const TaxatieColumnC = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
};

export const TaxatieFooter = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('lg:col-span-3', className)}>
      {children}
    </div>
  );
};
