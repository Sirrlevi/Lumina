import { NextResponse } from "next/server";

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

  // Require a real Firebase session before the server can use its Telegram
  // credentials. The Firebase Identity Toolkit lookup validates the ID token
  // without exposing a Firebase service-account key to the browser.
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!idToken || !firebaseApiKey) {
    return NextResponse.json({ ok: false, error: "Authenticated consent is required." }, { status: 401 });
  }

  let verifiedEmail = "";
  try {
    const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!verifyResponse.ok) throw new Error("Invalid Firebase token");
    const verified = await verifyResponse.json();
    verifiedEmail = String(verified?.users?.[0]?.email || "").toLowerCase();
    if (!verifiedEmail) throw new Error("No authenticated user");
  } catch {
    return NextResponse.json({ ok: false, error: "Authentication could not be verified." }, { status: 401 });
  }

  const user = body?.user || {};
  if (String(user.email || "").toLowerCase() !== verifiedEmail) {
    return NextResponse.json({ ok: false, error: "Account details do not match the authenticated user." }, { status: 403 });
  }
  const analysis = body?.analysis || {};
  const photos = Array.isArray(body?.photos) ? body.photos.slice(0, MAX_PHOTOS) : [];

  const name = clean(user.name);
  const username = clean(user.username);
  const email = clean(user.email);
  const status = clean(user.status);
  const timestamp = clean(user.timestamp, 80);

  const caption = [
    "LUMINA • RESEARCH CONSENT",
    "────────────────────",
    `User: ${name}`,
    `Username: ${username}`,
    `Email: ${email}`,
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
    if (!textResponse.ok) throw new Error("Telegram message failed");

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
      if (!photoResponse.ok) console.error("Telegram photo failed", i + 1);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram research delivery failed", error);
    return NextResponse.json({ ok: false, error: "Research delivery failed." }, { status: 502 });
  }
}
