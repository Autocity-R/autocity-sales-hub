import React, { useEffect, useRef, useState } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";

interface PhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

/** Meerdere foto's kiezen/maken: nieuwe selecties worden TOEGEVOEGD, niet vervangen. */
export const PhotoPicker: React.FC<PhotoPickerProps> = ({ files, onChange, disabled }) => {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(f => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(u => URL.revokeObjectURL(u));
  }, [files]);

  const add = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      const key = (f: File) => `${f.name}_${f.size}_${f.lastModified}`;
      const existing = new Set(files.map(key));
      onChange([...files, ...picked.filter(f => !existing.has(key(f)))]);
    }
    e.target.value = "";
  };

  const remove = (idx: number) => onChange(files.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={() => galleryRef.current?.click()}
          className="flex-1 min-w-[140px] flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 hover:border-slate-400 bg-white disabled:opacity-50">
          <ImageIcon className="h-4 w-4 text-slate-500" />
          <span className="text-[12.5px] text-slate-600">Foto's kiezen</span>
        </button>
        <button type="button" disabled={disabled} onClick={() => cameraRef.current?.click()}
          className="flex-1 min-w-[140px] flex items-center gap-2 border border-dashed border-slate-300 rounded-lg p-3 hover:border-slate-400 bg-white disabled:opacity-50">
          <Camera className="h-4 w-4 text-slate-500" />
          <span className="text-[12.5px] text-slate-600">Foto maken</span>
        </button>
        <input ref={galleryRef} type="file" multiple accept="image/*" className="hidden" onChange={add} />
        <input ref={cameraRef} type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={add} />
      </div>

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`Foto ${i + 1}`} className="h-20 w-20 object-cover rounded-md border border-slate-200" />
                <button type="button" onClick={() => remove(i)} title="Verwijderen"
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-slate-900 text-white p-0.5 hover:bg-slate-700">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-slate-500">{files.length} foto('s) geselecteerd</p>
        </>
      )}
    </div>
  );
};
