LUMINA — COMPLETE BUG / FIX AUDIT
=================================
Generated: 2026-08-16

CRITICAL PATH
- Camera state contradiction (A1, A2, K81)
- Vercel build fails on ort.node.min.mjs (J73-J74)
- ONNX/Gemini remnants (G50-G53)
- Auth bypass via client hiding (H58-H59)
- Measurements not landmark-based (D26-D27, E37)

PHASE 0 — CLEAN BUILD
1. rm -rf node_modules .next package-lock.json
2. ensure package.json only has: next, react, react-dom, firebase, @mediapipe/tasks-vision
3. npm install
4. npm run build (must succeed, no ort.node.min.mjs)
5. verify: grep -r "onnxruntime" . --exclude-dir=.next --exclude-dir=node_modules (expect 0)
6. verify: grep -r "gemini" . --exclude-dir=.next --exclude-dir=node_modules (expect 0)
7. delete /api/ai-analyze if exists

PHASE 1 — CAMERA STATE MACHINE
Implement useCamera() hook with states: IDLE, REQUESTING_PERMISSION, CAMERA_READY, FACE_DETECTING, SCANNING, ANALYZING, COMPLETE, ERROR
- Derive error from actual MediaStream, not old catch
- Clear error immediately after video.srcObject = stream && video.readyState >= 2
- Stop all tracks on unmount, on complete, on error
- Guard all navigator.mediaDevices calls with typeof window !== 'undefined' and useEffect
- No SSR import of camera code

PHASE 2 — FACE DETECTION PIPELINE
- Add @mediapipe/tasks-vision (browser-only, WASM, no ONNX)
- Load FaceLandmarker in client mount only
- Validation before scan:
  - exactly 1 face (reject 0, reject 2+)
  - face size 25-60% of frame height
  - yaw/pitch/roll < 15 degrees
  - brightness mean 60-200, contrast > 30
  - eyes level within 5 degrees
- Require 15 stable frames (landmark jitter < 2%) before SCANNING → ANALYZING
- Draw real landmarks: contour (0-16), eyebrows, eyes, nose, lips, symmetry axis

PHASE 3 — MEASUREMENTS & PSL
- Normalize all by inter-pupillary distance
- Face shape = height/width, jaw/cheek, forehead/cheek ratios
- Symmetry = left/right landmark distance differences
- Jawline = gonion width / zygomatic width
- Canthal tilt = atan2(dy,dx) of eye corners
- Component scores 0-100, overall = weighted sum
- Round to 1 decimal, show confidence 0-100
- Reject if confidence < 70

PHASE 4 — AUTH & DATA
- middleware.ts: protect /dashboard/*
- API routes: verify Firebase ID token server-side
- No file inputs anywhere
- Remove Google auto-create, require email/password register then login
- DB write: only {userId from session, measurements, scores, confidence, timestamp}, never image
- Prevent duplicates: check last scan < 5s

PHASE 5 — UI SYNC
- Button labels follow state
- Error banner only when state === ERROR
- Show status: "Detecting face", "Move closer", "Hold still", etc.
- Stop all animations on COMPLETE/ERROR/unmount

ACCEPTANCE TESTS (from audit M)
[ ] npm install, npm run build succeed
[ ] no ort.node.min.mjs
[ ] no ONNX, no Gemini
[ ] no /api/ai-analyze, no file input
[ ] unauthenticated /dashboard blocked
[ ] camera permission works, error clears
[ ] preview shows actual face
[ ] exactly one face required, multiple rejected
[ ] landmarks follow face, overlay resizes
[ ] scan uses real frames, not timer
[ ] camera stops after complete
[ ] same face = stable result
[ ] poor quality rejected
[ ] face shape, PSL, components calculated from geometry
[ ] confidence shown
[ ] no raw image saved
[ ] failed scan creates no DB record
[ ] Vercel production deploys
