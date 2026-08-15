# LUMINA

A free, privacy-first AI-assisted facial proportion and symmetry analysis app built with Next.js, MediaPipe Face Mesh and Firebase.

## What changed

- Removed Telegram/telemetry functionality.
- No IP collection or device fingerprinting.
- No hidden camera capture.
- Camera analysis is optional, visible, and requires browser permission.
- Upload analysis runs client-side.
- Results and history can be stored in the user's Firebase account.

## Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.local.example` to `.env.local`.
3. Create a Firebase project and enable Email/Password and Google Authentication.
4. Create a Firestore database.
5. Add your Firebase web-app values to `.env.local`.
6. Run:
   `npm run dev`
7. Open the local URL shown by Next.js.

## Firestore shape

`users/{uid}/history/{analysisId}` stores the analysis result and timestamp.

For production, add Firestore security rules so users can only read/write their own `users/{uid}` document and subcollections.

## Important limitation

The rating is a heuristic visualization of selected facial proportions. It is not a scientific attractiveness measurement, medical assessment, or prediction of social outcomes. Skin scoring is also a simple image heuristic and should not be treated as dermatological diagnosis.

## Deployment

Deploy the repository to Vercel, add the same `NEXT_PUBLIC_FIREBASE_*` variables in the Vercel project settings, then deploy.
