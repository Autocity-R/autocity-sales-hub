import React, { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/services/userService";
import { Loader2, Eye, EyeOff } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

// Validation schema
const userSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "Voornaam is verplicht" })
    .max(50, { message: "Voornaam mag maximaal 50 karakters bevatten" }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "Achternaam is verplicht" })
    .max(50, { message: "Achternaam mag maximaal 50 karakters bevatten" }),
  email: z
    .string()
    .trim()
    .email({ message: "Ongeldig e-mailadres" })
    .max(255, { message: "E-mailadres mag maximaal 255 karakters bevatten" }),
  password: z
    .string()
    .min(8, { message: "Wachtwoord moet minimaal 8 karakters bevatten" })
    .max(72, { message: "Wachtwoord mag maximaal 72 karakters bevatten" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: "Wachtwoord moet minimaal 1 kleine letter, 1 hoofdletter en 1 cijfer bevatten"
    }),
  role: z.string().refine(
    (value) => ["owner", "admin", "manager", "aftersales_manager", "verkoper", "operationeel", "user"].includes(value),
    { message: "Selecteer een geldige rol" }
  )
});

type UserFormData = z.infer<typeof userSchema>;

export const AddUserDialog: React.FC<AddUserDialogProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user"
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  const createUserMutation = useMutation({
    mutationFn: ({ email, password, firstName, lastName, role }: UserFormData) =>
      createUser(email, password, firstName, lastName, role),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] }); // Also refresh task employees
        toast({
          title: "Gebruiker aangemaakt",
          description: "De nieuwe gebruiker is succesvol aangemaakt en kan nu taken toegewezen krijgen.",
        });
        handleClose();
      } else {
        const isDuplicate = result.error?.toLowerCase().includes('bestaat al') || result.error?.toLowerCase().includes('already');
        if (isDuplicate) {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          toast({
            title: "Gebruiker bestaat al",
            description: "Deze gebruiker staat al in de lijst. De lijst is ververst.",
          });
          handleClose();
        } else {
          toast({
            title: "Fout bij aanmaken",
            description: result.error || "Er is een fout opgetreden bij het aanmaken van de gebruiker.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message || "Er is een onbekende fout opgetreden.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "user"
    });
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    try {
      userSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof UserFormData, string>> = {};
        error.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            const field = issue.path[0] as keyof UserFormData;
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    createUserMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const roleOptions = [
    { value: "user", label: "Gebruiker", description: "Basis toegang tot het systeem" },
    { value: "operationeel", label: "Operationeel", description: "Operationele taken uitvoeren" },
    { value: "verkoper", label: "Verkoper", description: "Kan leads en verkopen beheren" },
    { value: "aftersales_manager", label: "Aftersales Manager", description: "Beheert leveringen, garantie en taken" },
    { value: "manager", label: "Manager", description: "Kan teams en rapportages beheren" },
    { value: "admin", label: "Admin", description: "Volledige toegang tot alle functies" },
    { value: "owner", label: "Owner", description: "Eigenaar met alle rechten" }
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe Gebruiker Toevoegen</DialogTitle>
          <DialogDescription>
            Voeg een nieuwe gebruiker toe aan het systeem. Deze gebruiker kan daarna taken toegewezen krijgen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Voornaam"
                className={errors.firstName ? "border-red-500" : ""}
                disabled={createUserMutation.isPending}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Achternaam *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Achternaam"
                className={errors.lastName ? "border-red-500" : ""}
                disabled={createUserMutation.isPending}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="gebruiker@bedrijf.nl"
              className={errors.email ? "border-red-500" : ""}
              disabled={createUserMutation.isPending}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Minimaal 8 karakters"
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                disabled={createUserMutation.isPending}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={createUserMutation.isPending}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
            <p className="text-xs text-gray-500">
              Minimaal 8 karakters met 1 hoofdletter, 1 kleine letter en 1 cijfer
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value) => handleInputChange("role", value)}
              disabled={createUserMutation.isPending}
            >
              <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecteer een rol" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-gray-500">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={createUserMutation.isPending}
            >
              Annuleren
            </Button>
            <Button 
              type="submit" 
              disabled={createUserMutation.isPending}
              className="min-w-32"
            >
              {createUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aanmaken...
                </>
              ) : (
                "Gebruiker Aanmaken"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};