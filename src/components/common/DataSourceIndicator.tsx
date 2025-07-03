
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Database, HardDrive, Wifi, WifiOff } from "lucide-react";
import { setUseMockData } from "@/services/inventoryService";
import { useToast } from "@/hooks/use-toast";

interface DataSourceIndicatorProps {
  isUsingMockData?: boolean;
  onDataSourceChange?: (useMock: boolean) => void;
  className?: string;
}

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  isUsingMockData = false,
  onDataSourceChange,
  className = ""
}) => {
  const { toast } = useToast();

  const handleToggleDataSource = () => {
    const newUseMock = !isUsingMockData;
    setUseMockData(newUseMock);
    
    if (onDataSourceChange) {
      onDataSourceChange(newUseMock);
    }

    toast({
      title: "Data Source Changed",
      description: `Now using ${newUseMock ? 'mock' : 'live database'} data`,
      duration: 3000
    });
  };

  return (
    <Card className={`border-l-4 ${isUsingMockData ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'} ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isUsingMockData ? (
              <HardDrive className="h-4 w-4 text-orange-600" />
            ) : (
              <Database className="h-4 w-4 text-green-600" />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Data Source:
                </span>
                <Badge 
                  variant={isUsingMockData ? "destructive" : "default"}
                  className={isUsingMockData ? "bg-orange-500" : "bg-green-500"}
                >
                  {isUsingMockData ? (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Mock Data
                    </>
                  ) : (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      Live Database
                    </>
                  )}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {isUsingMockData 
                  ? "Using sample data for demonstration" 
                  : "Connected to Supabase database"
                }
              </span>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDataSource}
            className="text-xs"
          >
            Switch to {isUsingMockData ? 'Database' : 'Mock'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
