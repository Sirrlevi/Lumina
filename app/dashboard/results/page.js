"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import ResultCard from "@/components/ResultCard";
import PlanGenerator from "@/components/PlanGenerator";

export default function Results() {
  const [data, setData] = useState(undefined);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      try {
        const raw = localStorage.getItem("lumina_last");
        const parsed = raw ? JSON.parse(raw) : null;
        // A saved result only belongs on screen if it was produced by the
        // person currently signed in — otherwise this is stale data left
        // behind by a different account on this device.
        setData(parsed && user && parsed.uid === user.uid ? parsed : null);

        // Avoid useSearchParams() here: this page is statically prerendered by
        // Next.js, and useSearchParams requires a Suspense boundary. A one-shot
        // session flag gives us the same UX without forcing a CSR bailout.
        const completed = sessionStorage.getItem("lumina_scan_complete");
        if (completed === "1") {
          setJustCompleted(true);
          sessionStorage.removeItem("lumina_scan_complete");
        }
      } catch {
        setData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthGate>
      {data === undefined ? (
        <div className="glass p-8 text-center">
          <div className="lumina-spinner mx-auto" />
          <p className="mt-4 text-white/50">Loading your result…</p>
        </div>
      ) : !data ? (
        <div className="glass p-8 text-center max-w-xl mx-auto">
          <h1 className="text-2xl font-bold">No analysis yet</h1>
          <p className="text-white/50 mt-2">Complete a scan and your full report will appear here.</p>
          <Link href="/dashboard/upload" className="btn-neon inline-flex mt-5">Start analysis</Link>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-5 pb-12">
          {justCompleted && (
            <div className="result-arrival rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-3 text-sm text-emerald-200/90">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-300 mr-2 animate-pulse" />
              Scan complete · your report and improvement plan are ready.
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="eyebrow">YOUR REPORT</p>
              <h1 className="text-3xl sm:text-4xl font-black mt-1">Face analysis</h1>
              <p className="text-sm text-white/40 mt-2">
                Scanned {new Date(data.analyzedAt || data.ts || Date.now()).toLocaleString()}
              </p>
            </div>
            <Link href="/dashboard/upload" className="text-cyan-300 text-sm hover:text-cyan-200">
              Analyze another photo →
            </Link>
          </div>

          <ResultCard data={data} />
          <PlanGenerator data={data} rating={data.numeric} />
        </div>
      )}
    </AuthGate>
  );
}
