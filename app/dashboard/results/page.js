"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ResultCard from "@/components/ResultCard";
import PlanGenerator from "@/components/PlanGenerator";

export default function Results() {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    try { setData(JSON.parse(localStorage.getItem("lumina_last") || "null")); } catch { setData(null); }
  }, []);
  if (data === undefined) return <div className="text-center mt-20 text-white/50">Loading result…</div>;
  if (!data) return <div className="glass p-8 text-center"><h1 className="text-2xl font-bold">No result yet</h1><p className="text-white/50 mt-2">Upload a clear front-facing photo first.</p><Link href="/dashboard/upload" className="btn-neon inline-block mt-5">Start analysis</Link></div>;
  return <div className="space-y-5"><ResultCard data={data}/><PlanGenerator rating={data.numeric}/><div className="text-center py-4"><Link href="/dashboard/upload" className="text-cyan-300 hover:text-cyan-200">← Analyze another photo</Link></div></div>;
}
