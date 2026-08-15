"use client";
import {signInWithPopup} from "firebase/auth";
import {auth,googleProvider} from "@/lib/firebase";
import {useRouter} from "next/navigation";
import {doc,setDoc} from "firebase/firestore";
import {db} from "@/lib/firebase";
import {useState} from "react";
export default function GoogleButton({text="Continue with Google"}){const r=useRouter(),[busy,setBusy]=useState(false);return <button type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);try{const c=await signInWithPopup(auth,googleProvider);try{await setDoc(doc(db,"users",c.user.uid),{name:c.user.displayName||"",email:c.user.email||"",updatedAt:Date.now()},{merge:true})}catch{}r.replace("/dashboard/upload");r.refresh()}catch{}finally{setBusy(false)}}} className="w-full p-3 rounded-xl border border-white/10 bg-white text-black font-semibold disabled:opacity-60">{busy?"Connecting…":text}</button>}
