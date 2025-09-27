import React, { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser, UserProfile } from "@/services/userService";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ open, onClose, user }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmationText, setConfirmationText] = useState("");

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        toast({
          title: "Gebruiker verwijderd",
          description: result.message || "De gebruiker is succesvol verwijderd uit het systeem.",
        });
        handleClose();
      } else {
        toast({
          title: "Fout bij verwijderen",
          description: result.error || "Er is een fout opgetreden bij het verwijderen van de gebruiker.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message || "Er is een onbekende fout opgetreden.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setConfirmationText("");
    onClose();
  };

  const handleDelete = () => {
    if (!user) return;
    
    const expectedText = `${user.first_name} ${user.last_name}`;
    if (confirmationText.trim().toLowerCase() !== expectedText.toLowerCase()) {
      toast({
        title: "Bevestiging incorrect",
        description: `Type exact "${expectedText}" om te bevestigen.`,
        variant: "destructive",
      });
      return;
    }

    deleteUserMutation.mutate(user.id);
  };

  if (!user) return null;

  const expectedConfirmationText = `${user.first_name} ${user.last_name}`;
  const isConfirmationValid = confirmationText.trim().toLowerCase() === expectedConfirmationText.toLowerCase();

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Gebruiker Permanent Verwijderen
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">⚠️ WAARSCHUWING: Deze actie kan NIET ongedaan worden gemaakt!</p>
            </div>
            
            <div className="space-y-2">
              <p>Je staat op het punt om de volgende gebruiker permanent te verwijderen:</p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-600">Rol: {
                  user.role === "admin" ? "Admin" : 
                  user.role === "owner" ? "Owner" :
                  user.role === "manager" ? "Manager" :
                  user.role === "verkoper" ? "Verkoper" : "Gebruiker"
                }</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Dit zal het volgende doen:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Account wordt permanent verwijderd</li>
                <li>• Toegang tot alle systemen wordt onmiddellijk ingetrokken</li>
                <li>• Alle gekoppelde data blijft behouden voor administratie</li>
                <li>• Bedrijfsgeheimen blijven beschermd</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type "<span className="font-mono font-bold">{expectedConfirmationText}</span>" om te bevestigen:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={expectedConfirmationText}
              className={confirmationText && !isConfirmationValid ? "border-red-500" : ""}
              disabled={deleteUserMutation.isPending}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleClose}
            disabled={deleteUserMutation.isPending}
          >
            Annuleren
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmationValid || deleteUserMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteUserMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verwijderen...
              </>
            ) : (
              "Permanent Verwijderen"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};