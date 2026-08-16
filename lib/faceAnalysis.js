import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { analyzeSkin } from './skinAnalysis';
import { REFERENCE, TIER_BANDS } from './referenceData';

const clamp = (v, min = 1, max = 10) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
const round = (v, d = 2) => Number(Number(v).toFixed(d));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const scoreBand = (v, r) => clamp(r.inverse ? 10 - (Math.abs(v - r.target) / r.tolerance) * 3.6 : 10 - (Math.abs(v - r.target) / r.tolerance) * 4.5, 1, 10);
const tierFor = (s) => { for (const [min, t] of TIER_BANDS) if (s < min) return t; return 'Adam'; };
const eyeTilt = (inner, outer) => Math.atan2(inner.y - outer.y, outer.x - inner.x) * 180 / Math.PI;

function classifyShape({ faceRatio, jawRatio, cheekRatio, thirds }) {
  if (faceRatio >= .84 && faceRatio <= .98 && jawRatio >= .84) return 'Square';
  if (faceRatio >= .88 && cheekRatio >= .74) return 'Round';
  if (faceRatio < .72) return 'Oblong';
  if (cheekRatio > .80 && jawRatio < .78) return 'Diamond';
  if (thirds < .90 && jawRatio < .80) return 'Heart';
  return 'Oval';
}

// ---- MediaPipe Tasks Vision -------------------------------------------
// package.json already declares @mediapipe/tasks-vision, but this file was
// still dynamically injecting a <script> tag for the OLD, separate
// @mediapipe/face_mesh "Solutions" package from a CDN at runtime
// (window.FaceMesh / mesh.onResults / mesh.send). That package is
// deprecated and was never actually installed - it only ever worked if the
// CDN script happened to load. This version uses the bundled, installed
// FaceLandmarker API directly, matching what package.json and the README
// already claimed was in place.
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

async function createLandmarker(delegate) {
  const filesetResolver = await FilesetResolver.forVisionTasks(WASM_BASE);
  return FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    outputFaceBlendshapes: false,
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.6,
    minFacePresenceConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });
}

let landmarkerPromise = null;
function loadFaceLandmarker() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Face analysis runs in the browser.'));
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = createLandmarker("GPU")
    .catch(() => createLandmarker("CPU")) // some mobile browsers have no usable WebGL delegate
    .catch((e) => {
      landmarkerPromise = null; // don't cache a rejected promise forever - allow retry
      throw new Error('Could not load the face model. Check your connection and retry.');
    });
  return landmarkerPromise;
}

