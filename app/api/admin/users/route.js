import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/requireAdmin";
import { searchAdminUsers } from "@/lib/adminUsers";
export const runtime = "nodejs";

export async function GET(request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    const users = await searchAdminUsers(q);
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    console.error("Admin user list failed:", e);
    return NextResponse.json(
      { ok: false, error: "Could not load users. Check the Firebase Admin environment variables." },
      { status: 500 }
    );
  }
}
