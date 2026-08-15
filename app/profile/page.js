"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
export default function Profile() {
  const [user, setUser] = useState(null), [history, setHistory] = useState([]);
  useEffect(() => onAuthStateChanged(auth, async u => { setUser(u); if (u) { try { const q = query(collection(db, "users", u.uid, "history"), orderBy("ts", "desc")); const snap = await getDocs(q); setHistory(snap.docs.map(d => ({id:d.id,...d.data()}))); } catch {} } }), []);
  return <div className="space-y-5"><div className="glass p-6"><p className="text-xs text-cyan-300 uppercase tracking-widest">Profile</p><h1 className="text-2xl font-bold mt-1">{user?.displayName || "LUMINA user"}</h1><p className="text-white/50 mt-1">{user?.email || ""}</p></div><div className="glass p-6"><h2 className="font-bold text-xl">History</h2>{history.length === 0 ? <p className="text-white/45 mt-3">No saved analyses yet.</p> : <div className="mt-4 space-y-2">{history.map(x => <div key={x.id} className="flex justify-between bg-black/20 rounded-xl p-3"><span>{new Date(x.ts).toLocaleDateString()}</span><b>{x.numeric}/10 · {x.tier}</b></div>)}</div>}</div></div>;
}