// Measures one landmark frame. Throws if the framing is unusable so the
// caller can just skip that frame and keep collecting.
function measureFrame(L) {
  const top = L[10], chin = L[152], noseTip = L[1], noseBase = L[2], glabella = L[168];
  const leftFace = L[234], rightFace = L[454], leftJaw = L[172], rightJaw = L[397];
  const leftCheek = L[127], rightCheek = L[356];
  const leftEyeOuter = L[33], leftEyeInner = L[133], rightEyeInner = L[362], rightEyeOuter = L[263];
  const leftEyeTop = L[159], leftEyeBottom = L[145], rightEyeTop = L[386], rightEyeBottom = L[374];
  const leftBrow = L[105], rightBrow = L[334];
  const noseLeft = L[129], noseRight = L[358];
  const mouthLeft = L[61], mouthRight = L[291];
  const upperLip = L[13], lowerLip = L[14];

  const faceWidth = dist(leftFace, rightFace);
  const faceHeight = dist(top, chin);
  if (faceWidth < .05 || faceHeight < .08) {
    throw new Error('Face detected, but your head angle or framing is not suitable.');
  }

  const upperThird = dist(top, glabella), midThird = dist(glabella, noseBase), lowerThird = dist(noseBase, chin);
  const thirdsMean = avg([upperThird, midThird, lowerThird]);
  const thirdsDeviation = avg([Math.abs(upperThird - thirdsMean), Math.abs(midThird - thirdsMean), Math.abs(lowerThird - thirdsMean)]) / faceHeight;

  const eyeDistance = dist(leftEyeInner, rightEyeInner);
  const eyeSpan = avg([dist(leftEyeOuter, leftEyeInner), dist(rightEyeInner, rightEyeOuter)]);
  const eyeHeight = avg([dist(leftEyeTop, leftEyeBottom), dist(rightEyeTop, rightEyeBottom)]);
  const interEyeRatio = eyeDistance / faceWidth;
  const eyeAspect = eyeHeight / eyeSpan;

  const jawWidth = dist(leftJaw, rightJaw), cheekWidth = dist(leftCheek, rightCheek);
  const jawToFace = jawWidth / faceWidth, jawToCheek = jawWidth / cheekWidth, cheekToFace = cheekWidth / faceWidth;
  const faceRatio = faceWidth / faceHeight;

  const canthalTilt = avg([eyeTilt(leftEyeInner, leftEyeOuter), eyeTilt(rightEyeInner, rightEyeOuter)]);
  const browEyeRatio = avg([dist(leftBrow, leftEyeTop), dist(rightBrow, rightEyeTop)]) / faceHeight;
  const noseWidth = dist(noseLeft, noseRight) / faceWidth;
  const mouthWidth = dist(mouthLeft, mouthRight) / faceWidth;
  const lipHeight = dist(upperLip, lowerLip) / faceHeight;
  const chinProjection2d = dist(noseTip, chin) / faceHeight;

  const pairs = [[33,263],[133,362],[61,291],[76,306],[127,356],[172,397],[58,288],[130,359],[46,276],[55,285],[70,300],[105,334]];
  const midX = noseTip.x;
  const symmetry = clamp(10 - avg(pairs.map(([a, b]) => Math.abs(Math.abs(L[a].x - midX) - Math.abs(L[b].x - midX)) / faceWidth)) * 70, 1, 10);

  const metrics = {
    faceWidthHeight: faceRatio, jawToFace, jawToCheek, cheekToFace,
    eyeSpacingRatio: interEyeRatio, eyeAspectRatio: eyeAspect,
    facialThirdsDeviation: thirdsDeviation,
    midfaceRatio: midThird / Math.max(lowerThird, .001),
    canthalTilt, noseWidthRatio: noseWidth, mouthWidthRatio: mouthWidth,
    lipHeightRatio: lipHeight, browEyeRatio, chinProjectionRatio: chinProjection2d,
  };
  const shape = classifyShape({ faceRatio, jawRatio: jawToCheek, cheekRatio: cheekToFace, thirds: upperThird / Math.max(lowerThird, .001) });

  return { metrics, faceRatio, symmetry, shape, noseWidth, mouthWidth, interEyeRatio, eyeAspect, thirdsDeviation, jawToFace, cheekToFace };
}

