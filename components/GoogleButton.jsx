"use client";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
export default function GoogleButton({text="Continue with Google"}){
  const r = useRouter();
  const click = async ()=>{
    const res = await signInWithPopup(auth, googleProvider);
    await setDoc(doc(db,"users",res.user.uid),{ name: res.user.displayName, email: res.user.email, username: res.user.email.split("@")[0], created: Date.now() },{merge:true});
    r.push("/dashboard/upload");
  };
  return <button onClick={click} className="w-full p-3 bg-white text-black rounded-xl font-semibold hover:opacity-90">{text}</button>
}
