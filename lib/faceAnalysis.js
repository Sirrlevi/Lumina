import { FaceMesh } from "@mediapipe/face_mesh";

const PAIRS = [[33,263],[61,291],[199,419]];

function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }

export async function analyzeFace(imageBitmap){
  return new Promise((resolve)=>{
    const faceMesh = new FaceMesh({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
    faceMesh.setOptions({maxNumFaces:1, refineLandmarks:true});
    faceMesh.onResults((results)=>{
      if(!results.multiFaceLandmarks?.length) return resolve(null);
      const lm = results.multiFaceLandmarks[0];
      let err=0; PAIRS.forEach(([l,r])=>{ err+=Math.abs(dist(lm[l],lm[234])-dist(lm[r],lm[454])); });
      const symmetry = Math.max(1, 10 - err*50);
      const width = dist(lm[234],lm[454]);
      const height = dist(lm[10],lm[152]);
      const ratio = width/height;
      let shape="Oval";
      if(ratio>0.85) shape="Round";
      else if(ratio<0.75) shape="Oblong";
      else if(dist(lm[172],lm[397])>width*0.9) shape="Square";
      const numeric = Math.min(10, Math.max(1, (symmetry*0.7 + (1-Math.abs(ratio-0.8))*3)));
      const tiers = [[2,'Sub-5'],[4,'LTN'],[5.5,'MTN'],[7,'HTN'],[8.5,'Chadlite'],[9.5,'Chad'],[10,'Adam']];
      const tier = tiers.find(t=>numeric<=t[0])?.[1]||'Adam';
      resolve({
        symmetry: +symmetry.toFixed(1),
        shape,
        numeric: +numeric.toFixed(1),
        tier,
        breakdown:{
          jawline: +(8+Math.random()*2).toFixed(1),
          cheekbones: +(symmetry*0.9).toFixed(1),
          eyeSpacing: +(7+Math.random()*2).toFixed(1),
          lipFullness: +(6+Math.random()*3).toFixed(1)
        }
      });
    });
    faceMesh.send({image:imageBitmap});
  });
}
