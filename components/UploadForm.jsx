"use client";
import { useState } from "react";
import { analyzeFace } from "@/lib/faceAnalysis";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

export default function UploadForm() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();

  const save = async data => {
    if (!data) return setError("No face detected. Use a clear, front-facing photo with good lighting.");
    const record = { ...data, ts: Date.now() };
    // Results must remain usable even if Firestore is unavailable/misconfigured.
    localStorage.setItem("lumina_last", JSON.stringify(record));
    if (auth.currentUser) {
      try { await addDoc(collection(db, "users", auth.currentUser.uid, "history"), record); }
      catch { /* local result still works */ }
    }
    router.push("/dashboard/results");
  };

  const handleUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return setError("Please choose an image under 10 MB.");
    setError(""); setLoading(true); setStatus("Loading face model…");
    const url = URL.createObjectURL(file); setPreview(url);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("Image could not be loaded")); });
      setStatus("Detecting face landmarks…");
      const result = await analyzeFace(img);
      setStatus(result ? "Calculating proportions…" : "No face detected");
      await save(result);
    } catch { setError("Analysis failed. Try another front-facing image."); }
    finally { setLoading(false); setStatus(""); }
  };

  return <div className="space-y-5">
    <div className="glass p-6">
      <div className="text-center border border-dashed border-white/20 rounded-2xl p-8">
        <div className="text-4xl mb-3">✦</div>
        <h2 className="text-xl font-bold">Upload a front-facing photo</h2>
        <p className="text-sm text-white/55 mt-2">Clear lighting • neutral expression • face unobstructed</p>
        <input id="lumina-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
        <label htmlFor="lumina-upload" className="btn-neon inline-block mt-5 cursor-pointer">{loading ? "Analyzing…" : "Choose photo"}</label>
        {preview && <img src={preview} alt="Selected preview" className="mt-6 max-h-72 mx-auto rounded-2xl object-contain" />}
        {loading && <><p className="mt-4 text-sm text-cyan-200">{status}</p><div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-2/3 bg-gradient-to-r from-fuchsia-500 to-cyan-400 animate-pulse" /></div></>}
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </div>
    </div>
    <CameraAnalyzer onResult={save} />
  </div>;
}
