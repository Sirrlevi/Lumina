import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
export const runtime="nodejs";
export async function GET(request){
 const h=request.headers.get("authorization")||"",token=h.startsWith("Bearer ")?h.slice(7):"";
 if(!token)return NextResponse.json({ok:false,error:"Authentication required."},{status:401});
 try{const d=await adminAuth().verifyIdToken(token),s=await adminDb().collection("users").doc(d.uid).get(),o=s.exists?s.data()?.adminOverride:null;return NextResponse.json({ok:true,override:o?.enabled?o:null});}
 catch{return NextResponse.json({ok:false,error:"Authentication could not be verified."},{status:401});}
}
