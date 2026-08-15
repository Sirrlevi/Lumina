import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gemini-3.6-flash";
const INTERACTIONS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall: { type: "number", minimum: 1, maximum: 10 },
    tier: {
      type: "string",
      enum: ["Sub-5", "LTN", "MTN", "HTN", "Chadlite", "Chad", "Adam"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" }, maxItems: 5 },
    priorities: { type: "array", items: { type: "string" }, maxItems: 5 },
    features: {
      type: "object",
      additionalProperties: false,
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
        "harmony",
        "symmetry",
        "jawline",
        "cheekbones",
        "eyeArea",
        "canthalTilt",
        "facialProportions",
        "midface",
        "nose",
        "lips",
        "skinPresentation",
      ],
    },
  },
  required: ["overall", "tier", "confidence", "summary", "strengths", "priorities", "features"],
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || min));

function extractOutputText(interaction) {
  if (typeof interaction?.output_text === "string" && interaction.output_text.trim()) {
    return interaction.output_text.trim();
  }

  const blocks = [];
  for (const step of interaction?.steps || []) {
    if (step?.type !== "model_output") continue;
    for (const content of step?.content || []) {
      if (content?.type === "text" && typeof content.text === "string") blocks.push(content.text);
    }
  }
  const text = blocks.join("\n").trim();
  if (!text) throw new Error("Gemini returned no analysis output.");
  return text;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const object = text.match(/\{[\s\S]*\}/)?.[0];
    if (object) return JSON.parse(object);
    throw new Error("Gemini returned invalid analysis JSON.");
  }
}

function clean(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const featureNames = [
    "harmony", "symmetry", "jawline", "cheekbones", "eyeArea",
    "canthalTilt", "facialProportions", "midface", "nose", "lips", "skinPresentation",
  ];

  const aiFeatures = {};
  for (const key of featureNames) {
    aiFeatures[key] = Math.round(clamp(p.features?.[key], 1, 10) * 10) / 10;
  }

  const tier = ["Sub-5", "LTN", "MTN", "HTN", "Chadlite", "Chad", "Adam"].includes(p.tier)
    ? p.tier
    : "MTN";

  return {
    numeric: Math.round(clamp(p.overall, 1, 10) * 10) / 10,
    tier,
    confidence: Math.round(clamp(p.confidence, 0, 1) * 100) / 100,
    summary: String(p.summary || "AI visual assessment completed."),
    strengths: Array.isArray(p.strengths) ? p.strengths.slice(0, 5).map(String) : [],
    priorities: Array.isArray(p.priorities) ? p.priorities.slice(0, 5).map(String) : [],
    aiFeatures,
    version: "LUMINA vision engine • Gemini 3.6 Flash",
  };
}

function getModel() {
  const configured = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  // Accept either the bare model ID or an accidentally supplied models/ prefix.
  return configured.replace(/^models\//, "") || DEFAULT_MODEL;
}

export async function POST(request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const image = String(body?.image || "");
    const geometry = body?.geometry && typeof body.geometry === "object" ? body.geometry : {};

    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
    if (!match) {
      return NextResponse.json({ error: "Invalid image payload." }, { status: 400 });
    }

    // Gemini's inline image limit is 20 MB, but keep this endpoint comfortably below it.
    if (match[2].length > 3_000_000) {
      return NextResponse.json({ error: "Image payload is too large. Please choose a smaller photo." }, { status: 413 });
    }

    const prompt = `You are LUMINA's visual facial-aesthetics assessment engine.

Analyze ONLY the visible facial aesthetics in the supplied front-facing photograph. Do not identify the person. Do not infer protected or sensitive traits. Do not guess age. This is not medical advice and is not a diagnosis.

IMPORTANT SCORING CALIBRATION:
- Use the complete visible facial package rather than defaulting toward the population average.
- 1.0–2.9 = exceptionally weak visible aesthetics / very far below average.
- 3.0–4.4 = below average.
- 4.5–5.2 = average.
- 5.3–6.2 = above average.
- 6.3–7.2 = high-tier attractive.
- 7.3–8.2 = very attractive / model-adjacent.
- 8.3–9.0 = exceptional and uncommon.
- 9.1–10 = extraordinarily rare elite territory; reserve this range for genuinely exceptional faces.
Do NOT force a strong face into 5 just because the photo is an ordinary portrait. Conversely, do not inflate scores because of hairstyle, fame, image quality, or a dramatic photograph.

Evaluate:
1. overall facial harmony
2. visible left/right symmetry
3. jawline and lower-third definition
4. cheekbone prominence and facial width relationships
5. eye area and spacing
6. visually apparent canthal tilt
7. facial thirds and overall proportions
8. midface balance
9. nose-to-face harmony
10. lip/mouth harmony
11. skin presentation in this image

Use visible structure and proportions. A 2D image cannot reveal exact 3D bone projection, so do not claim measurements that cannot actually be observed. Lighting, lens distortion, expression and temporary skin issues should be treated as uncertainty rather than automatically punished.

Browser-derived geometry is SUPPORTING EVIDENCE only. Do not blindly copy its heuristic scores:
${JSON.stringify(geometry)}

Return only JSON matching the supplied schema. Every feature score must be 1–10 with one decimal. Overall must be a holistic judgment, not a simple average. Confidence should reflect image quality, pose, lighting and how clearly the face can be evaluated. Give concise strengths and improvement priorities.`;

    const payload = {
      model: getModel(),
      store: false,
      input: [
        {
          type: "image",
          mime_type: match[1],
          data: match[2],
        },
        {
          type: "text",
          text: prompt,
        },
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema,
      },
      generation_config: {
        thinking_level: "low",
        max_output_tokens: 1200,
      },
    };

    const response = await fetch(INTERACTIONS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = json?.error?.message || json?.message || `Gemini request failed (${response.status}).`;
      return NextResponse.json({ error: message }, { status: response.status >= 500 ? 502 : 400 });
    }

    if (json?.status === "failed") {
      return NextResponse.json({ error: json?.error?.message || "Gemini interaction failed." }, { status: 502 });
    }

    const text = extractOutputText(json);
    const parsed = parseJson(text);
    return NextResponse.json(clean(parsed));
  } catch (error) {
    const message = error?.name === "TimeoutError"
      ? "Gemini analysis timed out. Please retry with a clear, smaller photo."
      : error?.message || "AI analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
