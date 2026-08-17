"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function HeroCTA() {
  const [u, setU] = useState(undefined);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setU);
    return () => unsub();
  }, []);

  // Auth state not resolved yet: reserve the same space, show nothing yet
  // so a logged-in visitor never sees the guest buttons flash first.
  if (u === undefined) {
    return <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8 invisible" aria-hidden="true">
      <span className="btn-neon">Start free analysis</span>
      <span className="rounded-xl px-5 py-3 border border-white/10 bg-white/5">Log in</span>
    </div>;
  }

  if (u) {
    return <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
      <Link href="/dashboard/upload" className="btn-neon">Go to dashboard</Link>
      <Link href="/dashboard/results" className="rounded-xl px-5 py-3 border border-white/10 bg-white/5">View results</Link>
    </div>;
  }

  return <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
    <Link href="/register" className="btn-neon">Start free analysis</Link>
    <Link href="/login" className="rounded-xl px-5 py-3 border border-white/10 bg-white/5">Log in</Link>
  </div>;
}
