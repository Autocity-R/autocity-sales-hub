import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportPeriod } from '@/types/reports';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

interface B2CPeriodSelectorProps {
  selectedPeriod: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

// Genereer laatste 24 maanden als opties
const generateMonthOptions = () => {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    const label = format(date, 'MMMM yyyy', { locale: nl });
    months.push({
      value: format(date, 'yyyy-MM'),
      label,
      period: {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        type: 'month' as const,
        label
      }
    });
  }
  
  return months;
};

const monthOptions = generateMonthOptions();

const getCurrentMonthPeriod = (): ReportPeriod => {
  const now = new Date();
  return {
    startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    type: 'month',
    label: format(now, 'MMMM yyyy', { locale: nl })
  };
};

export const B2CPeriodSelector: React.FC<B2CPeriodSelectorProps> = ({
  selectedPeriod,
  onChange
}) => {
  const currentMonthValue = format(new Date(), 'yyyy-MM');
  const selectedValue = format(new Date(selectedPeriod.startDate), 'yyyy-MM');
  const isCurrentMonth = selectedValue === currentMonthValue;

  const handleMonthChange = (value: string) => {
    const option = monthOptions.find(m => m.value === value);
    if (option) {
      onChange(option.period);
    }
  };

  const handleCurrentMonthClick = () => {
    onChange(getCurrentMonthPeriod());
  };

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Button
        variant={isCurrentMonth ? "default" : "outline"}
        size="sm"
        onClick={handleCurrentMonthClick}
        className="h-8"
      >
        Huidige maand
      </Button>
      <Select value={selectedValue} onValueChange={handleMonthChange}>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="Selecteer maand" />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="capitalize">{option.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export { getCurrentMonthPeriod };
