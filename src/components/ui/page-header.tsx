
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
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-6", className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="mt-4 md:mt-0 flex items-center space-x-2">
          {children}
        </div>
      )}
    </div>
  );
}
