import React, { useState } from "react";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalespeople } from "@/hooks/useSalespeople";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PurchaserQuickEditProps {
  vehicleId: string;
  currentPurchaserId?: string;
  currentPurchaserName?: string;
  onUpdate?: () => void;
}

export const PurchaserQuickEdit: React.FC<PurchaserQuickEditProps> = ({
  vehicleId,
  currentPurchaserId,
  currentPurchaserName,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { data: salespeople = [] } = useSalespeople();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handlePurchaserChange = async (userId: string) => {
    const selectedUser = salespeople.find(sp => sp.id === userId);
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          purchased_by_user_id: userId,
          purchased_by_name: selectedUser.name
        })
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        description: "Inkoper toegewezen"
      });

      // Invalidate all vehicle queries
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['b2bVehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['b2cVehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['deliveredVehicles'] });

      if (onUpdate) onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating purchaser:', error);
      toast({
        variant: "destructive",
        description: "Fout bij het toewijzen van inkoper"
      });
    }
  };

  if (!isEditing && currentPurchaserName) {
    return (
      <div 
        className="flex items-center space-x-1 cursor-pointer hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate">{currentPurchaserName}</span>
      </div>
    );
  }

  if (!isEditing && !currentPurchaserName) {
    return (
      <Badge 
        variant="outline" 
        className="cursor-pointer hover:bg-muted"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        <User className="h-3 w-3 mr-1" />
        Toewijzen
      </Badge>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={currentPurchaserId || ""}
        onValueChange={handlePurchaserChange}
        onOpenChange={(open) => {
          if (!open) setIsEditing(false);
        }}
        open={isEditing}
      >
        <SelectTrigger className="w-full max-w-[180px] h-8 text-sm">
          <SelectValue placeholder="Selecteer inkoper" />
        </SelectTrigger>
        <SelectContent>
          {salespeople.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              {person.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