export async function analyzeFace(videoEl, onProgress, onLandmarks) {
  if (typeof window === 'undefined') throw new Error('Face analysis runs in the browser.');
  onProgress?.({ step: 1, progress: 8, label: 'Preparing scan' });

  const landmarker = await loadFaceLandmarker();
  onProgress?.({ step: 2, progress: 20, label: 'Loading face mesh' });

  const REQUIRED_STABLE_FRAMES = 18;
  const TIMEOUT_MS = 30000;
  const startedAt = performance.now();
  const frames = [];
  let lastLandmarks = null;

  while (frames.length < REQUIRED_STABLE_FRAMES) {
    if (performance.now() - startedAt > TIMEOUT_MS) {
      throw new Error('Face analysis timed out. Keep your face centered and retry.');
    }
    const result = landmarker.detectForVideo(videoEl, performance.now());
    const L = result.faceLandmarks?.[0];
    if (L) {
      lastLandmarks = L;
      onLandmarks?.(L);
      try {
        frames.push(measureFrame(L));
        const pct = 38 + Math.round((frames.length / REQUIRED_STABLE_FRAMES) * 17);
        onProgress?.({ step: 3, progress: Math.min(55, pct), label: 'Mapping facial landmarks' });
      } catch {
        // framing not usable on this frame - skip it, keep collecting
      }
    }
    await new Promise((r) => requestAnimationFrame(r));
  }
  if (!lastLandmarks) throw new Error('Face analysis failed. Try again.');

  onProgress?.({ step: 4, progress: 60, label: 'Measuring structure and symmetry' });

  // Average across the stable frames instead of trusting a single frame.
  const faceRatio = avg(frames.map((f) => f.faceRatio));
  const symmetry = avg(frames.map((f) => f.symmetry));
  const noseWidth = avg(frames.map((f) => f.noseWidth));
  const mouthWidth = avg(frames.map((f) => f.mouthWidth));
  const interEyeRatio = avg(frames.map((f) => f.interEyeRatio));
  const eyeAspect = avg(frames.map((f) => f.eyeAspect));
  const thirdsDeviation = avg(frames.map((f) => f.thirdsDeviation));
  const jawToFace = avg(frames.map((f) => f.jawToFace));
  const cheekToFace = avg(frames.map((f) => f.cheekToFace));
  const shape = frames[frames.length - 1].shape;
  const metrics = {};
  for (const k of Object.keys(frames[0].metrics)) metrics[k] = avg(frames.map((f) => f.metrics[k]));

  const skinCanvas = document.createElement('canvas');
  skinCanvas.width = videoEl.videoWidth;
  skinCanvas.height = videoEl.videoHeight;
  skinCanvas.getContext('2d', { willReadFrequently: true }).drawImage(videoEl, 0, 0, skinCanvas.width, skinCanvas.height);
  const skin = await analyzeSkin(skinCanvas, lastLandmarks);
  metrics.imageQuality = skin.quality;

  onProgress?.({ step: 5, progress: 78, label: 'Calibrating PSL score' });

  const features = {
    harmony: avg([scoreBand(faceRatio, REFERENCE.faceWidthHeight), scoreBand(symmetry, REFERENCE.symmetry), scoreBand(thirdsDeviation, REFERENCE.facialThirdsDeviation), scoreBand(metrics.midfaceRatio, REFERENCE.midfaceRatio)]),
    symmetry: scoreBand(symmetry, REFERENCE.symmetry),
    jawline: scoreBand(jawToFace, REFERENCE.jawToFace),
    cheekbones: scoreBand(cheekToFace, REFERENCE.cheekToFace),
    eyeArea: avg([scoreBand(interEyeRatio, REFERENCE.eyeSpacingRatio), scoreBand(eyeAspect, REFERENCE.eyeAspectRatio)]),
    canthalTilt: scoreBand(metrics.canthalTilt, REFERENCE.canthalTilt),
    facialProportions: avg([scoreBand(faceRatio, REFERENCE.faceWidthHeight), scoreBand(thirdsDeviation, REFERENCE.facialThirdsDeviation)]),
    midface: scoreBand(metrics.midfaceRatio, REFERENCE.midfaceRatio),
    nose: scoreBand(noseWidth, REFERENCE.noseWidthRatio),
    lips: scoreBand(mouthWidth, REFERENCE.mouthWidthRatio),
    skinPresentation: clamp(skin.score, 1, 10),
  };
  const weights = { harmony: .12, symmetry: .15, jawline: .13, cheekbones: .08, eyeArea: .10, canthalTilt: .05, facialProportions: .10, midface: .08, nose: .07, lips: .05, skinPresentation: .07 };
  const numeric = clamp(Object.entries(weights).reduce((s, [k, w]) => s + features[k] * w, 0), 1, 10);
  const rounded = Object.fromEntries(Object.entries(features).map(([k, v]) => [k, round(v, 1)]));
  const sorted = Object.entries(rounded).sort((a, b) => a[1] - b[1]);

  onProgress?.({ step: 6, progress: 92, label: 'Building visual report' });
  await new Promise((r) => setTimeout(r, 250));

  return {
    numeric: round(numeric, 1),
    tier: tierFor(numeric),
    shape,
    symmetry: round(symmetry, 1),
    geometryBreakdown: rounded,
    breakdown: {
      ...rounded,
      eyeSpacing: round(scoreBand(interEyeRatio, REFERENCE.eyeSpacingRatio), 1),
      facialWidthHeight: round(scoreBand(faceRatio, REFERENCE.faceWidthHeight), 1),
      facialThirds: round(scoreBand(thirdsDeviation, REFERENCE.facialThirdsDeviation), 1),
      noseProportion: rounded.nose,
      lipProportion: rounded.lips,
      skin: rounded.skinPresentation,
    },
    metrics: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, round(v, 3)])),
    aiFeatures: rounded,
    strengths: sorted.slice(-4).reverse().map(([k, v]) => `${k} (${v}/10)`),
    priorities: sorted.slice(0, 4).map(([k, v]) => `${k} (${v}/10)`),
    confidence: round(clamp(.72 + Math.min(.22, metrics.imageQuality * .02) - Math.min(.18, Math.abs(faceRatio - .78) * .5), .35, .95), 2),
    summary: `${shape} face with a ${tierFor(numeric)}-tier presentation on LUMINA's local calibration.`,
    analyzedAt: Date.now(),
    version: 'lumina-local-calibration-v4',
    engine: 'Local MediaPipe FaceLandmarker + deterministic reference calibration',
    disclaimer: "LUMINA uses visible 2D landmarks and transparent reference bands. The score is a heuristic appearance metric, not a medical measure or an objective truth about attractiveness.",
  };
}
