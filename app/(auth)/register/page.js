"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Register(){
  const [f,setF]=useState({name:"",username:"",email:"",pass:""});
  const r=useRouter();
  const submit=async(e)=>{
    e.preventDefault();
    const cred=await createUserWithEmailAndPassword(auth,f.email,f.pass);
    await updateProfile(cred.user,{displayName:f.name});
    await setDoc(doc(db,"users",cred.user.uid),{name:f.name,username:f.username,email:f.email,created:Date.now()});
    r.push("/dashboard/upload");
  };
  return (
    <form onSubmit={submit} className="glass p-8 max-w-md mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Create account</h2>
      <input placeholder="Full name" className="w-full p-3 bg-black/30 rounded" onChange={e=>setF({...f,name:e.target.value})}/>
      <input placeholder="Username" className="w-full p-3 bg-black/30 rounded" onChange={e=>setF({...f,username:e.target.value})}/>
      <input type="email" placeholder="Email" className="w-full p-3 bg-black/30 rounded" onChange={e=>setF({...f,email:e.target.value})}/>
      <input type="password" placeholder="Password" className="w-full p-3 bg-black/30 rounded" onChange={e=>setF({...f,pass:e.target.value})}/>
      <button className="btn-neon w-full">Sign Up</button>
    </form>
  );
}
