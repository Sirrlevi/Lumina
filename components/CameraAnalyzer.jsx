"use client";
import { useEffect, useRef, useState } from "react";
import { analyzeFace } from "@/lib/faceAnalysis";

const STAGES = ["Preparing scan", "Loading face mesh", "Mapping landmarks", "Measuring structure", "Calibrating PSL score", "Building report"];
const CHAINS = [[10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],[454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,378],[378,400],[400,377],[377,152],[152,148],[148,176],[176,149],[149,150],[150,136],[136,172],[172,58],[58,132],[132,93],[93,234],[234,127],[127,162],[162,21],[21,54],[54,103],[103,67],[67,109],[109,10]];
const FEATURES = [[33,133],[362,263],[105,159],[334,386],[61,291],[129,358],[172,397],[127,356]];

function drawOverlay(canvas, landmarks, scan, phase) {
  if (!canvas || !landmarks?.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const p = (i) => ({ x: landmarks[i].x * w, y: landmarks[i].y * h });

  ctx.lineWidth = Math.max(1.2, w / 520);
  ctx.strokeStyle = scan ? "rgba(76,231,255,.85)" : "rgba(76,231,255,.55)";
  ctx.shadowBlur = scan ? 8 : 3;
  ctx.shadowColor = "rgba(76,231,255,.7)";
  ctx.beginPath();
  for (const [a, b] of CHAINS) { const A = p(a), B = p(b); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,91,210,.8)";
  ctx.shadowColor = "rgba(255,91,210,.6)";
  ctx.beginPath();
  for (const [a, b] of FEATURES) { const A = p(a), B = p(b); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = scan ? "rgba(255,255,255,.95)" : "rgba(90,220,255,.8)";
  for (let i = 0; i < landmarks.length; i += scan ? 4 : 7) {
    const q = p(i);
    ctx.beginPath();
    ctx.arc(q.x, q.y, scan ? 1.7 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const nose = p(1), chin = p(152), l = p(234), r = p(454);
  ctx.strokeStyle = "rgba(255,255,255,.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(nose.x, Math.max(0, nose.y - 18));
  ctx.lineTo(nose.x, Math.min(h, nose.y + 42));
  ctx.moveTo(l.x, nose.y);
  ctx.lineTo(r.x, nose.y);
  ctx.stroke();

  if (scan) {
    const y = ((phase % 100) / 100) * h;
    ctx.strokeStyle = "rgba(78,241,255,.95)";
    ctx.shadowBlur = 16;
    ctx.shadowColor = "rgba(78,241,255,.9)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// Maps a getUserMedia() failure to an accurate message instead of one
// catch-all "permission denied" string that hides the real cause.
function describeCameraError(e) {
  switch (e?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera permission was denied. Allow camera access for this site in your browser settings and try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
      return "The camera is already in use by another app. Close it and try again.";
    default:
      return `Could not start the camera${e?.message ? `: ${e.message}` : "."}`;
  }
}

export default function CameraAnalyzer({ onResult }) {
  const video = useRef(null), canvas = useRef(null), stream = useRef(null), raf = useRef(null);
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");

  const captureFrame = () => {
    const v = video.current;
    if (!v?.videoWidth || !v?.videoHeight) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  };

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(raf.current);
    };
  }, []);

  useEffect(() => {
    if (!canvas.current || !landmarks) return;
    const c = canvas.current;
    const v = video.current;
    if (v?.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
    let frame = 0;
    const loop = () => {
      drawOverlay(c, landmarks, scanning, frame++ % 100);
      if (scanning) raf.current = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf.current);
  }, [landmarks, scanning]);

  const start = async () => {
    setError("");
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      // video/canvas are now ALWAYS mounted in the JSX below (just hidden via
      // CSS when inactive), so this ref is guaranteed to exist here. Previously
      // <video> only mounted after setActive(true), so video.current was still
      // null at this point -> srcObject assignment threw -> caught below and
      // mislabeled as a permission error even when permission was granted fine.
      if (!video.current) throw new Error("Video element not ready. Please retry.");
      stream.current = mediaStream;
      video.current.srcObject = mediaStream;
      await video.current.play();
      setActive(true);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setError(describeCameraError(e));
    }
  };

  const scan = async () => {
    if (!video.current?.videoWidth || scanning) return;
    setScanning(true);
    setProgress(4);
    setStage(0);
    setError("");
    try {
      const photos = [];
      const captured = new Set();
      const captureAt = (threshold) => {
        if (captured.has(threshold)) return;
        const frame = captureFrame();
        if (frame) { photos.push(frame); captured.add(threshold); }
      };

      // These are ordinary camera frames, not screenshots of the web app.
      // They are retained only in memory and are handed to UploadForm, which
      // sends them onward only when explicit research consent is enabled.
      captureAt(0);

      const result = await analyzeFace(
        video.current,
        ({ step, progress }) => {
          setStage(Math.max(0, Math.min(STAGES.length - 1, step - 1)));
          setProgress(progress);
          if (progress >= 35) captureAt(35);
          if (progress >= 70) captureAt(70);
        },
        setLandmarks
      );
      setProgress(100);
      captureAt(100);
      await new Promise((r) => setTimeout(r, 350));
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      setActive(false);
      await onResult(result, photos);
    } catch (e) {
      setError(e?.message || "Face analysis failed. Try again.");
      setScanning(false);
    }
  };

  return (
    <div className="glass p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Live camera scan</h2>
          <p className="text-sm text-white/45 mt-1">Camera-only • nothing is uploaded for model analysis</p>
        </div>
        {active && <span className="text-xs text-emerald-300">● camera on</span>}
      </div>

      <div className="relative mt-5 overflow-hidden rounded-3xl bg-black/30 border border-white/10 min-h-[260px]">
        <video
          ref={video}
          muted
          playsInline
          className={`block w-full h-auto scale-x-[-1] ${active ? "" : "hidden"}`}
        />
        <canvas
          ref={canvas}
          className={`absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none ${active ? "" : "hidden"}`}
        />
        {!active && (
          <div className="min-h-[260px] grid place-items-center p-8 text-center">
            <div>
              <div className="text-4xl">◉</div>
              <p className="font-semibold mt-3">Center your face in the frame</p>
              <p className="text-sm text-white/40 mt-1">Good lighting • straight head • full face visible</p>
            </div>
          </div>
        )}
      </div>

      {!active ? (
        <button onClick={start} className="btn-neon w-full mt-4">Start camera</button>
      ) : (
        <button onClick={scan} disabled={scanning} className="btn-neon w-full mt-4 disabled:opacity-60">
          {scanning ? `Scanning… ${progress}%` : "Start face scan"}
        </button>
      )}

      {scanning && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/50">
            <span>{STAGES[stage]}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {STAGES.map((s, i) => (
              <div
                key={s}
                className={`text-[10px] rounded-lg px-2 py-2 border ${i <= stage ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" : "border-white/5 text-white/25"}`}
              >
                {i + 1}. {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!scanning && active && (
        <p className="text-center text-xs text-white/35 mt-4">
          The camera stops automatically when the scan and report are complete.
        </p>
      )}
    </div>
  );
}
