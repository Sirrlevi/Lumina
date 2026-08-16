"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

export default function UploadForm() {
  const router = useRouter();

  const save = async (data) => {
    const user = auth.currentUser;
    const record = {
      numeric: data.numeric,
      tier: data.tier,
      shape: data.shape,
      symmetry: data.symmetry,
      confidence: data.confidence,
      metrics: data.metrics,
      breakdown: data.geometryBreakdown,
      geometryBreakdown: data.geometryBreakdown,
      aiFeatures: data.aiFeatures,
      strengths: data.strengths,
      priorities: data.priorities,
      summary: data.summary,
      version: data.version,
      engine: data.engine,
      analyzedAt: data.analyzedAt,
      ts: Date.now(),
      uid: user?.uid || null,
    };

    // The results screen should never wait on a remote database write.
    // Local storage is the source used by the results UI; Firestore history
    // is best-effort and can finish after navigation.
    try {
      localStorage.setItem("lumina_last", JSON.stringify(record));
      sessionStorage.setItem("lumina_scan_complete", "1");
    } catch {}

    router.replace("/dashboard/results");

    if (user) {
      try {
        await addDoc(collection(db, "users", user.uid, "history"), record);
      } catch (e) {
        console.error("DB write failed", e);
      }
    }
  };

  return <CameraAnalyzer onResult={save} />;
}
