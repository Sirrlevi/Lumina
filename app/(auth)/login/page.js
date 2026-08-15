"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import B from "@/components/GoogleButton";
export default function Login(){const[e,se]=useState(""),[p,sp]=useState(""),[err,setErr]=useState("");const r=useRouter();return <form onSubmit={async ev=>{ev.preventDefault();setErr("");try{await signInWithEmailAndPassword(auth,e,p);r.push("/dashboard/upload")}catch(x){setErr(x.message?.replace("Firebase: ","")||"Login failed")}}} className="glass p-6 max-w-md mx-auto mt-10 space-y-3"><h1 className="text-2xl font-black">Welcome back</h1><input required type="email" placeholder="Email" onChange={e=>se(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl"/><input required type="password" placeholder="Password" onChange={e=>sp(e.target.value)} className="w-full p-3 bg-black/30 rounded-xl"/><button className="btn-neon w-full">Login</button>{err&&<p className="text-sm text-rose-300">{err}</p>}<B/></form>}
