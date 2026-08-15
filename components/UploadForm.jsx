"use client";
import { useState } from "react";
import { analyzeFace } from "@/lib/faceAnalysis";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

const stages=["Preparing image","Loading face model","Detecting 468 landmarks","Measuring proportions","Calculating scores","Saving result"];

export default function UploadForm(){
  const [preview,setPreview]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(""),[stage,setStage]=useState(0),[progress,setProgress]=useState(0);
  const router=useRouter();
  const save=async data=>{
    if(!data) throw new Error("No analysis result returned");
    const record={...data,ts:Date.now(),uid:auth.currentUser?.uid||null};
    localStorage.setItem("lumina_last",JSON.stringify(record));
    if(auth.currentUser){
      try{await addDoc(collection(db,"users",auth.currentUser.uid,"history"),record);}catch(e){console.warn("History save failed",e);}
    }
    router.replace("/dashboard/results");
    router.refresh();
  };
  const handleUpload=async e=>{
    const file=e.target.files?.[0]; if(!file)return;
    if(!file.type.startsWith("image/"))return setError("Please choose a JPG, PNG or WebP image.");
    if(file.size>12*1024*1024)return setError("Please choose an image under 12 MB.");
    setError("");setLoading(true);setStage(0);setProgress(8);
    const url=URL.createObjectURL(file);setPreview(url);
    try{
      const img=new Image();img.decoding="async";img.src=url;
      await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error("Image could not be loaded"));});
      setStage(1);setProgress(20);await new Promise(r=>requestAnimationFrame(r));
      setStage(2);setProgress(35);
      const result=await analyzeFace(img);
      setStage(3);setProgress(62);await new Promise(r=>setTimeout(r,100));
      setStage(4);setProgress(82);await new Promise(r=>setTimeout(r,100));
      setStage(5);setProgress(92);await save(result);
    }catch(e){setError(e?.message?.includes("No face")?"I couldn't find a clear face. Use a front-facing photo with your full face visible and good lighting.":e?.message||"Analysis failed. Try another photo.");}
    finally{URL.revokeObjectURL(url);setLoading(false);setProgress(0);}
  };
  return <div className="space-y-5">
    <div className="glass p-5 sm:p-7">
      <div className="border border-dashed border-white/15 rounded-3xl p-5 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto grid place-items-center bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20 border border-white/10 text-2xl">✦</div>
        <h2 className="text-xl sm:text-2xl font-bold mt-4">Get your facial analysis</h2>
        <p className="text-sm text-white/50 mt-2 max-w-lg mx-auto">Use a straight-on photo. LUMINA measures facial geometry and visible image characteristics locally in your browser.</p>
        <input id="lumina-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
        <label htmlFor="lumina-upload" className="btn-neon inline-flex mt-6 cursor-pointer">{loading?"Analyzing…":"Choose photo"}</label>
        {preview&&<img src={preview} alt="Selected face" className="mt-7 w-full max-w-md max-h-[420px] mx-auto rounded-2xl object-contain bg-black/20"/>}
        {loading&&<div className="mt-6 text-left max-w-md mx-auto"><div className="flex justify-between text-xs text-white/50"><span>{stages[stage]}</span><span>{progress}%</span></div><div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all duration-500" style={{width:`${progress}%`}}/></div><div className="grid grid-cols-3 gap-2 mt-4">{stages.slice(0,6).map((x,i)=><div key={x} className={`text-[10px] rounded-lg px-2 py-2 border ${i<=stage?"border-cyan-400/30 bg-cyan-400/10 text-cyan-200":"border-white/5 text-white/25"}`}>{i+1}. {x}</div>)}</div></div>}
        {error&&<div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</div>}
      </div>
    </div>
    <CameraAnalyzer onResult={save}/>
  </div>;
}
