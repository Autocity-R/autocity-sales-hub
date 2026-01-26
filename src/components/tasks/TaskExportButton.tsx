import React from 'react';
import { Download, ClipboardList, Package, Wrench, Shield, Truck, Sparkles, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task, TaskCategory } from '@/types/tasks';
import { exportTasksToExcel } from '@/utils/taskExportExcel';
import { useToast } from '@/hooks/use-toast';

interface TaskExportButtonProps {
  tasks: Task[];
}

const exportCategories: { key: TaskCategory | 'all'; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'Alle Taken', icon: FileSpreadsheet },
  { key: 'klaarmaken', label: 'Klaarmaken', icon: ClipboardList },
  { key: 'onderdelen_bestellen', label: 'Onderdelen', icon: Package },
  { key: 'werkplaats', label: 'Werkplaats', icon: Wrench },
  { key: 'schadeherstel', label: 'Schadeherstel', icon: Shield },
  { key: 'transport', label: 'Transport', icon: Truck },
  { key: 'schoonmaak', label: 'Schoonmaak', icon: Sparkles },
];

export const TaskExportButton: React.FC<TaskExportButtonProps> = ({ tasks }) => {
  const { toast } = useToast();

  const handleExport = async (category: TaskCategory | 'all') => {
    try {
      await exportTasksToExcel(tasks, category);
      toast({
        description: 'Werklijst gedownload'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        variant: 'destructive',
        description: 'Fout bij het exporteren'
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default">
          <Download className="h-4 w-4 mr-2" />
          Excel
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
        {exportCategories.map(({ key, label, icon: Icon }, index) => (
          <React.Fragment key={key}>
            {index === 1 && <DropdownMenuSeparator />}
            <DropdownMenuItem 
              onClick={() => handleExport(key)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
