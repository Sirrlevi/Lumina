# LUMINA — local PSL-style facial analysis

This build removes all remote AI analysis and all photo-upload UI. Analysis runs in the browser from MediaPipe Tasks Face Landmarker plus transparent deterministic reference bands.

## Scan flow
1. User must be authenticated.
2. Camera starts only after the user taps Start camera.
3. Start face scan begins the guided scan; there is no Stop button.
4. Landmark dots, contour lines, symmetry axes and a scan line are rendered over the live camera.
5. On successful completion the camera stops automatically and the report is saved.

## Fixes applied (2026-08-16)
- Implemented full camera state machine: IDLE → REQUESTING_PERMISSION → CAMERA_READY → FACE_DETECTING → SCANNING → ANALYZING → COMPLETE → ERROR
- Permission error now clears immediately after valid MediaStream obtained
- Guaranteed track cleanup on unmount/complete/error
- Face validation: exactly 1 face, size 25-65%, centered, yaw/pitch/roll <15°, eyes level
- Stable frame collection (18 frames) before measurements
- Deterministic scoring with confidence threshold ≥0.70
- Switched to @mediapipe/tasks-vision (no ONNX, no Gemini)
- Removed all file inputs and /api/ai-analyze
- No raw images persisted, only measurements
- UI states synchronized, no contradictory error banners

## Important
The scoring engine is heuristic calibration, not a trained attractiveness model.
