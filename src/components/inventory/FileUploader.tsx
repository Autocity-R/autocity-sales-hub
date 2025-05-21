import React, { useRef, useState } from "react";
import { FilePlus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFileUpload: (file: File) => void;
  acceptedFileTypes: string;
  maxSizeMB?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileUpload,
  acceptedFileTypes,
  maxSizeMB = 10, // Default max size 10MB
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    uploadFile(file);
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setIsDragging(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    
    uploadFile(file);
  };
  
  const uploadFile = (file: File) => {
    // Check file size
    if (file.size > maxSizeBytes) {
      toast({
        title: "Bestand te groot",
        description: `Maximale bestandsgrootte is ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = acceptedFileTypes.split(',').map(type => 
      type.trim().replace('.', '').toLowerCase()
    );
    
    if (fileType && !acceptedTypes.includes(fileType)) {
      toast({
        title: "Ongeldig bestandsformaat",
        description: `Toegestane bestandsformaten zijn: ${acceptedFileTypes}`,
        variant: "destructive",
      });
      return;
    }
    
    // Simulate upload
    setIsUploading(true);
    setTimeout(() => {
      onFileUpload(file);
      setIsUploading(false);
      toast({
        title: "Bestand geüpload",
        description: `${file.name} is succesvol geüpload`,
      });
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1000);
  };

  return (
    <div
      className={`
        border-2 border-dashed rounded-md p-4 text-center cursor-pointer
        ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/20'}
      `}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept={acceptedFileTypes}
        ref={fileInputRef}
      />
      
      <div className="flex flex-col items-center py-2">
        {isUploading ? (
          <>
            <Upload className="h-6 w-6 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground mt-2">Uploaden...</p>
          </>
        ) : (
          <>
            <FilePlus className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">
              Klik of sleep een bestand hier
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Max {maxSizeMB}MB ({acceptedFileTypes.replace(/\./g, '')})
            </p>
          </>
        )}
      </div>
    </div>
  );
};
