import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminSession";
export async function GET(){const c=(await cookies()).get(ADMIN_COOKIE)?.value;return NextResponse.json({authenticated:verifyAdminSession(c)});}
