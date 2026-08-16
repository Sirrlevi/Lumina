"use client";

import { useEffect, useRef, useState } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import { analyzeFace } from "@/lib/faceAnalysis";
import { predictBeauty } from "@/lib/beautyModel";

const CONNECTIONS = [
  [10,151],[151,9],[9,8],[8,168],[168,6],[6,197],[197,195],[195,5],
  [10,109],[109,67],[67,103],[103,54],[54,21],[21,162],[162,127],[127,234],
  [10,338],[338,297],[297,332],[332,284],[284,251],[251,389],[389,356],[356,454],
  [234,93],[93,132],[132,58],[58,172],[172,136],[136,150],[150,176],[176,148],[148,152],
  [454,323],[323,361],[361,288],[288,397],[397,365],[365,379],[379,400],[400,378],[378,152],
  [33,133],[133,159],[159,145],[145,33],[362,263],[263,386],[386,374],[374,362],
  [105,66],[66,107],[107,55],[334,296],[296,336],[336,285],
  [129,98],[98,2],[2,327],[327,358],
  [61,40],[40,13],[13,291],[291,270],[270,14],[14,61],
  [61,291],[105,334],[33,263],[168,1],[1,152]
];

function drawOverlay(canvas, landmarks, scanY, progress) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!landmarks?.length) return;

  const p = i => ({x: landmarks[i].x*w, y: landmarks[i].y*h});
  ctx.save();
  ctx.lineWidth = Math.max(1.2, w/700);
  ctx.strokeStyle = "rgba(56, 240, 255, .72)";
  ctx.shadowColor = "rgba(56, 240, 255, .8)";
  ctx.shadowBlur = 8;
  for (const [a,b] of CONNECTIONS) {
    const A=p(a), B=p(b); ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
  }

  // Dense landmark constellation.
  ctx.shadowBlur = 0;
  for (let i=0;i<landmarks.length;i++) {
    const q=p(i);
    ctx.fillStyle = i%7===0 ? "rgba(255,93,220,.95)" : "rgba(90,245,255,.9)";
    ctx.beginPath(); ctx.arc(q.x,q.y,Math.max(1.2,w/520),0,Math.PI*2); ctx.fill();
  }

  const left=p(234), right=p(454), top=p(10), chin=p(152), mid=p(168);
  ctx.setLineDash([8,6]);
  ctx.strokeStyle="rgba(255,255,255,.65)";
  ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(mid.x,top.y-20);ctx.lineTo(mid.x,chin.y+20);ctx.stroke();
  ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(right.x,right.y);ctx.stroke();
  ctx.setLineDash([]);

  // Facial thirds.
  for (const t of [top.y+(mid.y-top.y)*.5, mid.y+(chin.y-mid.y)*.5]) {
    ctx.strokeStyle="rgba(255,93,220,.5)";ctx.beginPath();ctx.moveTo(left.x-18,t);ctx.lineTo(right.x+18,t);ctx.stroke();
  }

  // Animated scanner beam.
  const y = scanY*h;
  const g=ctx.createLinearGradient(0,y-45,0,y+45);
  g.addColorStop(0,"rgba(58,240,255,0)");
  g.addColorStop(.5,"rgba(58,240,255,.9)");
  g.addColorStop(1,"rgba(58,240,255,0)");
  ctx.fillStyle=g;ctx.fillRect(0,y-45,w,90);

  // Feature labels.
  ctx.shadowBlur=0;
  ctx.font=`600 ${Math.max(10,w/55)}px Inter, sans-serif`;
  ctx.fillStyle="rgba(255,255,255,.82)";
  const labels=[["JAW",172],["BROW",105],["EYES",33],["NOSE",1],["LIPS",61]];
  for(const [label,i] of labels){const q=p(i);ctx.fillText(label,q.x+8,q.y-8);}
  ctx.restore();
}

