# LUMINA — Free Face Analysis & Looksmaxxing Coach

LUMINA is a Vercel-ready Next.js web app for repeatable facial-geometry analysis and personalized self-improvement guidance.

## What changed in this build

- Replaced the old score-compression heuristic with a deterministic geometry engine.
- The same image produces the same measurements and score.
- Score is built from multiple measurable features instead of a fixed/default value.
- Added eye area, nose proportion, lip proportion, jaw/face, jaw/cheek, thirds, midface, symmetry and skin/image-quality metrics.
- Results are stored locally first so Firestore can never block the result screen.
- Added a hard navigation fallback for mobile browsers if a client-side route transition stalls.
- Result report includes the analyzed image, feature bars, raw measurements and timestamp.
- Camera analysis remains visible and user initiated.
- No Telegram sender, hidden camera, IP harvesting or hidden telemetry is included.

## Research-informed product flow

The UX is intentionally based on the common looksmaxxing-app pattern: scan → overall score → feature breakdown → improvement roadmap → re-scan/progress. Public UMAX materials describe facial symmetry, golden-ratio/proportion analysis, jawline/structure, canthal tilt, cheekbones and personalized improvement guidance as core analysis concepts.

This implementation does **not** copy UMAX's proprietary model, prompts, weights, backend or branding. The scoring engine is local and deterministic so users can see what is actually being measured.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Firebase

Create a Firebase project, enable Email/Password (and optionally Google) authentication, create Firestore, and set the `NEXT_PUBLIC_FIREBASE_*` values from `.env.local.example`.

## Vercel

Import the GitHub repository as a Next.js project and add the Firebase environment variables in Project Settings → Environment Variables.

No Telegram environment variables are required.

## Important limitation

A 2D selfie cannot reveal true 3D bone structure or provide an objective attractiveness score. LUMINA therefore calls its result a **heuristic composite score** based on visible geometry and image quality. It is designed for consistency and self-tracking, not medical or scientific diagnosis.
