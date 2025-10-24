import React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "full" | "7xl" | "none";
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  className,
  maxWidth = "full"
}) => {
  const maxWidthClass = {
    "full": "max-w-full",
    "7xl": "max-w-7xl",
    "none": ""
  }[maxWidth];

  return (
    <div className={cn("w-full", maxWidthClass, "mx-auto", className)}>
      {children}
    </div>
  );
};
