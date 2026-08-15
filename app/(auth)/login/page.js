"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login(){
  const [e,setE]=useState(""); const [p,setP]=useState(""); const r=useRouter();
  const submit=async(ev)=>{ev.preventDefault(); await signInWithEmailAndPassword(auth,e,p); r.push("/dashboard/upload");};
  return (
    <form onSubmit={submit} className="glass p-8 max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Welcome back</h2>
      <input type="email" placeholder="Email" className="w-full p-3 bg-black/30 rounded" onChange={ev=>setE(ev.target.value)}/>
      <input type="password" placeholder="Password" className="w-full p-3 bg-black/30 rounded" onChange={ev=>setP(ev.target.value)}/>
      <button className="btn-neon w-full">Login</button>
    </form>
  );
}
