import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import html2pdf from "html2pdf.js";
import {
  ContractDocumentV2,
  ContractV2Snapshot,
} from "@/components/contracts/ContractDocumentV2";
import {
  fetchContractByToken,
  submitContractSignature,
} from "@/services/contractV2Service";

type Status =
  | "loading"
  | "ready"
  | "signing"
  | "done"
  | "error"
  | "expired"
  | "already_signed";

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [contract, setContract] = useState<ContractV2Snapshot | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [buyerSigDataUrl, setBuyerSigDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await fetchContractByToken(token);
      if ((res as any).error) {
        setErrorMsg((res as any).error);
        setStatus("error");
        return;
      }
      const d = (res as any).data;
      if (d?.error) {
        if (d.error === "expired") setStatus("expired");
        else if (d.error === "already_signed") setStatus("already_signed");
        else {
          setErrorMsg(d.error);
          setStatus("error");
        }
        return;
      }
      const c = d as any;
      const cust = c.customer_snapshot || {};
      setSignerName(
        cust.companyName ||
          [cust.firstName, cust.lastName].filter(Boolean).join(" ") ||
          "",
      );
      setSignerEmail(cust.email || "");
      setContract(c as ContractV2Snapshot);
      setStatus("ready");
    })();
  }, [token]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FF6B00";

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    const down = (e: PointerEvent) => {
      drawingRef.current = true;
      hasStrokeRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const up = () => {
      drawingRef.current = false;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerleave", up);
    };
  }, [status]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
  };

  const handleSign = async () => {
    if (!token || !contract) return;
    if (!hasStrokeRef.current) {
      alert("Zet uw handtekening in het vak.");
      return;
    }
    if (!signerName.trim()) {
      alert("Vul uw naam in.");
      return;
    }
    setStatus("signing");

    const canvas = canvasRef.current!;
    const dataUrl = canvas.toDataURL("image/png");
    setBuyerSigDataUrl(dataUrl);

    // Wait a tick so the document re-renders with the buyer signature
    await new Promise((r) => setTimeout(r, 100));

    const el = docRef.current;
    if (!el) {
      setErrorMsg("document_not_ready");
      setStatus("error");
      return;
    }

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: 0,
        filename: `${contract.contract_number}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: {
          scale: 2,
          backgroundColor: "#080808",
          useCORS: true,
          windowWidth: 794,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      } as any)
      .from(el)
      .outputPdf("blob");

    const b64 = await blobToBase64(pdfBlob);

    const res = await submitContractSignature({
      token,
      signature_data_url: dataUrl,
      pdf_base64: b64,
      signer_name: signerName,
      signer_email: signerEmail,
    });
    const anyRes = res as any;
    if (anyRes.error) {
      setErrorMsg(anyRes.error);
      setStatus("error");
      return;
    }
    setPdfUrl(anyRes.pdf_url ?? null);
    setStatus("done");
  };

  if (status === "loading") return <CenterMsg>Contract laden…</CenterMsg>;
  if (status === "expired")
    return (
      <CenterMsg>
        De ondertekenlink is verlopen (48 uur). Neem contact op met uw
        contactpersoon voor een nieuwe link.
      </CenterMsg>
    );
  if (status === "already_signed")
    return <CenterMsg>Dit contract is reeds ondertekend.</CenterMsg>;
  if (status === "error")
    return <CenterMsg>Er ging iets mis: {errorMsg}</CenterMsg>;

  if (!contract) return null;

  return (
    <div style={{ background: "#0b0b0b", minHeight: "100vh" }}>
      <div ref={docRef}>
        <ContractDocumentV2
          data={{
            ...contract,
            buyer_signature_data_url: buyerSigDataUrl,
          }}
        />
      </div>

      {status !== "done" && (
        <div
          style={{
            maxWidth: 794,
            margin: "0 auto 40px",
            padding: 24,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#FF6B00",
              marginBottom: 4,
              letterSpacing: 0.5,
            }}
          >
            DIGITAAL ONDERTEKENEN
          </div>
          <p style={{ fontSize: 13, color: "#aaa", marginTop: 0 }}>
            Zet hieronder uw handtekening. Uw ondertekening heeft dezelfde
            juridische waarde als een handgeschreven handtekening.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>Naam</label>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#888", display: "block", marginBottom: 4 }}>E-mail</label>
              <input
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={720}
            height={200}
            style={{
              width: "100%",
              height: 200,
              background: "#fff",
              borderRadius: 2,
              touchAction: "none",
              cursor: "crosshair",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
            <button onClick={clearCanvas} style={btnGhost}>
              Wissen
            </button>
            <button
              onClick={handleSign}
              disabled={status === "signing"}
              style={btnPrimary}
            >
              {status === "signing" ? "Bezig…" : "Ondertekenen & versturen"}
            </button>
          </div>
        </div>
      )}

      {status === "done" && (
        <div
          style={{
            maxWidth: 794,
            margin: "0 auto 40px",
            padding: 24,
            background: "linear-gradient(90deg,rgba(255,107,0,0.12),rgba(255,107,0,0.04))",
            border: "1px solid rgba(255,107,0,0.3)",
            color: "#fff",
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: "#FF6B00", fontFamily: "'Space Grotesk', sans-serif" }}>
            BEDANKT — CONTRACT ONDERTEKEND
          </div>
          <p style={{ color: "#ccc" }}>
            Uw ondertekende contract is per e-mail verstuurd.
          </p>
          {pdfUrl && (
            <a href={pdfUrl} style={{ ...btnPrimary, display: "inline-block", textDecoration: "none" }}>
              PDF downloaden
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function CenterMsg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 480, textAlign: "center" }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0b0b0b",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "#fff",
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 2,
};
const btnPrimary: React.CSSProperties = {
  background: "#FF6B00",
  color: "#fff",
  border: "none",
  padding: "12px 22px",
  fontWeight: 600,
  fontSize: 13,
  letterSpacing: 0.5,
  cursor: "pointer",
  borderRadius: 2,
};
const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#aaa",
  border: "1px solid rgba(255,255,255,0.15)",
  padding: "12px 18px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 2,
};

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}