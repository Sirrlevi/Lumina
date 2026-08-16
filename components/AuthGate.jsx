"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export default function AuthGate({ children }) {
  const router = useRouter();
  const [state, setState] = useState("checking");
  useEffect(() => { const unsub = onAuthStateChanged(auth, user => {
    if (user) { setState("ready"); }
    else { setState("redirecting"); router.replace("/login"); }
  }); return () => unsub(); }, [router]);
  if (state !== "ready") return <div className="glass p-8 max-w-lg mx-auto text-center mt-12"><div className="lumina-spinner mx-auto"/><p className="mt-4 text-white/50">Checking your session…</p></div>;
  return children;
}
