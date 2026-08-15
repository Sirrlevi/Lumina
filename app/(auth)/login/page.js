"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GoogleButton from "@/components/GoogleButton";
export default function Login(){
  const [e,setE]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState(""); const r=useRouter();
  const submit=async(ev)=>{ev.preventDefault(); setErr(""); try{await signInWithEmailAndPassword(auth,e,p); r.push("/dashboard/upload");}catch(e){setErr(e.message)}};
  return (<form onSubmit={submit} className="glass p-8 max-w-md mx-auto space-y-4"><h2 className="text-2xl font-bold">Welcome back</h2>{err && <p className="text-red-400 text-sm">{err}</p>}<input type="email" placeholder="Email" className="w-full p-3 bg-black/30 rounded" onChange={ev=>setE(ev.target.value)} required/><input type="password" placeholder="Password" className="w-full p-3 bg-black/30 rounded" onChange={ev=>setP(ev.target.value)} required/><button className="btn-neon w-full">Login</button><div className="text-center text-white/50">or</div><GoogleButton/></form>);
}