export default function CameraAnalyzer({ onResult }) {
  const video=useRef(null), overlay=useRef(null), stream=useRef(null), mesh=useRef(null);
  const raf=useRef(null), triggered=useRef(false), stable=useRef(0), lastCenter=useRef(null);
  const [active,setActive]=useState(false),[phase,setPhase]=useState("idle"),[progress,setProgress]=useState(0),[error,setError]=useState("");
  const [landmarks,setLandmarks]=useState(null);

  const cleanup=()=>{
    if(raf.current) cancelAnimationFrame(raf.current);
    try{mesh.current?.close?.()}catch{}
    mesh.current=null;
    stream.current?.getTracks().forEach(t=>t.stop());
    stream.current=null;
    if(video.current) video.current.srcObject=null;
    setActive(false);
  };

  useEffect(()=>()=>cleanup(),[]);

  const start=async()=>{
    if(active||phase==="scanning")return;
    setError("");setPhase("starting");setProgress(2);triggered.current=false;stable.current=0;lastCenter.current=null;
    try{
      stream.current=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:"user",width:{ideal:720},height:{ideal:720}},audio:false
      });
      video.current.srcObject=stream.current;
      await video.current.play();
      setActive(true);setPhase("scanning");

      mesh.current=new FaceMesh({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
      mesh.current.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.65,minTrackingConfidence:.65});
      mesh.current.onResults(async res=>{
        const L=res.multiFaceLandmarks?.[0];
        const c=overlay.current;
        if(c){c.width=video.current.videoWidth||720;c.height=video.current.videoHeight||720;}
        setLandmarks(L||null);
        if(c&&L) drawOverlay(c,L,(Date.now()%2600)/2600,progress);

        if(!L||triggered.current)return;
        const center=L[1];
        const movement=lastCenter.current?Math.hypot(center.x-lastCenter.current.x,center.y-lastCenter.current.y):0;
        lastCenter.current=center;
        if(movement<.012)stable.current++; else stable.current=Math.max(0,stable.current-3);
        const pct=Math.min(55,5+Math.round(stable.current/32*50));
        setProgress(pct);

        if(stable.current>=32&&!triggered.current){
          triggered.current=true;
          await runAnalysis();
        }
      });

      const loop=async()=>{
        if(video.current?.readyState>=2&&!triggered.current) {
          try{await mesh.current.send({image:video.current});}catch{}
        }
        raf.current=requestAnimationFrame(loop);
      };
      loop();
    }catch(e){
      cleanup();setPhase("idle");setError(e?.name==="NotAllowedError"?"Camera permission is required to scan your face.": "Camera is unavailable on this device.");
    }
  };

  const runAnalysis=async()=>{
    setPhase("analyzing");setProgress(62);
    try{
      const result=await analyzeFace(video.current,({progress:p,label})=>{
        setProgress(Math.max(62,Math.min(82,p)));setPhase("analyzing");
      });
      setProgress(86);setPhase("scoring");
      const beauty=await predictBeauty(video.current);
      const final={
        ...result,
        numeric:beauty?.score ?? result.numeric,
        modelScore:beauty?.score ?? null,
        modelName:beauty?.modelName || "LUMINA local beauty model",
        tier:result.tierFor?.(beauty?.score ?? result.numeric) || undefined,
        summary:"Local facial-attractiveness model + landmark geometry. No Gemini or server AI is used.",
        confidence:beauty?.confidence ?? .7,
        version:"lumina-local-model-v1",
        breakdown:{
          ...(result.breakdown||{}),
          attractivenessModel:Number(beauty?.score ?? result.numeric).toFixed(1),
        },
      };
      // Recalculate PSL tier from final score.
      final.tier=final.numeric<3.5?"Sub-5":final.numeric<5?"LTN":final.numeric<6.2?"MTN":final.numeric<7.3?"HTN":final.numeric<8.3?"Chadlite":final.numeric<9.1?"Chad":"Adam";
      setProgress(96);setPhase("complete");
      await onResult(final);
    }catch(e){
      setError(e?.message?.includes("No face")?e.message:"We couldn't complete the scan. Keep your face centered, still and well lit, then start again.");
      setPhase("idle");setProgress(0);
    }finally{
      cleanup();
    }
  };

  const labels={idle:"Camera scan ready",starting:"Starting camera",scanning:"Mapping facial structure",analyzing:"Measuring proportions",scoring:"Calculating PSL score",complete:"Scan complete"};

  return <div className="glass p-4 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><p className="eyebrow">LUMINA FACE SCANNER</p><h2 className="text-xl sm:text-2xl font-black mt-1">{labels[phase]}</h2></div>
      {active&&<span className="text-xs text-cyan-300 animate-pulse">● LIVE SCAN</span>}
    </div>
    <div className="relative mt-5 overflow-hidden rounded-3xl border border-cyan-300/15 bg-black aspect-square max-w-[720px] mx-auto">
      <video ref={video} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      <canvas ref={overlay} className="absolute inset-0 w-full h-full pointer-events-none scale-x-[-1]" />
      {!active&&<div className="absolute inset-0 grid place-items-center bg-black/45"><div className="text-center px-8"><div className="text-5xl">◎</div><p className="font-bold mt-3">Camera-only analysis</p><p className="text-sm text-white/45 mt-1">No image upload. Start when your face is centered.</p></div></div>}
      {active&&phase==="scanning"&&<div className="absolute top-4 left-4 rounded-xl bg-black/45 backdrop-blur px-3 py-2 text-xs text-cyan-100">LANDMARKS {landmarks?.length||0}/478</div>}
      {active&&phase!=="complete"&&<div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/55 backdrop-blur p-3"><div className="flex justify-between text-xs"><span>{labels[phase]}</span><span>{progress}%</span></div><div className="h-1.5 bg-white/10 rounded-full mt-2"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300 transition-all" style={{width:`${progress}%`}}/></div></div>}
    </div>
    {!active&&phase!=="complete"&&<button onClick={start} className="btn-neon w-full mt-5">START FACE SCAN</button>}
    {error&&<div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/5 p-3 text-sm text-rose-200">{error}</div>}
    <p className="text-[11px] text-white/30 mt-4 text-center">The camera stops automatically when the scan finishes. Results are estimates of visual facial characteristics, not objective measures of worth or attractiveness.</p>
  </div>;
}
