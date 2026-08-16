"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function GuestGate({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => { const unsub = onAuthStateChanged(auth, user => {
    if (user) router.replace("/dashboard/upload");
    else setReady(true);
  }); return () => unsub(); }, [router]);
  if (!ready) return <div className="glass p-8 max-w-md mx-auto mt-12 text-center"><div className="lumina-spinner mx-auto"/><p className="mt-4 text-white/50">Loading…</p></div>;
  return children;
}
