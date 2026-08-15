import { FaceMesh } from "@mediapipe/face_mesh";
import { analyzeSkin } from "./skinAnalysis";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, a = 1, b = 10) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
const round = v => +v.toFixed(2);
const scoreTarget = (value, target, tolerance) => clamp(10 - Math.abs(value - target) / tolerance * 5);
const angle = (a, b, c) => {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const den = Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / den))) * 180 / Math.PI;
};
const tierFor = n => n < 3.5 ? "Sub-5" : n < 5 ? "LTN" : n < 6.2 ? "MTN" : n < 7.3 ? "HTN" : n < 8.3 ? "Chadlite" : n < 9.1 ? "Chad" : "Adam";

function normalizeImage(input) {
  return new Promise((resolve, reject) => {
    const draw = source => {
      const sw = source.videoWidth || source.naturalWidth || source.width;
      const sh = source.videoHeight || source.naturalHeight || source.height;
      if (!sw || !sh) return reject(new Error("Image has no dimensions"));
      const max = 1280;
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
      else { input.onload = () => draw(input); input.onerror = () => reject(new Error("Image could not be loaded")); }
    } else draw(input);
  });
}

export async function analyzeFace(input) {
  if (typeof window === "undefined") throw new Error("Face analysis runs in the browser");
  const image = await normalizeImage(input);
  return new Promise((resolve, reject) => {
    let mesh, timer, settled = false;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { mesh?.close?.(); } catch {}
      error ? reject(error) : resolve(value);
    };
    timer = setTimeout(() => finish(null, new Error("Face model timed out. Check your internet connection and try again.")), 30000);
    try {
      mesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
      mesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      mesh.onResults(async results => {
        if (!results.multiFaceLandmarks?.length) return finish(null, new Error("No face detected"));
        try {
          const L = results.multiFaceLandmarks[0];
          const top=L[10], glabella=L[168], subnasale=L[2], chin=L[152], nose=L[1];
          const leftFace=L[234], rightFace=L[454], leftJaw=L[172], rightJaw=L[397];
          const leftCheek=L[127], rightCheek=L[356], leftEye=L[33], rightEye=L[263];
          const width=dist(leftFace,rightFace), height=dist(top,chin);
          if (width < .01 || height < .01) return finish(null, new Error("Face was detected but could not be measured reliably"));
          const upper=dist(top,glabella), mid=dist(glabella,subnasale), lower=dist(subnasale,chin);
          const thirdError=(Math.abs(upper-mid)+Math.abs(mid-lower))/height;
          const thirds=scoreTarget(thirdError,0.0,0.18);
          const eyeDistance=dist(leftEye,rightEye), eyeSpacingRatio=eyeDistance/width;
          const eyeSpacing=scoreTarget(eyeSpacingRatio,.46,.12);
          const fwhr=width/height;
          const fwhrScore=scoreTarget(fwhr,.78,.24);
          const leftTilt=Math.atan2(L[159].y-L[33].y,L[159].x-L[33].x)*180/Math.PI;
          const rightTilt=Math.atan2(L[386].y-L[263].y,L[386].x-L[263].x)*180/Math.PI;
          const canthal=(Math.abs(leftTilt)+Math.abs(rightTilt))/2;
          const canthalScore=scoreTarget(canthal,4,8);
          const gonial=(angle(leftFace,leftJaw,chin)+angle(rightFace,rightJaw,chin))/2;
          const gonialScore=scoreTarget(gonial,125,25);
          const jawWidth=dist(leftJaw,rightJaw), cheekWidth=dist(leftCheek,rightCheek);
          const jawRatio=jawWidth/cheekWidth;
          const jawScore=scoreTarget(jawRatio,.88,.25);
          const cheekRatio=cheekWidth/width;
          const cheekScore=scoreTarget(cheekRatio,.72,.20);
          const midfaceRatio=mid/Math.max(lower,.001);
          const midfaceScore=scoreTarget(midfaceRatio,.95,.35);
          const pairs=[[33,263],[133,362],[61,291],[76,306],[127,356],[172,397],[58,288],[130,359],[46,276],[55,285],[70,300],[105,334]];
          let symmetryError=0;
          for(const [l,r] of pairs) symmetryError += Math.abs(Math.abs(L[l].x-nose.x)-Math.abs(L[r].x-nose.x));
          const symmetry=clamp(10-symmetryError/pairs.length*65);
          const skin=await analyzeSkin(image,L);
          const featureScores={
            jawline:jawScore, cheekbones:cheekScore, eyeSpacing, canthalTilt:canthalScore,
            gonialAngle:gonialScore, facialWidthHeight:fwhrScore, facialThirds:thirds,
            midface:midfaceScore, skinTexture:skin.texture, skinEvenness:skin.evenness
          };
          const weights={symmetry:.22,jawline:.10,cheekbones:.08,eyeSpacing:.08,canthalTilt:.05,gonialAngle:.09,facialWidthHeight:.10,facialThirds:.08,midface:.06,skinTexture:.07,skinEvenness:.07};
          let numeric=symmetry*weights.symmetry;
          for(const [key,w] of Object.entries(weights)) if(key!=="symmetry") numeric += featureScores[key]*w;
          numeric=clamp(numeric);
          let shape="Oval";
          if(fwhr<.68) shape="Oblong";
          else if(fwhr>.92 && jawRatio>.88) shape="Square";
          else if(fwhr>.90) shape="Round";
          else if(cheekWidth>jawWidth*1.10) shape="Diamond";
          else if(midfaceRatio<.85) shape="Heart";
          const disclaimer="Scores are heuristic measurements of visible facial geometry and image quality. They are not a medical diagnosis or an objective measure of attractiveness.";
          finish({
            numeric:round(numeric), tier:tierFor(numeric), symmetry:round(symmetry), shape,
            breakdown:Object.fromEntries(Object.entries(featureScores).map(([k,v])=>[k,round(v)])),
            metrics:{faceWidthHeight:round(fwhr), jawToCheek:round(jawRatio), cheekToFace:round(cheekRatio), eyeSpacingRatio:round(eyeSpacingRatio), facialThirdsError:round(thirdError), midfaceRatio:round(midfaceRatio), gonialAngle:round(gonial), canthalTilt:round(canthal), skinScore:round(skin.score)},
            analyzedAt:Date.now(), version:"geometry-v2", disclaimer
          });
        } catch(e) { finish(null,e); }
      });
      mesh.send({image}).catch(e=>finish(null,e));
    } catch(e) { finish(null,e); }
  });
}
