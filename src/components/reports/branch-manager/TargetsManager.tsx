import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { SalesTarget } from '@/types/branchManager';
import { ReportPeriod } from '@/types/reports';
import { branchManagerService } from '@/services/branchManagerService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface TargetsManagerProps {
  period: ReportPeriod;
  targets: SalesTarget[];
  onClose: () => void;
  onSave: () => void;
}

export const TargetsManager: React.FC<TargetsManagerProps> = ({
  period,
  targets,
  onClose,
  onSave
}) => {
  const periodKey = format(new Date(period.startDate), 'yyyy-MM');
  const periodLabel = format(new Date(period.startDate), 'MMMM yyyy', { locale: nl });

  const getTargetValue = (type: string): number => {
    const target = targets.find(t => t.target_type === type && !t.salesperson_id);
    return target?.target_value || getDefaultValue(type);
  };

  const getDefaultValue = (type: string): number => {
    switch (type) {
      case 'b2c_units': return 40;
      case 'b2c_revenue': return 120000;
      case 'b2c_margin_percent': return 15;
      case 'upsales_revenue': return 5000;
      default: return 0;
    }
  };

  const [formValues, setFormValues] = useState({
    b2c_units: getTargetValue('b2c_units'),
    b2c_revenue: getTargetValue('b2c_revenue'),
    b2c_margin_percent: getTargetValue('b2c_margin_percent'),
    upsales_revenue: getTargetValue('upsales_revenue')
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof typeof formValues, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all targets
      await Promise.all([
        branchManagerService.updateTarget({
          target_type: 'b2c_units',
          target_period: periodKey,
          target_value: formValues.b2c_units
        }),
        branchManagerService.updateTarget({
          target_type: 'b2c_revenue',
          target_period: periodKey,
          target_value: formValues.b2c_revenue
        }),
        branchManagerService.updateTarget({
          target_type: 'b2c_margin_percent',
          target_period: periodKey,
          target_value: formValues.b2c_margin_percent
        }),
        branchManagerService.updateTarget({
          target_type: 'upsales_revenue',
          target_period: periodKey,
          target_value: formValues.upsales_revenue
        })
      ]);

      toast.success('Targets opgeslagen');
      onSave();
    } catch (error) {
      console.error('Error saving targets:', error);
      toast.error('Fout bij opslaan targets');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Targets Instellen</DialogTitle>
          <DialogDescription className="capitalize">
            Team targets voor {periodLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="b2c_units" className="text-right">
              B2C Verkopen
            </Label>
            <Input
              id="b2c_units"
              type="number"
              value={formValues.b2c_units}
              onChange={(e) => handleChange('b2c_units', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="b2c_revenue" className="text-right">
              B2C Marge (€)
            </Label>
            <Input
              id="b2c_revenue"
              type="number"
              value={formValues.b2c_revenue}
              onChange={(e) => handleChange('b2c_revenue', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="b2c_margin_percent" className="text-right">
              Marge % Target
            </Label>
            <Input
              id="b2c_margin_percent"
              type="number"
              step="0.1"
              value={formValues.b2c_margin_percent}
              onChange={(e) => handleChange('b2c_margin_percent', e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="upsales_revenue" className="text-right">
              Upsales (€)
            </Label>
            <Input
              id="upsales_revenue"
              type="number"
              value={formValues.upsales_revenue}
              onChange={(e) => handleChange('upsales_revenue', e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
