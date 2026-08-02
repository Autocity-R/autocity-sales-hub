import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Field, LineRow, EditLine } from "@/pages/werkplaats/WerkplaatsFactuurNieuw";

const Harness: React.FC = () => {
  const [name, setName] = useState("");
  const [lines, setLines] = useState<EditLine[]>([
    { id: "a", kind: "arbeid", description: "", uren: 1, tarief: 85, factor: 1, amount: 85 },
    { id: "b", kind: "onderdeel", description: "", qty: 1, unitPrice: 0, amount: 0 },
  ]);
  const patch = useCallback((id: string, p: Partial<EditLine>) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l))), []);
  const noop = useCallback(() => {}, []);
  return (
    <div style={{ padding: 20 }}>
      <div data-testid="name"><Field label="Naam" value={name} onChange={setName} /></div>
      {lines.map((l) => <LineRow key={l.id} line={l} onPatch={patch} onRemove={noop} onDuplicate={noop} />)}
    </div>
  );
};
createRoot(document.getElementById("root")!).render(<Harness />);
