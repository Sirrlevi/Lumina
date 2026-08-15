"use client";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";

export default function Navbar(){
  const [user,setUser]=useState(null);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  return (
    <nav className="flex justify-between items-center p-4 glass m-4">
      <Link href="/" className="text-xl font-bold bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">LUMINA</Link>
      <div className="flex gap-4">
        {user? <>
          <Link href="/dashboard/upload">Upload</Link>
          <Link href="/profile">Profile</Link>
          <button onClick={()=>signOut(auth)}>Logout</button>
        </> : <>
          <Link href="/login">Login</Link>
          <Link href="/register">Sign Up</Link>
        </>}
      </div>
    </nav>
  );
}
