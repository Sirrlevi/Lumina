"use client";
import { useRef, useState } from "react";
import { analyzeFace } from "@/lib/faceAnalysis";
export default function CameraAnalyzer({onResult}){
  const videoRef = useRef(null); const [active,setActive]=useState(false);
  const start = async ()=>{
    setActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"}});
    videoRef.current.srcObject = stream; await videoRef.current.play();
    const interval = setInterval(async ()=>{
      if(!videoRef.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current,0,0);
      const bmp = await createImageBitmap(canvas);
      const res = await analyzeFace(bmp); if(res) onResult(res);
    },1000);
    videoRef.current.onpause = ()=>clearInterval(interval);
  };
  const stop = ()=>{ videoRef.current?.srcObject?.getTracks().forEach(t=>t.stop()); setActive(false); };
  return (<div className="glass p-4"><video ref={videoRef} className="w-full rounded-xl" muted playsInline/>{!active? <button onClick={start} className="btn-neon mt-3 w-full">Start Live Camera</button>: <button onClick={stop} className="w-full p-3 bg-red-500/80 rounded-xl mt-3">Stop</button>}<p className="text-xs text-white/50 mt-2">Camera sirf tumhari permission se chalta hai.</p></div>);
}
