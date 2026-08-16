# LUMINA — AI PSL Face Analysis

LUMINA is a Next.js/Vercel facial-analysis app with a **real multimodal AI scoring pass** plus browser-side MediaPipe measurements. The old geometry-only score is no longer the primary rating, so different faces are not compressed into the same 5.x result.

## Analysis architecture

1. The browser normalizes the uploaded photo and detects the face with MediaPipe Face Mesh.
2. It extracts supporting geometry: face proportions, jaw/cheek ratios, eye spacing, facial thirds, midface, nose/lip ratios and symmetry.
3. A compressed copy of the image is sent to `/api/ai-analyze`.
4. The server calls Gemini 2.5 Flash with a calibrated PSL rubric and the measured geometry as supporting evidence. Gemini returns structured JSON containing the overall score, tier, confidence, feature scores, strengths and priorities.
5. The AI result is saved locally first; Firestore history is attempted in the background so a database delay cannot block the result page.

Google documents Gemini's multimodal image input and structured JSON output support. Gemini 2.5 Flash currently has a free API tier subject to rate limits.

## PSL calibration

The model is explicitly instructed not to anchor every face around 5.0. The calibration uses broad rarity bands: average faces around 4.5–5.2, clearly above average around 5.3–6.2, high-tier around 6.3–7.2, model-adjacent around 7.3–8.2, exceptional around 8.3–9.0, and 9.1+ only for extraordinarily rare faces. These are community-style labels, not a scientific standard.

The app does **not** pretend to have UMAX's proprietary weights or training data. A public SCUT-FBP5500 research model can be useful for experimentation, but the original dataset terms restrict commercial use; therefore it is not bundled as a hidden dependency.

## Setup

### 1. Install

```bash
npm install
npm run dev
```

### 2. Firebase

Enable Email/Password authentication and Firestore. Add the `NEXT_PUBLIC_FIREBASE_*` values from `.env.local.example`.

### 3. Gemini

Create a Google AI Studio API key and add: 

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
```

Keep `GEMINI_API_KEY` server-side. Do not prefix it with `NEXT_PUBLIC_`.

### 4. Vercel

Add the same Firebase variables plus `GEMINI_API_KEY` and `GEMINI_MODEL` under Project Settings → Environment Variables. Redeploy after changing variables.

## Important

A 2D selfie cannot objectively reveal true 3D bone structure or produce a universal attractiveness truth. The AI result is a visual-perception estimate calibrated to the requested PSL-style scale. Lighting, camera, expression, hairstyle and grooming can materially affect it.

No Telegram sender, hidden camera, IP harvesting or covert telemetry is included. Camera analysis is visible and user initiated.
