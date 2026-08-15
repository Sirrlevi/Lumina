"use client";
import UploadForm from "@/components/UploadForm";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function UploadPage(){
  const [ready,setReady]=useState(false); const r=useRouter();
  useEffect(()=>onAuthStateChanged(auth,u=>{ if(!u) r.push("/login"); else setReady(true); }),[]);
  if(!ready) return <p className="text-center mt-20">Loading...</p>;
  return <div><h1 className="text-3xl font-bold mb-6">Analyze Your Face</h1><UploadForm/></div>;
}
