import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { isAdminRequest } from "@/lib/requireAdmin";
export const runtime = "nodejs";

export async function GET(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const ref = adminDb().collection("users").doc(params.uid);
    const u = await ref.get();
    const d = u.exists ? u.data() : {};
    const h = await ref.collection("history").orderBy("ts", "desc").limit(25).get();
    return NextResponse.json({
      ok: true,
      user: {
        uid: params.uid,
        name: d.name || "",
        username: d.username || "",
        email: d.email || "",
      },
      override: d.adminOverride || { enabled: false },
      history: h.docs.map((x) => ({ id: x.id, ...x.data() })),
    });
  } catch (e) {
    console.error("Admin user load failed:", e);
    return NextResponse.json({ ok: false, error: "Could not load user." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const rating = Number(body?.overallRating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    return NextResponse.json({ ok: false, error: "Rating must be between 1 and 10." }, { status: 400 });
  }

  const allowedMetrics = ["harmony", "jawline", "cheekbones", "eyeArea", "symmetry", "skinPresentation"];
  const rawMetrics = body?.breakdownOverrides && typeof body.breakdownOverrides === "object"
    ? body.breakdownOverrides
    : {};
  const breakdownOverrides = {};
  for (const key of allowedMetrics) {
    if (rawMetrics[key] === "" || rawMetrics[key] == null) continue;
    const value = Number(rawMetrics[key]);
    if (!Number.isFinite(value) || value < 1 || value > 10) {
      return NextResponse.json({ ok: false, error: `${key} must be between 1 and 10.` }, { status: 400 });
    }
    breakdownOverrides[key] = Number(value.toFixed(1));
  }

  const tierOverride = String(body?.tierOverride || "").trim();
  const allowedTiers = ["Sub-5", "LTN", "MTN", "HTN", "Chadlite", "Chad", "Adam"];
  if (tierOverride && !allowedTiers.includes(tierOverride)) {
    return NextResponse.json({ ok: false, error: "Invalid tier." }, { status: 400 });
  }

  try {
    await adminDb().collection("users").doc(params.uid).set(
      {
        adminOverride: {
          enabled: true,
          overallRating: Number(rating.toFixed(1)),
          tierOverride: tierOverride || null,
          breakdownOverrides,
          updatedAt: Date.now(),
          mode: "personal-demo",
        },
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin override save failed:", e);
    return NextResponse.json({ ok: false, error: "Could not save override." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    await adminDb().collection("users").doc(params.uid).set(
      { adminOverride: { enabled: false, updatedAt: Date.now(), mode: "personal-demo" } },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin override removal failed:", e);
    return NextResponse.json({ ok: false, error: "Could not remove override." }, { status: 500 });
  }
}
