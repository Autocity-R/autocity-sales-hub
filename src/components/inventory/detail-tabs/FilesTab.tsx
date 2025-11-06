
import React from "react";
import { FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUploader } from "@/components/inventory/FileUploader";
import { VehicleFile, FileCategory } from "@/types/inventory";
import { SavedContractMetadata } from "@/services/contractStorageService";

interface FilesTabProps {
  files: VehicleFile[];
  onFileUpload: (file: File, category: FileCategory) => void;
  onFileDelete: (fileId: string, filePath: string) => void;
  onSendEmail?: (type: string) => void;
  readOnly?: boolean;
}

export const FilesTab: React.FC<FilesTabProps> = ({ 
  files, 
  onFileUpload,
  onFileDelete,
  onSendEmail,
  readOnly = false
}) => {
  const contractFiles = files.filter(f => f.category === 'contract_b2b' || f.category === 'contract_b2c');
  const damageFiles = files.filter(f => f.category === 'damage');
  const cmrFiles = files.filter(f => f.category === 'cmr');
  const pickupFiles = files.filter(f => f.category === 'pickup');

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Documenten</h3>
        
        {/* Contracten Sectie */}
        <div className="border rounded-md p-4 space-y-4 bg-primary/5">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-primary">Contracten</h4>
            <Badge variant="default" className="ml-2">
              {contractFiles.length}
            </Badge>
          </div>
          {contractFiles.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Opgeslagen koopcontracten (laatst verstuurde contract).
              </p>
              <ul className="space-y-2">
                {contractFiles.map(file => {
                  const metadata = file.metadata as SavedContractMetadata | undefined;
                  const hasTradeIn = metadata?.contractOptions?.tradeInVehicle;
                  
                  return (
                    <li key={file.id} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                      <div className="flex items-center flex-1 gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium truncate max-w-[200px]" title={file.name}>
                            {file.name}
                          </span>
                          {metadata && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(metadata.savedAt).toLocaleDateString('nl-NL', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {file.category === 'contract_b2b' ? 'B2B' : 'B2C'}
                          </Badge>
                          {hasTradeIn && (
                            <Badge variant="secondary" className="text-xs bg-amber-500 text-white">
                              Inruil
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nog geen contracten verstuurd. Contracten worden hier automatisch opgeslagen na het versturen.
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Schade documenten</h4>
              <Badge variant="outline" className="ml-2">
                {damageFiles.length}
              </Badge>
            </div>
            {!readOnly && (
              <FileUploader 
                onFileUpload={(file) => onFileUpload(file, "damage")} 
                acceptedFileTypes=".jpg,.jpeg,.png,.pdf"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Upload schaderapport documenten voor intern gebruik.
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {damageFiles
                .slice(0, 10) // Limit to 10 files for performance
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[120px]" title={file.name}>
                        {file.name}
                      </span>
                      {file.isLargeFile && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Groot bestand
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {file.isLargeFile ? (
                        <Button size="sm" variant="ghost" disabled>
                          Te groot
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                        </Button>
                      )}
                      {!readOnly && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onFileDelete(file.id, file.filePath || '')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              {damageFiles.length > 10 && (
                <li className="text-sm text-muted-foreground text-center">
                  ... en {damageFiles.length - 10} meer
                </li>
              )}
            </ul>
          </div>
          
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">CMR documenten</h4>
              <Badge variant="outline" className="ml-2">
                {cmrFiles.length}
              </Badge>
            </div>
            {!readOnly && (
              <FileUploader 
                onFileUpload={(file) => onFileUpload(file, "cmr")} 
                acceptedFileTypes=".pdf,.doc,.docx"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Upload CMR documenten voor verzending naar leverancier.
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {cmrFiles
                .slice(0, 10)
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[120px]" title={file.name}>
                        {file.name}
                      </span>
                      {file.isLargeFile && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Groot bestand
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {file.isLargeFile ? (
                        <Button size="sm" variant="ghost" disabled>
                          Te groot
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                        </Button>
                      )}
                      {!readOnly && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onFileDelete(file.id, file.filePath || '')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              {cmrFiles.length > 10 && (
                <li className="text-sm text-muted-foreground text-center">
                  ... en {cmrFiles.length - 10} meer
                </li>
              )}
            </ul>
          </div>
          
          <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Pickup documenten</h4>
              <Badge variant="outline" className="ml-2">
                {pickupFiles.length}
              </Badge>
            </div>
            {!readOnly && (
              <FileUploader 
                onFileUpload={(file) => onFileUpload(file, "pickup")} 
                acceptedFileTypes=".pdf,.doc,.docx"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Upload pickup documenten voor verzending naar transporteur.
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {pickupFiles
                .slice(0, 10)
                .map(file => (
                  <li key={file.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="truncate max-w-[120px]" title={file.name}>
                        {file.name}
                      </span>
                      {file.isLargeFile && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Groot bestand
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {file.isLargeFile ? (
                        <Button size="sm" variant="ghost" disabled>
                          Te groot
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <a href={file.url} target="_blank" rel="noopener noreferrer">Bekijk</a>
                        </Button>
                      )}
                      {!readOnly && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => onFileDelete(file.id, file.filePath || '')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              {files.filter(file => file.category === "pickup").length > 10 && (
                <li className="text-sm text-muted-foreground text-center">
                  ... en {files.filter(file => file.category === "pickup").length - 10} meer
                </li>
              )}
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
              disabled={readOnly || !files.some(file => file.category === "cmr")}
              onClick={() => onSendEmail?.('cmr_supplier')}
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
              disabled={readOnly || !files.some(file => file.category === "pickup")}
              onClick={() => onSendEmail?.('transport_pickup')}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Verstuur pickup naar transporteur
            </Button>
            {!pickupFiles.length && (
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
