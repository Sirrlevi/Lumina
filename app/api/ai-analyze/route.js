import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gemini-3.6-flash";
const INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

const schema = {
  type: "object",
  properties: {
    overall: { type: "number", minimum: 1, maximum: 10 },
    tier: { type: "string", enum: ["Sub-5", "LTN", "MTN", "HTN", "Chadlite", "Chad", "Adam"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" }, maxItems: 5 },
    priorities: { type: "array", items: { type: "string" }, maxItems: 5 },
    features: {
      type: "object",
      properties: {
        harmony: { type: "number", minimum: 1, maximum: 10 },
        symmetry: { type: "number", minimum: 1, maximum: 10 },
        jawline: { type: "number", minimum: 1, maximum: 10 },
        cheekbones: { type: "number", minimum: 1, maximum: 10 },
        eyeArea: { type: "number", minimum: 1, maximum: 10 },
        canthalTilt: { type: "number", minimum: 1, maximum: 10 },
        facialProportions: { type: "number", minimum: 1, maximum: 10 },
        midface: { type: "number", minimum: 1, maximum: 10 },
        nose: { type: "number", minimum: 1, maximum: 10 },
        lips: { type: "number", minimum: 1, maximum: 10 },
        skinPresentation: { type: "number", minimum: 1, maximum: 10 },
      },
      required: [
        "harmony", "symmetry", "jawline", "cheekbones", "eyeArea",
        "canthalTilt", "facialProportions", "midface", "nose", "lips",
        "skinPresentation",
      ],
    },
  },
  required: ["overall", "tier", "confidence", "summary", "strengths", "priorities", "features"],
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

function getModel() {
  const model = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  return model.replace(/^models\//, "") || DEFAULT_MODEL;
}

function extractOutputText(interaction) {
  if (typeof interaction?.output_text === "string" && interaction.output_text.trim()) {
    return interaction.output_text.trim();
  }

  const text = (interaction?.steps || [])
    .filter((step) => step?.type === "model_output")
    .flatMap((step) => step?.content || [])
    .filter((content) => content?.type === "text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Gemini returned no structured analysis.");
  return text;
}

function clean(raw) {
  const f = {};
  for (const [key, value] of Object.entries(raw.features || {})) {
    f[key] = Math.round(clamp(value, 1, 10) * 10) / 10;
  }

  return {
    numeric: Math.round(clamp(raw.overall, 1, 10) * 10) / 10,
    tier: String(raw.tier || "MTN"),
    confidence: Math.round(clamp(raw.confidence, 0, 1) * 100) / 100,
    summary: String(raw.summary || "AI visual assessment completed."),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.slice(0, 5).map(String) : [],
    priorities: Array.isArray(raw.priorities) ? raw.priorities.slice(0, 5).map(String) : [],
    aiFeatures: f,
    version: "LUMINA vision engine • Gemini 3.6 Flash",
  };
}

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });

  try {
    const body = await request.json();
    const image = String(body?.image || "");
    const geometry = body?.geometry || {};
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);

    if (!match) return NextResponse.json({ error: "Invalid image payload." }, { status: 400 });
    if (match[2].length > 2500000) return NextResponse.json({ error: "Image payload is too large." }, { status: 413 });

    const prompt = `You are LUMINA's facial-aesthetics vision model. Analyze the supplied FRONT-FACING face photo and return only the requested JSON.

This is an appearance-analysis product, not a medical diagnosis. Do not identify the person, infer sensitive traits, or guess age. Judge only visible facial aesthetics and presentation.

PSL CALIBRATION (important): 1–2 extremely far below ordinary; 3–4 below average; 4.5–5.2 ordinary/average; 5.3–6.2 clearly above average; 6.3–7.2 high-tier; 7.3–8.2 very attractive/model-adjacent; 8.3–9.0 exceptional and rare; 9.1–10 extraordinarily rare elite territory and very uncommon. Do NOT collapse strong faces toward 5 merely because the photo is a normal selfie.

Judge the whole visual package: global harmony, visible symmetry, jaw/lower third, cheekbones/midface, eye area, visually apparent canthal tilt, facial proportions/thirds, midface balance, nose harmony, lips/mouth harmony, and skin presentation. Do not pretend a 2D image reveals exact 3D bone anatomy. Do not over-penalize temporary blemishes, lighting or camera noise.

Browser geometry is SUPPORTING EVIDENCE only, not the score:
${JSON.stringify(geometry)}

Return 1–10 scores with one decimal. Overall is a holistic judgment, not a simple average. Tier must be exactly one of Sub-5, LTN, MTN, HTN, Chadlite, Chad, Adam. Keep summary concise. Priorities should be actionable appearance areas, not medical advice.`;

    const response = await fetch(INTERACTIONS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model: getModel(),
        store: false,
        input: [
          { type: "text", text: prompt },
          { type: "image", mime_type: match[1], data: match[2] },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema,
        },
        generation_config: {
          thinking_level: "low",
          max_output_tokens: 900,
        },
      }),
      signal: AbortSignal.timeout(22000),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: json?.error?.message || "Gemini request failed." },
        { status: response.status },
      );
    }

    if (json?.status === "failed") {
      return NextResponse.json(
        { error: json?.error?.message || "Gemini interaction failed." },
        { status: 502 },
      );
    }

    const rawText = extractOutputText(json);
    return NextResponse.json(clean(JSON.parse(rawText)));
  } catch (error) {
    return NextResponse.json({ error: error?.message || "AI analysis failed." }, { status: 500 });
  }
}
