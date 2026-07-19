import { useEffect, useRef } from "react";

interface SignaturePadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  background?: string;
  className?: string;
}

/**
 * Simple pointer-driven signature canvas.
 * - pointerdown / pointermove / pointerup drawing
 * - lineWidth 2, round caps/joins
 * - touch-none via CSS so tablets work
 * - onChange emits a PNG data-URL after each stroke; null after wissen
 * - When `value` is supplied and the canvas is empty, it is drawn as an image
 *   so existing signatures re-appear on mount.
 */
export function SignaturePad({
  value,
  onChange,
  width = 720,
  height = 220,
  strokeColor = "#111",
  background = "#fff",
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  // Load existing value into the canvas once, if any
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        hasStrokeRef.current = true;
      };
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = strokeColor;

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      };
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      drawingRef.current = true;
      hasStrokeRef.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    };
    const move = (e: PointerEvent) => {
      if (!drawingRef.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const up = () => {
      if (!drawingRef.current) return;
      drawingRef.current = false;
      onChange(canvas.toDataURL("image/png"));
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerleave", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [strokeColor, onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokeRef.current = false;
    onChange(null);
  };

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: "100%",
          height,
          background,
          borderRadius: 4,
          touchAction: "none",
          cursor: "crosshair",
          border: "1px solid rgba(0,0,0,0.15)",
          display: "block",
        }}
      />
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={clear}
          style={{
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.15)",
            color: "inherit",
            padding: "6px 12px",
            fontSize: 12,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Wissen
        </button>
      </div>
    </div>
  );
}

export default SignaturePad;