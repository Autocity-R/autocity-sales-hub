
import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Supplier } from "@/types/inventory";

interface TransportSupplierFormProps {
  onSubmit: (data: Supplier) => void;
}

export const TransportSupplierForm: React.FC<TransportSupplierFormProps> = ({ onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<Supplier>();

  return (
    <form onSubmit={handleSubmit(data => onSubmit({ ...data, id: crypto.randomUUID() }))}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Naam transporteur</Label>
            <Input
              id="name"
              {...register("name", { required: "Naam is verplicht" })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Land</Label>
            <Input
              id="country"
              {...register("country", { required: "Land is verplicht" })}
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contactpersoon</Label>
            <Input
              id="contactPerson"
              {...register("contactPerson", { required: "Contactpersoon is verplicht" })}
            />
            {errors.contactPerson && (
              <p className="text-sm text-destructive">{errors.contactPerson.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { 
                required: "Email is verplicht",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Ongeldig email adres"
                }
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefoonnummer</Label>
            <Input
              id="phone"
              {...register("phone", { required: "Telefoonnummer is verplicht" })}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adres</Label>
            <Input
              id="address"
              {...register("address", { required: "Adres is verplicht" })}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit">Transporteur opslaan</Button>
        </div>
      </div>
    </form>
  );
};
