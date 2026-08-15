"use client";
import { useEffect, useState } from "react";
import PlanGenerator from "@/components/PlanGenerator";
export default function Plans() { const [d, setD] = useState(null); useEffect(() => { try { setD(JSON.parse(localStorage.getItem("lumina_last") || "null")); } catch {} }, []); return <div><h1 className="text-3xl font-black">Plans</h1><p className="text-white/50 mt-1">General lifestyle guidance based on your latest score.</p><PlanGenerator rating={d?.numeric || 5}/></div>; }
