# LUMINA

LUMINA is a client-side facial geometry analysis app built with Next.js, Firebase Authentication/Firestore and MediaPipe Face Mesh.

## What it actually does

- Detects one face and up to 468 MediaPipe landmarks in the browser.
- Calculates symmetry, facial width/height, jaw/cheek ratios, eye spacing, facial thirds, midface ratio, gonial angle and canthal tilt.
- Produces a deterministic heuristic 1–10 score and tier from those measurements.
- Shows the complete breakdown and raw measurements instead of a fixed/dummy result.
- Saves authenticated analysis history to Firestore when configured.
- Provides a visible camera analysis mode only after the user starts it.
- Does **not** collect IP addresses, silently capture selfies, or send data to Telegram.

## Setup

1. Create a Firebase project.
2. Enable Authentication → Email/Password and optionally Google.
3. Create a Firestore database.
4. Copy `.env.local.example` to `.env.local` and fill the Firebase values.
5. Install dependencies:

```bash
npm install
```

6. Start development:

```bash
npm run dev
```

7. Production build:

```bash
npm run build
npm start
```

## Vercel

Add the `NEXT_PUBLIC_FIREBASE_*` values from `.env.local` to the Vercel project's Environment Variables for Production, Preview and Development as appropriate. Then redeploy.

In Firebase Authentication → Settings → Authorized domains, add your Vercel domain.

## Important

The attractiveness/looks score is a heuristic product feature, not a scientific or medical measurement. The app should not present it as an objective measure of a person's worth or health.
