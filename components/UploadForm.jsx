"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, getDocs } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

const CONSENT_KEY = "lumina_research_consent";
const HISTORY_KEY = "lumina_history";

function hasResearchConsent(user) {
  try {
    const key = `${CONSENT_KEY}:${String(user?.email || "").trim().toLowerCase()}`;
    return localStorage.getItem(key) === "1";
  } catch { return false; }
}

function rememberLocally(record) {
  try {
    const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    const next = [{ id: `local-${record.ts}`, ...record }, ...existing.filter((x) => x.ts !== record.ts)].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {}
}

export default function UploadForm() {
  const router = useRouter();

  const save = async (data, photos = []) => {
    const user = auth.currentUser;
    const ts = Date.now();
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
      ts,
      uid: user?.uid || null,
    };

    // Local persistence is immediate, so the report/history UI does not depend
    // on network latency or a Firestore write finishing first.
    rememberLocally(record);
    try {
      localStorage.setItem("lumina_last", JSON.stringify(record));
      sessionStorage.setItem("lumina_scan_complete", "1");
    } catch {}

    // Firestore remains the durable cross-device history store.
    if (user) {
      try {
        await addDoc(collection(db, "users", user.uid, "history"), record);
      } catch (e) {
        console.error("DB write failed", e);
      }
    }

    // Only send research telemetry when the user explicitly opted in.
    if (user && hasResearchConsent(user)) {
      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : {};

        let priorScans = 0;
        try {
          const historySnap = await getDocs(collection(db, "users", user.uid, "history"));
          priorScans = historySnap.size;
        } catch {}

        const payload = {
          consent: true,
          user: {
            uid: user.uid,
            name: profile.name || user.displayName || "Unknown",
            username: profile.username || "—",
            email: user.email || profile.email || "—",
            status: priorScans > 1 ? "OLD USER" : "NEW USER",
            timestamp: new Date(ts).toISOString(),
          },
          analysis: {
            numeric: data.numeric,
            tier: data.tier,
            shape: data.shape,
            confidence: data.confidence,
          },
          photos: photos.slice(0, 3),
        };

        // Do not block the result page on Telegram delivery.
        const idToken = await user.getIdToken();
        fetch("/api/telegram/research", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(payload),
        }).catch((e) => console.error("Research delivery failed", e));
      } catch (e) {
        console.error("Could not prepare research delivery", e);
      }
    }

    router.replace("/dashboard/results");
  };

  return <CameraAnalyzer onResult={save} />;
}
