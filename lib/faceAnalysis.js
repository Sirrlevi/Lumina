import { FaceMesh } from "@mediapipe/face_mesh";
import { analyzeSkin } from "./skinAnalysis";

const clamp = (v, min = 1, max = 10) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
const round = (v, d = 2) => Number(Number(v).toFixed(d));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const avg = values => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const gaussianScore = (value, target, sigma, floor = 1) => clamp(floor + (10 - floor) * Math.exp(-0.5 * ((value - target) / sigma) ** 2));
const linearScore = (value, ideal, tolerance) => clamp(10 - Math.abs(value - ideal) / tolerance * 6);

const tierFor = score => {
  if (score < 3.5) return "Sub-5";
  if (score < 5.0) return "LTN";
  if (score < 6.2) return "MTN";
  if (score < 7.3) return "HTN";
  if (score < 8.3) return "Chadlite";
  if (score < 9.1) return "Chad";
  return "Adam";
};

export function normalizeImage(input) {
  return new Promise((resolve, reject) => {
    const draw = source => {
      const sw = source.videoWidth || source.naturalWidth || source.width;
      const sh = source.videoHeight || source.naturalHeight || source.height;
      if (!sw || !sh) return reject(new Error("Image has no usable dimensions."));
      const max = 1400;
      const scale = Math.min(1, max / Math.max(sw, sh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    if (input instanceof HTMLImageElement) {
      if (input.complete && input.naturalWidth) draw(input);
      else {
        input.onload = () => draw(input);
        input.onerror = () => reject(new Error("Image could not be decoded."));
      }
    } else draw(input);
  });
}

function eyeTilt(inner, outer) {
  // Positive means the outer corner is higher than the inner corner.
  return Math.atan2(inner.y - outer.y, outer.x - inner.x) * 180 / Math.PI;
}

function classifyShape({ faceRatio, jawRatio, cheekRatio, thirds }) {
  if (faceRatio >= 0.84 && faceRatio <= 0.98 && jawRatio >= 0.84) return "Square";
  if (faceRatio >= 0.88 && cheekRatio >= 0.74) return "Round";
  if (faceRatio < 0.72) return "Oblong";
  if (cheekRatio > 0.80 && jawRatio < 0.78) return "Diamond";
  if (thirds < 0.9 && jawRatio < 0.80) return "Heart";
  if (faceRatio < 0.84 && jawRatio >= 0.80) return "Oval";
  return "Oval";
}

export async function analyzeFace(input, onProgress) {
  if (typeof window === "undefined") throw new Error("Face analysis runs in the browser.");
  const image = await normalizeImage(input);
  onProgress?.({ step: 1, progress: 12, label: "Preparing image" });

  return new Promise((resolve, reject) => {
    let mesh;
    let timer;
    let settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { mesh?.close?.(); } catch {}
      error ? reject(error) : resolve(value);
    };

    timer = setTimeout(() => finish(null, new Error("Face analysis timed out. Check your connection and try again.")), 25000);

    try {
      onProgress?.({ step: 2, progress: 25, label: "Loading face model" });
      mesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      mesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });

      mesh.onResults(async results => {
        if (!results.multiFaceLandmarks?.length) {
          finish(null, new Error("No face detected. Use a front-facing photo with your full face visible."));
          return;
        }
        try {
          onProgress?.({ step: 3, progress: 44, label: "Detecting 468 landmarks" });
          const L = results.multiFaceLandmarks[0];

          const top = L[10], chin = L[152], noseTip = L[1], noseBase = L[2], glabella = L[168];
          const leftFace = L[234], rightFace = L[454];
          const leftJaw = L[172], rightJaw = L[397];
          const leftCheek = L[127], rightCheek = L[356];
          const leftEyeOuter = L[33], leftEyeInner = L[133];
          const rightEyeInner = L[362], rightEyeOuter = L[263];
          const leftEyeTop = L[159], leftEyeBottom = L[145];
          const rightEyeTop = L[386], rightEyeBottom = L[374];
          const leftBrow = L[105], rightBrow = L[334];
          const noseLeft = L[129], noseRight = L[358];
          const mouthLeft = L[61], mouthRight = L[291];
          const upperLip = L[13], lowerLip = L[14];

          const faceWidth = dist(leftFace, rightFace);
          const faceHeight = dist(top, chin);
          if (faceWidth < 0.05 || faceHeight < 0.08) {
            finish(null, new Error("Face detected, but the image angle or crop is not suitable for measurement."));
            return;
          }

          onProgress?.({ step: 4, progress: 62, label: "Measuring facial proportions" });
          const upperThird = dist(top, glabella);
          const midThird = dist(glabella, noseBase);
          const lowerThird = dist(noseBase, chin);
          const thirdsMean = avg([upperThird, midThird, lowerThird]);
          const thirdsDeviation = avg([Math.abs(upperThird - thirdsMean), Math.abs(midThird - thirdsMean), Math.abs(lowerThird - thirdsMean)]) / faceHeight;

          const eyeDistance = dist(leftEyeInner, rightEyeInner);
          const eyeSpanLeft = dist(leftEyeOuter, leftEyeInner);
          const eyeSpanRight = dist(rightEyeInner, rightEyeOuter);
          const leftEyeHeight = dist(leftEyeTop, leftEyeBottom);
          const rightEyeHeight = dist(rightEyeTop, rightEyeBottom);
          const eyeHeight = avg([leftEyeHeight, rightEyeHeight]);
          const interEyeRatio = eyeDistance / faceWidth;
          const eyeAspect = eyeHeight / avg([eyeSpanLeft, eyeSpanRight]);

          const jawWidth = dist(leftJaw, rightJaw);
          const cheekWidth = dist(leftCheek, rightCheek);
          const jawToFace = jawWidth / faceWidth;
          const jawToCheek = jawWidth / cheekWidth;
          const cheekToFace = cheekWidth / faceWidth;
          const faceRatio = faceWidth / faceHeight;

          const leftTilt = eyeTilt(leftEyeInner, leftEyeOuter);
          const rightTilt = eyeTilt(rightEyeInner, rightEyeOuter);
          const canthalTilt = avg([leftTilt, rightTilt]);
          const browEyeLeft = dist(leftBrow, leftEyeTop) / faceHeight;
          const browEyeRight = dist(rightBrow, rightEyeTop) / faceHeight;
          const browEyeRatio = avg([browEyeLeft, browEyeRight]);

          const noseWidth = dist(noseLeft, noseRight) / faceWidth;
          const mouthWidth = dist(mouthLeft, mouthRight) / faceWidth;
          const lipHeight = dist(upperLip, lowerLip) / faceHeight;
          const chinProjection2d = dist(noseTip, chin) / faceHeight;

          // Symmetry is calculated around the nose midline rather than using raw x/y differences.
          const pairs = [[33,263],[133,362],[61,291],[76,306],[127,356],[172,397],[58,288],[130,359],[46,276],[55,285],[70,300],[105,334]];
          const midX = noseTip.x;
          const symmetryErrors = pairs.map(([a,b]) => Math.abs(Math.abs(L[a].x - midX) - Math.abs(L[b].x - midX)) / faceWidth);
          const symmetry = clamp(10 - avg(symmetryErrors) * 70, 1, 10);

          // Scores are broad and deterministic. They are not trained attractiveness labels.
          const featureScores = {
            jawline: gaussianScore(jawToFace, 0.76, 0.105),
            cheekbones: gaussianScore(cheekToFace, 0.73, 0.095),
            eyeSpacing: gaussianScore(interEyeRatio, 0.43, 0.065),
            canthalTilt: gaussianScore(canthalTilt, 4.0, 5.5),
            eyeArea: gaussianScore(eyeAspect, 0.31, 0.10),
            facialWidthHeight: gaussianScore(faceRatio, 0.78, 0.12),
            facialThirds: clamp(10 - thirdsDeviation * 45),
            midface: gaussianScore(midThird / Math.max(lowerThird, 0.001), 0.95, 0.20),
            noseProportion: gaussianScore(noseWidth, 0.19, 0.055),
            lipProportion: gaussianScore(mouthWidth, 0.43, 0.09),
            symmetry,
          };

          const skin = await analyzeSkin(image, L);
          featureScores.skin = skin.score;

          onProgress?.({ step: 5, progress: 80, label: "Calculating scores" });

          const weights = {
            symmetry: 0.15,
            jawline: 0.12,
            cheekbones: 0.09,
            eyeSpacing: 0.08,
            canthalTilt: 0.06,
            eyeArea: 0.08,
            facialWidthHeight: 0.09,
            facialThirds: 0.09,
            midface: 0.07,
            noseProportion: 0.06,
            lipProportion: 0.04,
            skin: 0.07,
          };

          let numeric = Object.entries(weights).reduce((sum, [key, weight]) => sum + featureScores[key] * weight, 0);
          // Avoid the old artificial 5.2 floor/cluster: scores respond continuously to measured differences.
          numeric = clamp(numeric, 1, 10);

          const shape = classifyShape({ faceRatio, jawRatio: jawToCheek, cheekRatio: cheekToFace, thirds: upperThird / Math.max(lowerThird, 0.001) });
          const breakdown = Object.fromEntries(Object.entries(featureScores).map(([k,v]) => [k, round(v,1)]));

          finish({
            numeric: round(numeric, 1),
            tier: tierFor(numeric),
            shape,
            symmetry: round(symmetry, 1),
            breakdown,
            metrics: {
              faceWidthHeight: round(faceRatio),
              jawToFace: round(jawToFace),
              jawToCheek: round(jawToCheek),
              cheekToFace: round(cheekToFace),
              eyeSpacingRatio: round(interEyeRatio),
              eyeAspectRatio: round(eyeAspect),
              facialThirdsDeviation: round(thirdsDeviation),
              midfaceRatio: round(midThird / Math.max(lowerThird, 0.001)),
              canthalTilt: round(canthalTilt),
              noseWidthRatio: round(noseWidth),
              mouthWidthRatio: round(mouthWidth),
              lipHeightRatio: round(lipHeight),
              browEyeRatio: round(browEyeRatio),
              chinProjectionRatio: round(chinProjection2d),
              imageQuality: round(skin.quality, 1),
            },
            analyzedAt: Date.now(),
            version: "lumina-geometry-v3",
            disclaimer: "LUMINA reports repeatable visual measurements and a heuristic composite score. It is not an objective or medical measure of attractiveness, and 2D photos cannot measure true 3D facial structure.",
          });
        } catch (e) {
          finish(null, e instanceof Error ? e : new Error("Analysis failed."));
        }
      });

      mesh.send({ image }).catch(e => finish(null, e));
    } catch (e) {
      finish(null, e instanceof Error ? e : new Error("Could not start face analysis."));
    }
  });
}
