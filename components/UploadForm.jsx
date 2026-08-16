"use client";
import { useRouter } from "next/navigation";
import { auth,db } from "@/lib/firebase";
import { collection,addDoc } from "firebase/firestore";
import CameraAnalyzer from "./CameraAnalyzer";

export default function UploadForm(){
 const router=useRouter();
 const save=async(data)=>{
   const user=auth.currentUser;
   const record={
     numeric:data.numeric,
     tier:data.tier,
     shape:data.shape,
     symmetry:data.symmetry,
     confidence:data.confidence,
     metrics:data.metrics,
     breakdown:data.geometryBreakdown,
     version:data.version,
     engine:data.engine,
     analyzedAt:data.analyzedAt,
     ts:Date.now(),
     uid:user?.uid||null
   };
   try{ localStorage.setItem("lumina_last",JSON.stringify(record)); }catch{}
   if(user){
     try{ await addDoc(collection(db,"users",user.uid,"history"),record); }catch(e){ console.error("DB write failed",e); }
   }
   router.replace("/dashboard/results");
 };
 return <CameraAnalyzer onResult={save}/>;
}
