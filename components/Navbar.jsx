"use client";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
export default function Navbar() { const [u,setU]=useState(null); useEffect(()=>onAuthStateChanged(auth,setU),[]); return <nav className="flex items-center justify-between gap-4 p-4 glass mb-6"><Link href="/" className="font-black tracking-widest">LUMINA</Link>{u?<div className="flex items-center gap-4 text-sm"><Link href="/dashboard/upload">Analyze</Link><Link href="/dashboard/results">Results</Link><Link href="/dashboard/plans">Plans</Link><Link href="/profile">Profile</Link><button onClick={()=>signOut(auth)} className="text-white/50">Logout</button></div>:<div className="flex gap-3"><Link href="/login">Login</Link><Link href="/register" className="text-cyan-300">Sign up</Link></div>}</nav>; }
