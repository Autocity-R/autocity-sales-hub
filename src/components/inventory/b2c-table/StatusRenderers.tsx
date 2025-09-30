
import React from "react";
import { Badge } from "@/components/ui/badge";

export const renderImportStatus = (status: string) => {
  switch (status) {
    case "niet_gestart":
      return <Badge variant="outline" className="bg-gray-100">Niet gestart</Badge>;
    case "aanvraag_ontvangen":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Aanvraag ontvangen</Badge>;
    case "goedgekeurd":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Goedgekeurd</Badge>;
    case "bpm_betaald":
      return <Badge variant="outline" className="bg-purple-100 text-purple-800">BPM Betaald</Badge>;
    case "herkeuring":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Herkeuring</Badge>;
    case "ingeschreven":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Ingeschreven</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const renderWorkshopStatus = (status: string) => {
  switch (status) {
    case "wachten":
      return <Badge variant="outline" className="bg-gray-100">Wachten</Badge>;
    case "poetsen":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Poetsen</Badge>;
    case "spuiten":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Spuiten</Badge>;
    case "gereed":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Gereed</Badge>;
    case "klaar_voor_aflevering":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Klaar voor aflevering</Badge>;
    case "in_werkplaats":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">In werkplaats</Badge>;
    case "wacht_op_onderdelen":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Wacht op onderdelen</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const renderPaintStatus = (status?: string) => {
  switch (status) {
    case "geen_behandeling":
      return <Badge variant="outline" className="bg-gray-100">Geen behandeling</Badge>;
    case "hersteld":
      return <Badge variant="outline" className="bg-green-100 text-green-800">Hersteld</Badge>;
    case "in_behandeling":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">In behandeling</Badge>;
    default:
      return <Badge variant="outline">-</Badge>;
  }
};

export const renderLocationStatus = (status: string) => {
  switch (status) {
    case "showroom":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Showroom</Badge>;
    case "opslag":
      return <Badge variant="outline" className="bg-gray-100">Opslag</Badge>;
    case "werkplaats":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800">Werkplaats</Badge>;
    case "poetser":
      return <Badge variant="outline" className="bg-cyan-100 text-cyan-800">Poetser</Badge>;
    case "spuiter":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Spuiter</Badge>;
    case "onderweg":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800">Onderweg</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
