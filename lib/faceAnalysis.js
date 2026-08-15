import { FaceMesh } from "@mediapipe/face_mesh";
import { analyzeSkin } from "./skinAnalysis";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a = 1, b = 10) => Math.max(a, Math.min(b, v));
const scoreAround = (error, multiplier) => clamp(10 - error * multiplier);
const angle = (a, b, c) => {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const den = Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / den))) * 180 / Math.PI;
};

const tiers = [[3.5, "Sub-5"], [5, "LTN"], [6.2, "MTN"], [7.3, "HTN"], [8.3, "Chadlite"], [9.1, "Chad"], [10, "Adam"]];

export async function analyzeFace(image) {
  if (!image) throw new Error("No image supplied");

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    let mesh;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { mesh?.close?.(); } catch {}
      error ? reject(error) : resolve(value);
    };

    timer = setTimeout(() => finish(null, new Error("Face analysis timed out")), 15000);

    try {
      mesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      mesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });
      mesh.onResults(async results => {
        try {
          if (!results.multiFaceLandmarks?.length) return finish(null);
          const L = results.multiFaceLandmarks[0];
          const top = L[10], glabella = L[168], subnasale = L[2], chin = L[152], nose = L[1];
          const leftFace = L[234], rightFace = L[454], leftJaw = L[172], rightJaw = L[397];
          const leftOuterEye = L[33], rightOuterEye = L[263], leftCheek = L[127], rightCheek = L[356];
          const width = dist(leftFace, rightFace) || 1, height = dist(top, chin) || 1;
          const upperThird = dist(top, glabella), midThird = dist(glabella, subnasale), lowerThird = dist(subnasale, chin) || 1;
          const thirds = scoreAround((Math.abs(upperThird - midThird) + Math.abs(midThird - lowerThird)) / height, 25);
          const eyeWidth = dist(leftOuterEye, rightOuterEye);
          const fifths = scoreAround(Math.abs(eyeWidth - width * 0.6) / width, 40);
          const fwhr = width / height * 2.4;
          const fwhrScore = scoreAround(Math.abs(fwhr - 1.85), 8);
          const ipd = eyeWidth / width;
          const eyeSpacing = scoreAround(Math.abs(ipd - 0.46), 35);
          const leftTilt = Math.atan2(L[159].y - leftOuterEye.y, L[159].x - leftOuterEye.x) * 180 / Math.PI;
          const rightTilt = Math.atan2(L[386].y - rightOuterEye.y, L[386].x - rightOuterEye.x) * 180 / Math.PI;
          const canthal = (leftTilt + rightTilt) / 2;
          const canthalScore = scoreAround(Math.abs(canthal - 4), 1.2);
          const gonial = (angle(leftFace, leftJaw, chin) + angle(rightFace, rightJaw, chin)) / 2;
          const gonialScore = scoreAround(Math.abs(gonial - 125), 0.25);
          const jawWidth = dist(leftJaw, rightJaw), cheekWidth = dist(leftCheek, rightCheek) || 1;
          const jawRatio = jawWidth / cheekWidth;
          const jawScore = scoreAround(Math.abs(jawRatio - 0.88), 12);
          const midfaceRatio = dist(glabella, subnasale) / lowerThird;
          const midfaceScore = scoreAround(Math.abs(midfaceRatio - 0.95), 10);
          const pairs = [[33,263],[133,362],[61,291],[76,306],[127,356],[172,397],[58,288],[130,359],[46,276],[55,285],[70,300],[105,334]];
          let symmetryError = 0;
          for (const [l, r] of pairs) symmetryError += Math.abs(Math.abs(L[l].x - nose.x) - Math.abs(L[r].x - nose.x));
          const symmetry = scoreAround(symmetryError / pairs.length, 70);

          const skin = await analyzeSkin(image, L);
          const cheekScore = clamp((cheekWidth / width) * 10, 1, 10);
          const weights = { symmetry:.24, thirds:.08, fifths:.06, fwhr:.13, eye:.09, canthal:.06, gonial:.10, jaw:.07, midface:.05, skin:.12 };
          const numeric = clamp(symmetry*weights.symmetry + thirds*weights.thirds + fifths*weights.fifths + fwhrScore*weights.fwhr + eyeSpacing*weights.eye + canthalScore*weights.canthal + gonialScore*weights.gonial + jawScore*weights.jaw + midfaceScore*weights.midface + skin.score*weights.skin);
          const tier = tiers.find(([max]) => numeric <= max)?.[1] || "Adam";
          const ratio = width / height;
          let shape = "Oval";
          if (ratio > 0.82) shape = "Round";
          else if (ratio < 0.68) shape = "Oblong";
          else if (jawRatio > 0.93) shape = "Square";
          else if (cheekWidth > jawWidth * 1.08) shape = "Diamond";
          else if (midfaceRatio < 0.85) shape = "Heart";

          finish({
            numeric:+numeric.toFixed(1), tier, symmetry:+symmetry.toFixed(1), shape,
            breakdown:{ jawline:+jawScore.toFixed(1), cheekbones:+cheekScore.toFixed(1), eyeSpacing:+eyeSpacing.toFixed(1), canthalTilt:+canthalScore.toFixed(1), gonialAngle:+gonialScore.toFixed(1), facialWidthHeight:+fwhrScore.toFixed(1), facialThirds:+thirds.toFixed(1), midface:+midfaceScore.toFixed(1), skinTexture:skin.texture, skinEvenness:skin.evenness },
            metrics:{ faceWidthHeight:+(width/height).toFixed(3), fwhr:+fwhr.toFixed(2), gonial:+gonial.toFixed(1), canthalTilt:+canthal.toFixed(1), eyeSpacingRatio:+ipd.toFixed(3), jawToCheek:+jawRatio.toFixed(3), midfaceRatio:+midfaceRatio.toFixed(2), skinScore:+skin.score.toFixed(1) },
            analyzedAt:Date.now()
          });
        } catch (error) { finish(null, error); }
      });
      mesh.send({ image }).catch(error => finish(null, error));
    } catch (error) { finish(null, error); }
  });
}
