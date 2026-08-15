"use client";
import { useState } from "react";
import { analyzeFace, normalizeImage } from "@/lib/faceAnalysis";
import { analyzeWithAI } from "@/lib/aiAnalysis";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

const stages=["Preparing image","Loading face model","Detecting 468 landmarks","Measuring proportions","AI visual assessment","Combining AI + measurements","Saving result"];

async function makePreview(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      const max=900,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      const c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      resolve(c.toDataURL("image/jpeg",0.78));
    };
    img.onerror=()=>reject(new Error("Preview could not be generated."));img.src=url;
  });
}

export default function UploadForm(){
  const [preview,setPreview]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState(""),[stage,setStage]=useState(0),[progress,setProgress]=useState(0);
  const router=useRouter();

  const save=async(data,photo=null)=>{
    if(!data) throw new Error("No analysis result returned.");
    const record={...data,ts:Date.now(),uid:auth.currentUser?.uid||null,photo:photo||null};
    try{localStorage.setItem("lumina_last",JSON.stringify(record));}
    catch{throw new Error("Could not save the result on this device. Please allow site storage and retry.");}

    const user=auth.currentUser;
    if(user){
      const payload={...record,photo:null};
      void Promise.race([
        addDoc(collection(db,"users",user.uid,"history"),payload),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("history timeout")),1800))
      ]).catch(()=>{});
    }

    setStage(6);setProgress(100);
    router.replace("/dashboard/results");
    // Hard fallback for mobile browsers where a client navigation can remain pending.
    window.setTimeout(()=>{if(window.location.pathname!=="/dashboard/results")window.location.assign("/dashboard/results");},500);
  };

  const handleUpload=async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(!file.type.startsWith("image/")){setError("Please choose a JPG, PNG or WebP image.");return;}
    if(file.size>15*1024*1024){setError("Please choose an image under 15 MB.");return;}
    setError("");setLoading(true);setStage(0);setProgress(5);
    const url=URL.createObjectURL(file);setPreview(url);
    try{
      const img=new Image();img.decoding="async";img.src=url;
      await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error("Image could not be loaded."));});
      setStage(1);setProgress(18);
      const photo=await makePreview(url);
      const result=await analyzeFace(img,({step,progress,label})=>{setStage(Math.max(0,step-1));setProgress(progress);});
      const aiCanvas=await normalizeImage(img);
      const ai=await analyzeWithAI(aiCanvas,result.metrics,({progress,label})=>{setStage(label?.includes("Combining")?5:4);setProgress(progress);});
      const merged={
        ...result,
        numeric: ai.numeric,
        tier: ai.tier,
        summary: ai.summary,
        strengths: ai.strengths,
        priorities: ai.priorities,
        confidence: ai.confidence,
        aiFeatures: ai.aiFeatures,
        breakdown: {
          harmony: ai.aiFeatures.harmony,
          symmetry: ai.aiFeatures.symmetry,
          jawline: ai.aiFeatures.jawline,
          cheekbones: ai.aiFeatures.cheekbones,
          eyeArea: ai.aiFeatures.eyeArea,
          canthalTilt: ai.aiFeatures.canthalTilt,
          facialProportions: ai.aiFeatures.facialProportions,
          midface: ai.aiFeatures.midface,
          nose: ai.aiFeatures.nose,
          lips: ai.aiFeatures.lips,
          skinPresentation: ai.aiFeatures.skinPresentation,
        },
        geometryBreakdown: result.breakdown,
        version: ai.version,
      };
      await save(merged,photo);
    }catch(e){
      const msg=e?.message||"Analysis failed. Try another photo.";
      setError(msg.includes("No face")?"I couldn't find a clear face. Use a straight-on photo with your whole face visible, good lighting and minimal tilt.":msg);
      setLoading(false);
    }finally{URL.revokeObjectURL(url);}
  };

  return <div className="space-y-5">
    <div className="glass p-5 sm:p-7">
      <div className="border border-dashed border-white/15 rounded-3xl p-5 sm:p-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto grid place-items-center bg-gradient-to-br from-fuchsia-500/20 to-cyan-400/20 border border-white/10 text-2xl">✦</div>
        <h2 className="text-xl sm:text-2xl font-bold mt-4">Scan your face</h2>
        <p className="text-sm text-white/50 mt-2 max-w-lg mx-auto">Use a front-facing photo with neutral expression, even lighting and your full face visible. The same photo always produces the same result.</p>
        <input id="lumina-upload" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} className="hidden" />
        <label htmlFor="lumina-upload" className="btn-neon inline-flex mt-6 cursor-pointer">{loading?"Analyzing…":"Choose photo"}</label>
        {preview&&<img src={preview} alt="Selected face" className="mt-7 w-full max-w-md max-h-[420px] mx-auto rounded-2xl object-contain bg-black/20"/>}
        {loading&&<div className="mt-6 text-left max-w-md mx-auto"><div className="flex justify-between text-xs text-white/55"><span>{stages[stage]}</span><span>{progress}%</span></div><div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all duration-300" style={{width:`${progress}%`}}/></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">{stages.map((x,i)=><div key={x} className={`text-[10px] rounded-lg px-2 py-2 border ${i<=stage?"border-cyan-400/30 bg-cyan-400/10 text-cyan-200":"border-white/5 text-white/25"}`}>{i+1}. {x}</div>)}</div></div>}
        {error&&<div className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</div>}
      </div>
    </div>
    <CameraAnalyzer onResult={save}/>
  </div>;
}
