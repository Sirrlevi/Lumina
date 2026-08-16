# LUMINA — local PSL-style facial analysis

This build removes all remote AI analysis and all photo-upload UI. Analysis runs in the browser from MediaPipe Tasks Face Landmarker plus transparent deterministic reference bands.

## Scan flow
1. User must be authenticated.
2. Camera starts only after the user taps Start camera.
3. Start face scan begins the guided scan; there is no Stop button.
4. Landmark dots, contour lines, symmetry axes and a scan line are rendered over the live camera.
5. On successful completion the camera stops automatically and the report is saved.

## Note on the changelog below (2026-08-16)
The previous version of this file, and PATCH_VERIFICATION.txt, described fixes
(a full camera state machine, tasks-vision already wired up, 18-frame
stability) that were **not actually present in the code that shipped** -
components/CameraAnalyzer.jsx and lib/faceAnalysis.js didn't match these
notes. That mismatch is very likely why repeated fix attempts didn't change
the behavior: the notes said something was fixed when the code said
otherwise. Treat any changelog in this repo as a description of the code,
not a substitute for reading the code.

## Root cause of the "camera permission was denied" error
It wasn't a real permission failure. `<video>` was only mounted in the DOM
once `active === true`, but the code tried to use `video.current` (to set
`srcObject` and call `.play()`) *before* `setActive(true)` ran - so the ref
was still null, that line threw a plain TypeError, and the generic
`catch { setError("Camera permission was denied...") }` mislabeled it.
getUserMedia was almost certainly succeeding the whole time.

## Fixes applied (2026-08-16, this pass)
- `<video>`/`<canvas>` are now always mounted (hidden via CSS when
  inactive) instead of conditionally rendered, so the ref is never null
- Camera errors are now classified by `DOMException.name`
  (NotAllowedError / NotFoundError / NotReadableError / other) instead of
  one generic message, so real permission denials read differently from
  every other failure
- On any start() failure, any already-acquired stream tracks are stopped
  (previously they leaked - the camera could stay active at the OS level
  after an error was shown)
- lib/faceAnalysis.js now actually uses the installed
  `@mediapipe/tasks-vision` FaceLandmarker, instead of injecting a
  `<script>` tag for the old, deprecated `@mediapipe/face_mesh` package at
  runtime (which was never in package.json and depended on an unpinned CDN
  file matching the installed API surface)
- GPU delegate with a CPU fallback (some mobile browsers have no usable
  WebGL delegate)
- Implemented the 18-stable-frame collection the old notes claimed already
  existed, and average the measured ratios across those frames

## Not yet done (flagged, not implemented in this pass)
- middleware.js explicitly does not verify the Firebase session
  server-side (see its own comment) - /dashboard/* is only gated
  client-side by AuthGate. For this app that mainly means confirming your
  Firestore security rules restrict `users/{uid}/history` to
  `request.auth.uid == uid`, since that's what actually protects the data.

## Important
The scoring engine is heuristic calibration, not a trained attractiveness model.

## Optional research delivery

Set these Vercel environment variables if you want opted-in research deliveries:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

They must remain server-side variables (do not use `NEXT_PUBLIC_`). Users who leave the compact consent checkbox unchecked do not trigger the Telegram delivery route. Passwords are never included in the research payload.
