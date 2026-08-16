import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { isAdminRequest } from "@/lib/requireAdmin";
export const runtime="nodejs";

 if(!(await isAdminRequest()))return NextResponse.json({ok:false,error:"Unauthorized."},{status:401});
  const email=String(new URL(request.url).searchParams.get("email")||"").trim().toLowerCase();
  if(!email)return NextResponse.json({ok:false,error:"Email is required."},{status:400});
  try{
    const snap=await adminDb().collection("users").where("email","==",email).limit(10).get();
    const users=snap.docs.map(d=>({uid:d.id,...d.data()}));
    if(!users.length){try{const u=await adminAuth().getUserByEmail(email);users.push({uid:u.uid,email:u.email,name:u.displayName||""});}catch{}}
    return NextResponse.json({ok:true,users:users.map(u=>({uid:u.uid,email:u.email||email,name:u.name||"",username:u.username||"",createdAt:u.createdAt||null}))});
  }catch(e){console.error(e);return NextResponse.json({ok:false,error:"Could not search users."},{status:500});}
}
