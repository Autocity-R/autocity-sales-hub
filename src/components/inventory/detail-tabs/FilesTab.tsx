
import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "@/components/inventory/FileUploader";
import { VehicleFile, FileCategory } from "@/types/files";

interface FilesTabProps {
  files: VehicleFile[];
  onFileUpload: (file: File, category: FileCategory) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({ 
  files, 
  onFileUpload 
}) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Documenten</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Schade documenten</h4>
              <Badge variant="outline" className="ml-2">
                {files.filter(f => f.category === "damage").length}
              </Badge>
            </div>
            <FileUploader 
              onFileUpload={(file) => onFileUpload(file, "damage")} 
              acceptedFileTypes=".jpg,.jpeg,.png,.pdf"
            />
            <p className="text-sm text-muted-foreground">
              Upload schaderapport documenten voor intern gebruik.
            </p>
            <ul className="space-y-2">
              {files
                .filter(file => file.category === "damage")
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
          
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">CMR documenten</h4>
              <Badge variant="outline" className="ml-2">
                {files.filter(f => f.category === "cmr").length}
              </Badge>
            </div>
            <FileUploader 
              onFileUpload={(file) => onFileUpload(file, "cmr")} 
              acceptedFileTypes=".pdf,.doc,.docx"
            />
            <p className="text-sm text-muted-foreground">
              Upload CMR documenten voor verzending naar leverancier.
            </p>
            <ul className="space-y-2">
              {files
                .filter(file => file.category === "cmr")
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
          
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Pickup documenten</h4>
              <Badge variant="outline" className="ml-2">
                {files.filter(f => f.category === "pickup").length}
              </Badge>
            </div>
            <FileUploader 
              onFileUpload={(file) => onFileUpload(file, "pickup")} 
              acceptedFileTypes=".pdf,.doc,.docx"
            />
            <p className="text-sm text-muted-foreground">
              Upload pickup documenten voor verzending naar transporteur.
            </p>
            <ul className="space-y-2">
              {files
                .filter(file => file.category === "pickup")
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <Button size="sm" variant="ghost">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                    </Button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-medium">Documenten versturen</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-3">CMR document</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Verstuur het CMR document naar de leverancier.
            </p>
            <Button 
              disabled={!files.some(file => file.category === "cmr")}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Verstuur CMR naar leverancier
            </Button>
            {!files.some(file => file.category === "cmr") && (
              <p className="text-xs text-destructive mt-2">
                Upload eerst een CMR document
              </p>
            )}
          </div>
          
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-3">Pickup document</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Verstuur het pickup document naar de transporteur.
            </p>
            <Button 
              disabled={!files.some(file => file.category === "pickup")}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Verstuur pickup naar transporteur
            </Button>
            {!files.some(file => file.category === "pickup") && (
              <p className="text-xs text-destructive mt-2">
                Upload eerst een pickup document
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
