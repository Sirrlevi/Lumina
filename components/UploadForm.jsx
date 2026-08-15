"use client";
import { useState } from "react";
import { analyzeFace } from "@/lib/faceAnalysis";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";
export default function UploadForm(){
  const [file,setFile]=useState(null); const [loading,setLoading]=useState(false); const r=useRouter();
  const saveResult = async (result)=>{ if(result && auth.currentUser){ await addDoc(collection(db,"users",auth.currentUser.uid,"history"),{...result,ts:Date.now()}); localStorage.setItem("lumina_last",JSON.stringify(result)); r.push("/dashboard/results"); }};
  const handle=async(e)=>{ const f=e.target.files[0]; if(!f) return; setFile(URL.createObjectURL(f)); setLoading(true); const img=new Image(); img.src=URL.createObjectURL(f); await img.decode(); const bmp=await createImageBitmap(img); const result=await analyzeFace(bmp); setLoading(false); saveResult(result); };
  return (<div className="space-y-6"><div className="glass p-8 text-center"><input type="file" accept="image/*" onChange={handle} className="hidden" id="up"/><label htmlFor="up" className="btn-neon cursor-pointer">Upload Photo</label>{loading && <p className="mt-4 animate-pulse">Analyzing...</p>}{file && <img src={file} className="mt-6 max-h-80 mx-auto rounded-xl"/>}</div><div className="text-center text-white/50">— OR —</div><CameraAnalyzer onResult={saveResult}/></div>);
}
