"use client";
import { useRouter } from "next/navigation";
import { auth,db } from "@/lib/firebase";
import { collection,addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

export default function UploadForm(){
 const router=useRouter();
 const save=async(data)=>{const record={...data,ts:Date.now(),uid:auth.currentUser?.uid||null};localStorage.setItem("lumina_last",JSON.stringify(record));const user=auth.currentUser;if(user){try{await Promise.race([addDoc(collection(db,"users",user.uid,"history"),record),new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),1800))])}catch{}}router.replace("/dashboard/results");setTimeout(()=>{if(location.pathname!=="/dashboard/results")location.assign("/dashboard/results")},500)};
 return <CameraAnalyzer onResult={save}/>;
}
