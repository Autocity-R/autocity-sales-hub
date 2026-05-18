/**
 * Extracts JPEG frames from a video file client-side.
 * Frames are evenly distributed across the video duration, capped at maxFrames.
 */
export interface ExtractedFrame {
  index: number;          // 0-based
  filename: string;       // frame_001.jpg
  blob: Blob;             // jpeg blob
  timestamp: number;      // seconds in video
}

export interface FrameExtractionResult {
  frames: ExtractedFrame[];
  duration: number;
  fps: number;
}

export async function extractFramesFromVideo(
  file: File,
  opts: {
    maxFrames?: number;
    targetFps?: number;
    maxWidth?: number;
    jpegQuality?: number;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<FrameExtractionResult> {
  const maxFrames = opts.maxFrames ?? 60;
  const targetFps = opts.targetFps ?? 2;
  const maxWidth = opts.maxWidth ?? 1280;
  const quality = opts.jpegQuality ?? 0.82;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Kon video niet laden"));
  });

  const duration = video.duration;
  if (!isFinite(duration) || duration <= 0) {
    URL.revokeObjectURL(url);
    throw new Error("Ongeldige video duur");
  }

  const targetFrames = Math.min(maxFrames, Math.max(1, Math.floor(duration * targetFps)));
  const interval = duration / targetFrames;

  // Scale canvas to maxWidth
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const scale = vw > maxWidth ? maxWidth / vw : 1;
  const cw = Math.round(vw * scale);
  const ch = Math.round(vh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context niet beschikbaar");

  const frames: ExtractedFrame[] = [];

  for (let i = 0; i < targetFrames; i++) {
    const t = Math.min(duration - 0.05, i * interval + interval / 2);
    await seekVideo(video, t);
    ctx.drawImage(video, 0, 0, cw, ch);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Geen blob"))),
        "image/jpeg",
        quality
      );
    });
    const idx = i + 1;
    frames.push({
      index: idx,
      filename: `frame_${String(idx).padStart(3, "0")}.jpg`,
      blob,
      timestamp: t,
    });
    opts.onProgress?.(idx, targetFrames);
  }

  URL.revokeObjectURL(url);
  return { frames, duration, fps: targetFrames / duration };
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onErr);
      reject(new Error("Seek error"));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onErr);
    video.currentTime = time;
  });
}