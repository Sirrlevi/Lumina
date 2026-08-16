import { NextResponse } from "next/server";
import { createAdminSession, ADMIN_COOKIE, MAX_AGE } from "@/lib/adminSession";
export const runtime="nodejs";
export async function POST(request){
  let body;try{body=await request.json();}catch{return NextResponse.json({ok:false,error:"Invalid request."},{status:400});}
  const expected=process.env.LUMINA_ADMIN_PASSWORD;
  if(!expected)return NextResponse.json({ok:false,error:"Admin password is not configured."},{status:503});
  if(String(body?.password||"")!==expected)return NextResponse.json({ok:false,error:"Invalid admin password."},{status:401});
  const r=NextResponse.json({ok:true});r.cookies.set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:MAX_AGE});return r;
}
