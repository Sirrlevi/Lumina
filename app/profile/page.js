"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import AuthGate from "@/components/AuthGate";

function readLocalHistory(uid) {
  try {
    const rows = JSON.parse(localStorage.getItem("lumina_history") || "[]");
    return rows
      .filter((x) => x?.uid === uid)
      .sort((a, b) => (b?.ts || 0) - (a?.ts || 0));
  } catch {
    return [];
  }
}

function mergeHistory(remote, local) {
  const map = new Map();
  [...remote, ...local].forEach((item) => {
    const key = String(item?.ts || item?.id || Math.random());
    if (!map.has(key)) map.set(key, item);
  });
  return [...map.values()].sort((a, b) => (b?.ts || 0) - (a?.ts || 0));
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remoteState, setRemoteState] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (cancelled) return;
      setUser(u);

      if (!u) {
        setHistory([]);
        setLoading(false);
        setRemoteState("signed-out");
        return;
      }

      // Show local history immediately. The UI must never sit on "Loading
      // history..." just because Firestore is slow or rules reject a query.
      const local = readLocalHistory(u.uid);
      setHistory(local);
      setLoading(false);
      setRemoteState("loading");

      try {
        const q = query(collection(db, "users", u.uid, "history"), orderBy("ts", "desc"));
        const remote = await Promise.race([
          getDocs(q),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore history timeout")), 5000)),
        ]);
        if (cancelled) return;
        const rows = remote.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistory(mergeHistory(rows, readLocalHistory(u.uid)));
        setRemoteState("connected");
      } catch (e) {
        if (cancelled) return;
        console.error("History read failed:", e);
        setHistory(readLocalHistory(u.uid));
        setRemoteState("local-only");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return (
    <AuthGate>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="glass p-6 sm:p-8">
          <p className="eyebrow">ACCOUNT</p>
          <h1 className="text-2xl sm:text-3xl font-black mt-1 break-words">{user?.displayName || "LUMINA user"}</h1>
          <p className="text-white/50 mt-1 break-all">{user?.email}</p>
        </div>

        <div className="glass p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Analysis history</h2>
            <span className="text-xs text-white/35">{history.length} saved</span>
          </div>

          {loading ? (
            <p className="text-white/40 mt-4">Loading history…</p>
          ) : history.length === 0 ? (
            <div className="mt-4">
              <p className="text-white/45">No saved analyses yet. Run your first analysis.</p>
              {remoteState === "local-only" && <p className="text-xs text-amber-200/50 mt-2">Cloud history is unavailable right now; local history is still working.</p>}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {history.map((x) => (
                <div key={x.id || x.ts} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 p-4">
                  <span className="text-sm text-white/55">{x.ts ? new Date(x.ts).toLocaleString() : "—"}</span>
                  <b>{x.numeric}/10 · {x.tier} · {x.shape}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
