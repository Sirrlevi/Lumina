# LUMINA — local PSL-style facial analysis

This build removes all remote AI analysis and all photo-upload UI. Analysis runs in the browser from MediaPipe Face Mesh landmarks plus transparent deterministic reference bands.

## Scan flow
1. User must be authenticated.
2. Camera starts only after the user taps Start camera.
3. Start face scan begins the guided scan; there is no Stop button.
4. Landmark dots, contour lines, symmetry axes and a scan line are rendered over the live camera.
5. On successful completion the camera stops automatically and the report is saved.

## Important
The scoring engine is heuristic calibration, not a trained attractiveness model. A genuine trained model requires a labeled reference dataset and a training/evaluation pipeline; this project does not pretend otherwise.
