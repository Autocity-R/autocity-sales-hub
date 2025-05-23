
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Calendar,
  Activity,
  FileText
} from "lucide-react";
import { ReportPeriod } from "@/types/reports";
import { getAvailablePeriods } from "@/services/reportsService";

interface ReportsHeaderProps {
  selectedPeriod: ReportPeriod;
  onPeriodChange: (periodLabel: string) => void;
  onExport: (format: 'excel' | 'csv' | 'pdf') => void;
}

export const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  selectedPeriod,
  onPeriodChange,
  onExport
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            Business Rapportages & Analytics
          </h1>
          <p className="text-blue-100 text-lg">
            Gedetailleerde performance analyse voor {selectedPeriod.label.toLowerCase()}
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-blue-500/20 text-white border-blue-400">
              <Calendar className="w-3 h-3 mr-1" />
              {selectedPeriod.label}
            </Badge>
            <Badge variant="secondary" className="bg-blue-500/20 text-white border-blue-400">
              <Activity className="w-3 h-3 mr-1" />
              Live Data
            </Badge>
          </div>
        </div>
        
        {/* Controls Section */}
        <div className="flex flex-col gap-3">
          <Select value={selectedPeriod.label} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-48 bg-white text-gray-900">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailablePeriods().map((period) => (
                <SelectItem key={period.label} value={period.label}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onExport('excel')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Download className="w-3 h-3 mr-1" />
              Excel
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onExport('csv')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onExport('pdf')}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
