"use client";
import { useEffect, useState } from "react";
import ResultCard from "@/components/ResultCard";
import PlanGenerator from "@/components/PlanGenerator";
export default function Results(){
  const [data,setData]=useState(null);
  useEffect(()=>{ const d=localStorage.getItem("lumina_last"); if(d) setData(JSON.parse(d)); },[]);
  return (<div className="space-y-6"><h1 className="text-3xl font-bold">Your Analysis</h1><ResultCard data={data}/>{data && <PlanGenerator rating={data.numeric}/>}</div>);
}
