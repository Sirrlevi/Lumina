"use client";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
export default function GoogleButton({ text = "Continue with Google" }) { const r=useRouter(); return <button type="button" onClick={async()=>{try{const c=await signInWithPopup(auth,googleProvider);await setDoc(doc(db,"users",c.user.uid),{name:c.user.displayName,email:c.user.email,updatedAt:Date.now()},{merge:true});r.push("/dashboard/upload")}catch{}}} className="w-full p-3 bg-white text-black rounded-xl font-semibold">{text}</button>; }
