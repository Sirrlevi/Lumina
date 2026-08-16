"use client";
import AuthGate from "@/components/AuthGate";
import CameraAnalyzer from "@/components/CameraAnalyzer";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from "react";

export default function UploadPage(){
  const [result,setResult]=useState(null);
  const router=useRouter();

  const save=async(data)=>{
    if(!data) return;
    const record={...data,ts:Date.now(),uid:auth.currentUser?.uid||null,photo:null};
    try{localStorage.setItem("lumina_last",JSON.stringify(record));}catch{}
    const user=auth.currentUser;
    if(user){
      // Only analysis metadata is stored. Camera frames are not uploaded or retained.
      const payload={...record};
      try{await Promise.race([
        addDoc(collection(db,"users",user.uid,"history"),payload),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("history timeout")),2500))
      ])}catch{}
    }
    setResult(record);
    router.replace("/dashboard/results");
    setTimeout(()=>{if(window.location.pathname!=="/dashboard/results")window.location.assign("/dashboard/results")},500);
  };

  return <AuthGate><div className="max-w-5xl mx-auto">
    <div className="mb-6"><p className="eyebrow">LUMINA ANALYZER</p><h1 className="text-3xl sm:text-4xl font-black mt-2">Real-time facial analysis.</h1><p className="text-white/50 mt-2 max-w-2xl">Camera-only scanning. No file uploads and no cloud AI. LUMINA maps facial landmarks, proportions and symmetry, then runs a local beauty model in your browser.</p></div>
    <CameraAnalyzer onResult={save}/>
    {result&&<div className="mt-5 text-center"><a href="/dashboard/results" className="btn-neon inline-flex">VIEW FULL RESULTS</a></div>}
  </div></AuthGate>
}
