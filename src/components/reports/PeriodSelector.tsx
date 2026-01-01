import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ReportPeriod } from "@/types/reports";

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

type PresetType = 'currentWeek' | 'previousWeek' | 'currentMonth' | 'previousMonth' | 'currentYear' | 'previousYear';

const presets: { key: PresetType; label: string }[] = [
  { key: 'currentWeek', label: 'Deze week' },
  { key: 'previousWeek', label: 'Vorige week' },
  { key: 'currentMonth', label: 'Deze maand' },
  { key: 'previousMonth', label: 'Vorige maand' },
  { key: 'currentYear', label: 'Dit jaar' },
  { key: 'previousYear', label: 'Vorig jaar' },
];

// Generate available years (current year back to 2020)
const getAvailableYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= 2020; year--) {
    years.push(year);
  }
  return years;
};

const getPresetPeriod = (preset: PresetType): ReportPeriod => {
  const now = new Date();
  
  switch (preset) {
    case 'currentWeek': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return {
        type: 'week',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Deze week'
      };
    }
    case 'previousWeek': {
      const prevWeek = subWeeks(now, 1);
      const start = startOfWeek(prevWeek, { weekStartsOn: 1 });
      const end = endOfWeek(prevWeek, { weekStartsOn: 1 });
      return {
        type: 'week',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Vorige week'
      };
    }
    case 'currentMonth': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        type: 'month',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Deze maand'
      };
    }
    case 'previousMonth': {
      const prevMonth = subMonths(now, 1);
      const start = startOfMonth(prevMonth);
      const end = endOfMonth(prevMonth);
      return {
        type: 'month',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Vorige maand'
      };
    }
    case 'currentYear': {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        type: 'year',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Dit jaar'
      };
    }
    case 'previousYear': {
      const prevYear = subYears(now, 1);
      const start = startOfYear(prevYear);
      const end = endOfYear(prevYear);
      return {
        type: 'year',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: 'Vorig jaar'
      };
    }
  }
};

const getYearPeriod = (year: number): ReportPeriod => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return {
    type: 'year',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: `Jaar ${year}`
  };
};

const getAllTimePeriod = (): ReportPeriod => {
  const start = new Date(2020, 0, 1);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return {
    type: 'custom',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: 'All-time'
  };
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange }) => {
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(
    value.type === 'custom' ? new Date(value.startDate) : undefined
  );
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(
    value.type === 'custom' ? new Date(value.endDate) : undefined
  );
  const [selectedYear, setSelectedYear] = useState<string>("");

  const availableYears = getAvailableYears();

  const handlePresetClick = (preset: PresetType) => {
    setSelectedYear("");
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    onChange(getPresetPeriod(preset));
  };

  const handleYearChange = (yearStr: string) => {
    setSelectedYear(yearStr);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    
    if (yearStr === 'all-time') {
      onChange(getAllTimePeriod());
    } else {
      onChange(getYearPeriod(parseInt(yearStr)));
    }
  };

  const handleApplyCustomPeriod = () => {
    if (customStartDate && customEndDate) {
      setSelectedYear("");
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      
      onChange({
        type: 'custom',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        label: `${format(start, 'dd-MM-yyyy')} - ${format(end, 'dd-MM-yyyy')}`
      });
    }
  };

  // Determine which preset is currently active
  const getActivePreset = (): PresetType | null => {
    for (const preset of presets) {
      const presetPeriod = getPresetPeriod(preset.key);
      if (
        presetPeriod.startDate === value.startDate &&
        presetPeriod.endDate === value.endDate
      ) {
        return preset.key;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg">
      {/* Preset buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Snelkeuze</label>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.key}
              variant={activePreset === preset.key ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset.key)}
              className="gap-1"
            >
              {activePreset === preset.key && <Check className="h-3 w-3" />}
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Year selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Of selecteer jaar</label>
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Kies een jaar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">All-time</SelectItem>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date range */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Of custom periode</label>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "dd-MM-yyyy") : "Van"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={setCustomStartDate}
                locale={nl}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">tot</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "dd-MM-yyyy") : "Tot"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={setCustomEndDate}
                locale={nl}
                disabled={(date) => customStartDate ? date < customStartDate : false}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleApplyCustomPeriod}
            disabled={!customStartDate || !customEndDate}
            size="sm"
          >
            Toepassen
          </Button>
        </div>
      </div>

      {/* Current selection indicator */}
      <div className="pt-2 border-t">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium">Geselecteerd:</span> {value.label}
        </p>
      </div>
    </div>
  );
};
