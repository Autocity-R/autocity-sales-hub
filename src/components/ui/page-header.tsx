
import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  icon: Icon,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0" />}
          <span className="truncate">{title}</span>
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
        )}
      </div>
      {children && (
        <div className="mt-3 md:mt-0 flex items-center space-x-2 w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
