import { Vehicle, VehicleFile } from "@/types/inventory";
import { ContractOptions } from "@/types/email";
import { generateContract } from "./contractService";
import { generatePdfFromHtml } from "./contractPdfService";
import { supabase } from "@/integrations/supabase/client";

export interface SavedContractMetadata {
  contractType: "b2b" | "b2c";
  contractOptions: ContractOptions;
  savedAt: string;
  vehicleSnapshot: {
    brand: string;
    model: string;
    vin: string;
    licenseNumber?: string;
  };
}

/**
 * Saves a contract as a PDF file in Supabase Storage and links it to the vehicle
 */
export const saveContractToVehicle = async (
  vehicle: Vehicle,
  contractType: "b2b" | "b2c",
  contractOptions: ContractOptions,
  signatureUrl?: string
): Promise<VehicleFile | null> => {
  try {
    console.log(`[CONTRACT_STORAGE] 📝 Starting contract save for vehicle ${vehicle.id}`, {
      contractType,
      vehicleBrand: vehicle.brand,
      vehicleModel: vehicle.model,
      hasSignatureUrl: !!signatureUrl
    });

    // 1. Generate contract HTML
    console.log(`[CONTRACT_STORAGE] 🔨 Step 1: Generating contract HTML...`);
    const generatedContract = await generateContract(vehicle, contractType, contractOptions, signatureUrl);
    console.log(`[CONTRACT_STORAGE] ✅ Step 1: Contract HTML generated (${generatedContract.htmlContent.length} chars)`);
    
    // 2. Convert HTML to PDF using html2pdf.js
    console.log(`[CONTRACT_STORAGE] 🔨 Step 2: Converting HTML to PDF...`);
    const pdfBlob = await generatePdfFromHtml(generatedContract.htmlContent);
    console.log(`[CONTRACT_STORAGE] ✅ Step 2: PDF generated (${pdfBlob.size} bytes)`);
    
    // 3. Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `contract_${contractType}_${vehicle.brand}_${vehicle.model}_${timestamp}.pdf`;
    const filePath = `${vehicle.id}/contracts/${fileName}`;
    console.log(`[CONTRACT_STORAGE] 📁 File path: ${filePath}`);
    
    // 4. Upload PDF to Supabase Storage
    console.log(`[CONTRACT_STORAGE] 🔨 Step 3: Uploading to Supabase Storage...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('vehicle-documents')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[CONTRACT_STORAGE] ❌ Step 3 FAILED: Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    console.log(`[CONTRACT_STORAGE] ✅ Step 3: Uploaded to storage:`, uploadData);
    
    // 5. Get signed URL (bucket is private)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('vehicle-documents')
      .createSignedUrl(filePath, 3600);
    if (signedError) {
      console.error('[CONTRACT_STORAGE] ⚠️ Signed URL error:', signedError);
    }
    const signedUrl = signedData?.signedUrl ?? '';
    console.log(`[CONTRACT_STORAGE] 🔗 Signed URL generated`);
    
    // 6. Create metadata
    const metadata: SavedContractMetadata = {
      contractType,
      contractOptions,
      savedAt: new Date().toISOString(),
      vehicleSnapshot: {
        brand: vehicle.brand,
        model: vehicle.model,
        vin: vehicle.vin || '',
        licenseNumber: vehicle.licenseNumber
      }
    };
    
    // 7. Insert record in vehicle_files table
    console.log(`[CONTRACT_STORAGE] 🔨 Step 4: Saving to database...`);
    const { data: fileRecord, error: dbError } = await supabase
      .from('vehicle_files')
      .insert([{
        vehicle_id: vehicle.id,
        file_name: fileName,
        file_path: filePath,
        file_url: signedUrl,
        file_type: 'application/pdf',
        category: contractType === 'b2b' ? 'contract_b2b' : 'contract_b2c',
        file_size: pdfBlob.size,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        metadata: metadata
      }] as any)
      .select()
      .single();
    
    if (dbError) {
      console.error('[CONTRACT_STORAGE] ❌ Step 4 FAILED: Database error:', dbError);
      // Try to clean up uploaded file
      console.log('[CONTRACT_STORAGE] 🧹 Cleaning up orphaned file...');
      await supabase.storage.from('vehicle-documents').remove([filePath]);
      throw new Error(`Database save failed: ${dbError.message}`);
    }
    
    console.log(`[CONTRACT_STORAGE] 🎉 SUCCESS! Contract saved:`, {
      id: fileRecord.id,
      fileName: fileRecord.file_name,
      category: fileRecord.category,
      size: fileRecord.file_size
    });
    
    return {
      id: fileRecord.id,
      vehicleId: fileRecord.vehicle_id,
      name: fileRecord.file_name,
      fileName: fileRecord.file_name,
      filePath: fileRecord.file_path,
      url: signedUrl,
      fileUrl: signedUrl,
      category: fileRecord.category as any,
      fileSize: fileRecord.file_size,
      size: fileRecord.file_size,
      uploadedBy: fileRecord.uploaded_by,
      uploadedAt: fileRecord.created_at,
      createdAt: fileRecord.created_at,
      isLargeFile: false
    };
    
  } catch (error) {
    console.error('[CONTRACT_STORAGE] ❌ FAILED to save contract:', error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Retrieves the latest contract for a vehicle by type
 */
export const getLatestContractForVehicle = async (
  vehicleId: string,
  contractType?: "b2b" | "b2c"
): Promise<VehicleFile | null> => {
  try {
    let query = supabase
      .from('vehicle_files')
      .select('*')
      .eq('vehicle_id', vehicleId);
    
    if (contractType) {
      query = query.eq('category', contractType === 'b2b' ? 'contract_b2b' : 'contract_b2c');
    } else {
      query = query.in('category', ['contract_b2b', 'contract_b2c']);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    const { data: signedData } = await supabase.storage
      .from('vehicle-documents')
      .createSignedUrl(data.file_path, 3600);
    const signedUrl = signedData?.signedUrl ?? '';

    return {
      id: data.id,
      vehicleId: data.vehicle_id,
      name: data.file_name,
      fileName: data.file_name,
      filePath: data.file_path,
      url: signedUrl,
      fileUrl: signedUrl,
      category: data.category as any,
      fileSize: data.file_size,
      size: data.file_size,
      uploadedBy: data.uploaded_by,
      uploadedAt: data.created_at,
      createdAt: data.created_at,
      isLargeFile: false,
      metadata: (data as any).metadata as SavedContractMetadata
    };
  } catch (error) {
    console.error('[CONTRACT_STORAGE] Failed to get latest contract:', error);
    return null;
  }
};

/**
 * Gets all contracts for a vehicle
 */
export const getAllContractsForVehicle = async (vehicleId: string): Promise<VehicleFile[]> => {
  try {
    const { data, error } = await supabase
      .from('vehicle_files')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .in('category', ['contract_b2b', 'contract_b2c'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[CONTRACT_STORAGE] Error fetching contracts:', error);
      return [];
    }
    
    return await Promise.all((data || []).map(async (file) => {
      const { data: signedData } = await supabase.storage
        .from('vehicle-documents')
        .createSignedUrl(file.file_path, 3600);
      const signedUrl = signedData?.signedUrl ?? '';

      return {
        id: file.id,
        vehicleId: file.vehicle_id,
        name: file.file_name,
        fileName: file.file_name,
        filePath: file.file_path,
        url: signedUrl,
        fileUrl: signedUrl,
        category: file.category as any,
        fileSize: file.file_size,
        size: file.file_size,
        uploadedBy: file.uploaded_by,
        uploadedAt: file.created_at,
        createdAt: file.created_at,
        isLargeFile: false,
        metadata: (file as any).metadata as SavedContractMetadata
      };
    }));
  } catch (error) {
    console.error('[CONTRACT_STORAGE] Failed to get contracts:', error);
    return [];
  }
};

/**
 * Delete a contract file from a vehicle
 * Removes both the storage file and database record
 */
export const deleteContractFromVehicle = async (
  fileId: string
): Promise<boolean> => {
  try {
    console.log(`[CONTRACT_STORAGE] 🗑️ Deleting contract file: ${fileId}`);
    
    // 1. Get file details first
    const { data: fileRecord, error: fetchError } = await supabase
      .from('vehicle_files')
      .select('file_path, file_url')
      .eq('id', fileId)
      .single();
    
    if (fetchError) {
      console.error('[CONTRACT_STORAGE] ❌ Error fetching file:', fetchError);
      throw fetchError;
    }
    
    if (!fileRecord) {
      console.error('[CONTRACT_STORAGE] ❌ File not found');
      return false;
    }
    
    // 2. Delete from storage
    console.log(`[CONTRACT_STORAGE] 🗑️ Deleting from storage: ${fileRecord.file_path}`);
    const { error: storageError } = await supabase.storage
      .from('vehicle-documents')
      .remove([fileRecord.file_path]);
    
    if (storageError) {
      console.error('[CONTRACT_STORAGE] ⚠️ Storage deletion error:', storageError);
      // Continue anyway - file might not exist in storage
    }
    
    // 3. Delete database record
    console.log(`[CONTRACT_STORAGE] 🗑️ Deleting database record`);
    const { error: dbError } = await supabase
      .from('vehicle_files')
      .delete()
      .eq('id', fileId);
    
    if (dbError) {
      console.error('[CONTRACT_STORAGE] ❌ Database deletion error:', dbError);
      throw dbError;
    }
    
    console.log(`[CONTRACT_STORAGE] ✅ Contract deleted successfully`);
    return true;
  } catch (error) {
    console.error('[CONTRACT_STORAGE] ❌ Error deleting contract:', error);
    return false;
  }
};
