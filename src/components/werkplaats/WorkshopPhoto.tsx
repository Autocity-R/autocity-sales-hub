import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon } from "lucide-react";

/** Toont een foto uit de workshop-photos bucket via signed URL. */
export const WorkshopPhoto: React.FC<{ path: string; className?: string; onClick?: () => void }> = ({ path, className, onClick }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    supabase.storage.from("workshop-photos").createSignedUrl(path, 3600).then(({ data }) => {
      if (!cancel && data?.signedUrl) setUrl(data.signedUrl);
    });
    return () => { cancel = true; };
  }, [path]);
  if (!url) return (
    <div className={`bg-muted flex items-center justify-center rounded ${className ?? ""}`}>
      <ImageIcon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  return <img src={url} alt="" onClick={onClick} className={`object-cover rounded ${className ?? ""} ${onClick ? "cursor-pointer" : ""}`} />;
};