import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminSession";
export async function isAdminRequest(){ const c=(await cookies()).get(ADMIN_COOKIE)?.value; return verifyAdminSession(c); }
