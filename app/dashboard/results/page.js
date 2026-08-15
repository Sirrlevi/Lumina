"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import ResultCard from "@/components/ResultCard";
import PlanGenerator from "@/components/PlanGenerator";

export default function Results(){
 const[data,setData]=useState(undefined);
 useEffect(()=>{try{const raw=localStorage.getItem("lumina_last");setData(raw?JSON.parse(raw):null)}catch{setData(null)}},[]);
 return <AuthGate>{data===undefined?<div className="glass p-8 text-center"><div className="lumina-spinner mx-auto"/><p className="mt-4 text-white/50">Loading your result…</p></div>:!data?<div className="glass p-8 text-center max-w-xl mx-auto"><h1 className="text-2xl font-bold">No analysis yet</h1><p className="text-white/50 mt-2">Upload a photo and your full report will appear here.</p><Link href="/dashboard/upload" className="btn-neon inline-flex mt-5">Start analysis</Link></div>:<div className="max-w-5xl mx-auto space-y-5 pb-12"><div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"><div><p className="eyebrow">YOUR REPORT</p><h1 className="text-3xl sm:text-4xl font-black mt-1">Face analysis</h1><p className="text-sm text-white/40 mt-2">Scanned {new Date(data.analyzedAt||data.ts||Date.now()).toLocaleString()}</p></div><Link href="/dashboard/upload" className="text-cyan-300 text-sm">Analyze another photo →</Link></div><ResultCard data={data}/><PlanGenerator rating={data.numeric}/></div>}</AuthGate>;
}
