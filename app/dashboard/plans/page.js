"use client";
import { useEffect,useState } from "react";
import AuthGate from "@/components/AuthGate";
import PlanGenerator from "@/components/PlanGenerator";
export default function Plans(){const[d,setD]=useState(null);useEffect(()=>{try{setD(JSON.parse(localStorage.getItem("lumina_last")||"null"))}catch{}},[]);return <AuthGate><div className="max-w-4xl mx-auto"><p className="eyebrow">PERSONAL PLAN</p><h1 className="text-3xl sm:text-4xl font-black mt-1">Your improvement plan</h1><p className="text-white/50 mt-2">Plans adapt to your latest measured score. They focus on sustainable habits, not extreme hacks.</p><PlanGenerator rating={d?.numeric||5}/></div></AuthGate>}
