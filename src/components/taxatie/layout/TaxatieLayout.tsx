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
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        Voertuiggegevens
      </div>
      {children}
    </div>
  );
};

export const TaxatieColumnB = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-orange-500" />
        Marktdata
      </div>
      {children}
    </div>
  );
};

export const TaxatieColumnC = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        AI Advies
      </div>
      {children}
    </div>
  );
};

export const TaxatieFooter = ({ children, className }: ColumnProps) => {
  return (
    <div className={cn('lg:col-span-3 mt-2', className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-purple-500" />
        Interne Vergelijking & Acties
      </div>
      {children}
    </div>
  );
};
