"use client";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Profile(){
  const [user,setUser]=useState(null); const [hist,setHist]=useState([]);
  useEffect(()=>onAuthStateChanged(auth,async u=>{ setUser(u); if(u){ const q=query(collection(db,"users",u.uid,"history"),orderBy("ts")); const s=await getDocs(q); setHist(s.docs.map(d=>d.data())); }}),[]);
  return (
    <div className="glass p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      {user && <p>{user.displayName} • {user.email}</p>}
      <div className="h-60 mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hist.map(h=>({t:new Date(h.ts).toLocaleDateString(),r:h.numeric}))}>
            <XAxis dataKey="t"/><YAxis domain={[0,10]}/><Tooltip/><Line type="monotone" dataKey="r" stroke="#22d3ee" strokeWidth={3}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
