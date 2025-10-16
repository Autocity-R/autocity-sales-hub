
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
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between mb-6 lg:mb-8", className)}>
      <div>
        <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold tracking-tight flex items-center gap-3">
          {Icon && <Icon className="h-7 w-7 lg:h-9 lg:w-9 xl:h-11 xl:w-11" />}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-lg lg:text-xl xl:text-2xl">{description}</p>
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
