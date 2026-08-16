"use client";
import { useRef, useState } from "react";
import { analyzeFace, normalizeImage } from "@/lib/faceAnalysis";
import { analyzeWithAI } from "@/lib/aiAnalysis";

export default function CameraAnalyzer({ onResult }) {
  const video = useRef(null), stream = useRef(null);
  const [active, setActive] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const start = async () => {
    setError("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false });
      video.current.srcObject = stream.current; await video.current.play(); setActive(true);
    } catch { setError("Camera permission was denied or the camera is unavailable."); }
  };
  const analyze = async () => {
    if (!video.current?.videoWidth || busy) return;
    setBusy(true); setError("");
    try {
      const canvas = document.createElement("canvas"); canvas.width = video.current.videoWidth; canvas.height = video.current.videoHeight;
      canvas.getContext("2d").drawImage(video.current, 0, 0);
      const result = await analyzeFace(canvas);
      if (result) {
        const ai = await analyzeWithAI(await normalizeImage(canvas), result.metrics);
        await onResult({ ...result, numeric:ai.numeric, tier:ai.tier, summary:ai.summary, strengths:ai.strengths, priorities:ai.priorities, confidence:ai.confidence, aiFeatures:ai.aiFeatures, breakdown:{harmony:ai.aiFeatures.harmony,symmetry:ai.aiFeatures.symmetry,jawline:ai.aiFeatures.jawline,cheekbones:ai.aiFeatures.cheekbones,eyeArea:ai.aiFeatures.eyeArea,canthalTilt:ai.aiFeatures.canthalTilt,facialProportions:ai.aiFeatures.facialProportions,midface:ai.aiFeatures.midface,nose:ai.aiFeatures.nose,lips:ai.aiFeatures.lips,skinPresentation:ai.aiFeatures.skinPresentation}, geometryBreakdown:result.breakdown, version:ai.version });
      } else setError("No face detected. Move into the frame and try again.");
    } catch { setError("Camera analysis failed. Try again."); }
    finally { setBusy(false); }
  };
  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setActive(false); };
  return <div className="glass p-5">
    <div className="flex items-center justify-between"><div><h3 className="font-bold">Live camera</h3><p className="text-xs text-white/50">Optional • visible camera analysis</p></div>{active && <span className="text-xs text-emerald-300">● camera on</span>}</div>
    <video ref={video} muted playsInline className={`w-full rounded-2xl mt-4 ${active ? "block" : "hidden"}`} />
    {!active ? <button onClick={start} className="btn-neon w-full mt-4">Use camera</button> : <div className="grid grid-cols-2 gap-3 mt-4"><button onClick={analyze} disabled={busy} className="btn-neon disabled:opacity-50">{busy ? "Analyzing…" : "Analyze frame"}</button><button onClick={stop} className="rounded-xl bg-white/10">Stop</button></div>}
    {error && <p className="text-sm text-rose-300 mt-3">{error}</p>}
  </div>;
}
