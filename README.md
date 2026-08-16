# LUMINA — Local Facial Analysis

LUMINA is a camera-only facial analysis web app. The scanner does not accept arbitrary image uploads and does not use Gemini/OpenRouter for analysis.

## Flow

`Register → Login → Start Face Scan → MediaPipe landmark scan → local beauty model + geometry → PSL-style report`

### Scanner

- Front-camera only.
- No file picker / drag-and-drop upload.
- Only one face is accepted.
- The scan starts with `START FACE SCAN`.
- There is no Stop button; the camera stops automatically after completion or failure.
- The live overlay renders landmarks, jaw/brow/eye/nose/lip guides, facial midline, thirds, symmetry guide and animated scan beam.
- The scanner waits for a centered, relatively stable face before scoring.

### Local scoring

The browser runs:
- MediaPipe Face Mesh for 468/478 landmark tracking.
- A browser ONNX EfficientNet beauty model published by `kale-eb/moggle-model`.
- The model project's README reports training using SCUT-FBP5500, MEBeauty and FairFace and reports a 0.8779 Pearson test correlation.
- A deterministic facial-geometry engine calculates symmetry, jaw/cheek ratios, eye spacing, canthal tilt, facial thirds, nose/lip proportions and face shape.
- The final report exposes the model score, geometry measurements and PSL-style tier.

**Licensing:** the upstream model project and its underlying datasets have their own terms. SCUT-FBP5500's original authors state that the dataset is for non-commercial research use and request contact for commercial use. Do not launch a commercial service using those assets until their terms are cleared.

### Storage

After a completed scan, only the analysis result/metadata is stored in the user's local storage and Firestore history. Camera frames are not uploaded by the scanner.

## Environment

Firebase client configuration is required for authentication/history:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

No Gemini, OpenRouter or Telegram credentials are required.

## Run

```bash
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```
