import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org";
const MAX_PHOTOS = 3;

function clean(value, max = 180) {
  return String(value ?? "").trim().slice(0, max) || "—";
}

function formatScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    endpoint: "LUMINA research delivery",
  });
}

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: "Telegram research channel is not configured." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (body?.consent !== true) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Verify the Firebase ID token server-side and use the authenticated UID as
  // the authoritative identity. Never trust username/phone supplied by the browser.
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) {
    return NextResponse.json({ ok: false, error: "Authenticated consent is required." }, { status: 401 });
  }

  let verifiedToken;
  let profile = {};
  try {
    verifiedToken = await adminAuth().verifyIdToken(idToken);
    const uid = String(verifiedToken.uid || "");
    if (!uid) throw new Error("No authenticated user ID");

    const profileSnap = await adminDb().collection("users").doc(uid).get();
    profile = profileSnap.exists ? (profileSnap.data() || {}) : {};
  } catch (error) {
    console.error("Firebase server verification/profile lookup failed", error);
    const message = String(error?.message || "");
    if (message.includes("credentials are not configured")) {
      return NextResponse.json({
        ok: false,
        error: "Firebase Admin is not configured on the server. Add FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY."
      }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "Authentication or account profile could not be verified." }, { status: 401 });
  }

  const verifiedEmail = String(verifiedToken.email || profile.email || "").trim().toLowerCase();
  if (!verifiedEmail) {
    return NextResponse.json({ ok: false, error: "Authenticated account has no email address." }, { status: 403 });
  }

  // Keep the request's identity only as a consistency check. The actual
  // username/phone/name values below always come from Firebase server-side.
  const requestedUser = body?.user || {};
  if (requestedUser.email && String(requestedUser.email).trim().toLowerCase() !== verifiedEmail) {
    return NextResponse.json({ ok: false, error: "Account details do not match the authenticated user." }, { status: 403 });
  }

  const analysis = body?.analysis || {};
  const photos = Array.isArray(body?.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];

  const historySnap = await adminDb().collection("users").doc(String(verifiedToken.uid)).collection("history").limit(1).get().catch(() => null);
  const priorScans = historySnap?.size || 0;

  const name = clean(profile.name || verifiedToken.name || verifiedToken.displayName);
  const username = clean(profile.username);
  const email = clean(verifiedEmail);
  const rawPhone = String(profile.phone || "").trim();
  const countryCode = String(profile.countryCode || "").trim();
  const phone = clean(rawPhone ? `${countryCode} ${rawPhone}`.trim() : "—");
  const status = priorScans > 0 ? "OLD USER" : "NEW USER";
  const timestamp = clean(requestedUser.timestamp || new Date().toISOString(), 80);

  const caption = [
    "LUMINA • RESEARCH CONSENT",
    "────────────────────",
    `User: ${name}`,
    `Username: ${username}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Account: ${status}`,
    `Time: ${timestamp}`,
    "",
    "Analysis",
    `Overall: ${formatScore(analysis.numeric)}/10`,
    `Tier: ${clean(analysis.tier, 60)}`,
    `Shape: ${clean(analysis.shape, 60)}`,
    `Confidence: ${clean(analysis.confidence, 60)}`,
    "",
    "Consent: explicitly opted in on the authentication screen.",
    "Password: never collected or transmitted.",
  ].join("\n");

  try {
    const textResponse = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: caption }),
    });
    const textResult = await textResponse.json().catch(() => ({}));
    if (!textResponse.ok || textResult?.ok !== true) {
      throw new Error(`Telegram message failed: ${textResult?.description || textResponse.status}`);
    }

    let sentPhotos = 0;
    for (let i = 0; i < photos.length; i += 1) {
      const dataUrl = String(photos[i] || "");
      const match = dataUrl.match(/^data:(image\/(?:jpeg|webp|png));base64,(.+)$/);
      if (!match) continue;

      const buffer = Buffer.from(match[2], "base64");
      if (buffer.length > 3_500_000) continue;

      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("caption", `${name} • ${email} • scan frame ${i + 1}/${photos.length}`);
      form.append("photo", new Blob([buffer], { type: match[1] }), `lumina-scan-${i + 1}.jpg`);

      const photoResponse = await fetch(`${TELEGRAM_API}/bot${token}/sendPhoto`, {
        method: "POST",
        body: form,
      });
      const photoResult = await photoResponse.json().catch(() => ({}));
      if (!photoResponse.ok || photoResult?.ok !== true) {
        console.error("Telegram photo failed", i + 1, photoResult?.description || photoResponse.status);
        continue;
      }
      sentPhotos += 1;
    }

    return NextResponse.json({ ok: true, sentPhotos, requestedPhotos: photos.length });
  } catch (error) {
    console.error("Telegram research delivery failed", error);
    return NextResponse.json({ ok: false, error: error?.message || "Research delivery failed." }, { status: 502 });
  }
}
