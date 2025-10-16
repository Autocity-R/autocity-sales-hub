import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "default" | "wide" | "full";
}

export const ResponsiveContainer = ({ 
  children, 
  className = "",
  maxWidth = "default" 
}: ResponsiveContainerProps) => {
  const maxWidthClasses = {
    default: "max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px]",
    wide: "max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px]",
    full: "max-w-full"
  };

  return (
    <div className={cn(
      "w-full mx-auto",
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
};
