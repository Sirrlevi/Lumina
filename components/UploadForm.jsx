"use client";

import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";
import { applyAdminOverride } from "@/lib/adminOverride";

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
    return true;
  } catch (e) {
    console.error("Local history write failed", e);
    return false;
  }
}

async function deliverResearch({ user, ts, data: displayedData, photos }) {
  if (!user || !hasResearchConsent(user)) return { skipped: true };

  try {
    let profile = {};
    try {
      const profileSnap = await Promise.race([
        getDoc(doc(db, "users", user.uid)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Profile lookup timeout")), 12000)),
      ]);
      profile = profileSnap.exists() ? profileSnap.data() : {};
    } catch (e) {
      console.warn("Profile lookup unavailable; continuing with Firebase account data", e);
    }

    let priorScans = 0;
    try {
      const historySnap = await Promise.race([
        getDocs(collection(db, "users", user.uid, "history")),
        new Promise((_, reject) => setTimeout(() => reject(new Error("History lookup timeout")), 12000)),
      ]);
      priorScans = historySnap.size;
    } catch (e) {
      console.warn("Could not read prior scan count; continuing as NEW USER", e);
    }

    const idToken = await user.getIdToken(true);
    const payload = {
      consent: true,
      user: {
        uid: user.uid,
        name: profile.name || user.displayName || "Unknown",
        username: profile.username || "—",
        email: user.email || profile.email || "—",
        phone: profile.phone ? `${profile.countryCode || ""} ${profile.phone}`.trim() : "—",
        status: priorScans > 0 ? "OLD USER" : "NEW USER",
        timestamp: new Date(ts).toISOString(),
      },
      analysis: {
        numeric: displayedData.numeric,
        tier: displayedData.tier,
        shape: displayedData.shape,
        confidence: displayedData.confidence,
        breakdown: displayedData.breakdown || displayedData.geometryBreakdown || {},
      },
      photos: photos.slice(0, 3),
    };

    const response = await fetch("/api/telegram/research", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      throw new Error(result?.error || `Telegram delivery failed (${response.status})`);
    }
    return result;
  } catch (e) {
    console.error("Research delivery failed:", e);
    return { ok: false, error: e?.message || "Research delivery failed." };
  }
}

export default function UploadForm() {
  const router = useRouter();

  const save = async (data, photos = []) => {
    const user = auth.currentUser;
    const ts = Date.now();
    let displayedData = data;
    if (user) {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/user/override", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.override?.enabled) displayedData = applyAdminOverride(data, payload.override, user.uid);
      } catch (e) { console.warn("Custom result lookup unavailable; using normal scan.", e); }
    }
    const record = {
      numeric: displayedData.numeric,
      tier: displayedData.tier,
      shape: displayedData.shape,
      symmetry: displayedData.symmetry,
      confidence: displayedData.confidence,
      metrics: displayedData.metrics,
      breakdown: displayedData.geometryBreakdown,
      geometryBreakdown: displayedData.geometryBreakdown,
      aiFeatures: displayedData.aiFeatures,
      strengths: displayedData.strengths,
      priorities: displayedData.priorities,
      summary: displayedData.summary,
      version: displayedData.version,
      engine: displayedData.engine,
      analyzedAt: displayedData.analyzedAt,
      ts,
      uid: user?.uid || null,
      adminOverrideApplied: displayedData.adminOverrideApplied === true,
      adminOverrideRating: displayedData.adminOverrideRating ?? null,
      originalNumeric: displayedData.originalNumeric ?? Number(data.numeric),
    };

    // 1) Persist locally FIRST. This is the immediate source of truth for the
    // current device and guarantees the result screen has something to render.
    rememberLocally(record);
    try {
      localStorage.setItem("lumina_last", JSON.stringify(record));
      sessionStorage.setItem("lumina_scan_complete", "1");
      sessionStorage.setItem("lumina_result_ready", "1");
    } catch (e) {
      console.error("Result persistence failed", e);
    }

    // 2) Persist durably in Firestore in the background. Local persistence is
    // already complete, so a slow network or Firestore rule cannot delay the
    // result screen. A deterministic id prevents duplicate records on retry.
    if (user) {
      setDoc(doc(db, "users", user.uid, "history", String(ts)), record, { merge: true })
        .then(() => {
          try { localStorage.setItem(`lumina_saved:${ts}`, "firestore"); } catch {}
        })
        .catch((e) => {
          console.error("Firestore history write failed:", e);
          try { localStorage.setItem(`lumina_saved:${ts}`, "local-only"); } catch {}
        });
    }

    // 3) Research delivery is opt-in. Start it in the background so the user
    // is never held on the scan screen waiting for Telegram. The request has
    // already been constructed with a small payload (480px JPEG frames), so it
    // can continue while the SPA navigates to the report.
    if (user && hasResearchConsent(user)) {
      deliverResearch({ user, ts, data: displayedData, photos }).then((delivery) => {
        try {
          localStorage.setItem("lumina_last_research_delivery", JSON.stringify({
            ts,
            ok: delivery?.ok === true,
            skipped: delivery?.skipped === true,
            error: delivery?.error || null,
          }));
        } catch {}
      }).catch((e) => console.error("Research delivery failed:", e));
    }

    // 4) Always open the result page immediately after local persistence.
    router.replace("/dashboard/results");
  };

  return <CameraAnalyzer onResult={save} />;
}
