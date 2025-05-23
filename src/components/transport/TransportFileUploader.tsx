
import React, { useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileCategory, VehicleFile } from "@/types/inventory";
import { uploadVehicleFile } from "@/services/inventoryService";
import { useToast } from "@/hooks/use-toast";

interface TransportFileUploaderProps {
  vehicleId: string;
  category: FileCategory;
  onFileUploaded: (fileData: VehicleFile) => void;
}

export const TransportFileUploader: React.FC<TransportFileUploaderProps> = ({
  vehicleId,
  category,
  onFileUploaded,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      setIsUploading(true);
      const fileData = await uploadVehicleFile(file, category, vehicleId);
      onFileUploaded(fileData);
      toast({
        title: "Document geüpload",
        description: `${file.name} is succesvol geüpload.`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Fout bij uploaden",
        description: "Het document kon niet worden geüpload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        id={`file-upload-${category}`}
        className="sr-only"
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
      />
      <label htmlFor={`file-upload-${category}`}>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={isUploading}
          asChild
        >
          <span>
            <FileUp className="mr-2 h-4 w-4" />
            Document uploaden
          </span>
        </Button>
      </label>
    </div>
  );
};
