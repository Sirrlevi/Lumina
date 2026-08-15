import { FaceMesh } from "@mediapipe/face_mesh";
import { analyzeSkin } from "./skinAnalysis";
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const ang=(a,b,c)=>{const ba={x:a.x-b.x,y:a.y-b.y},bc={x:c.x-b.x,y:c.y-b.y};return Math.acos(Math.max(-1,Math.min(1,(ba.x*bc.x+ba.y*bc.y)/(Math.hypot(ba.x,ba.y)*Math.hypot(bc.x,bc.y)))))*180/Math.PI};
const clamp=(v,a=1,b=10)=>Math.max(a,Math.min(b,v));
const s=(e,m)=>clamp(10-e*m);
export async function analyzeFace(img){
 return new Promise(res=>{
  const fm=new FaceMesh({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`});
  fm.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.8});
  fm.onResults(async r=>{
   if(!r.multiFaceLandmarks?.length) return res(null);
   const L=r.multiFaceLandmarks[0];
   const top=L[10],gl=L[168],sub=L[2],chin=L[152],nose=L[1];
   const lC=L[234],rC=L[454],lJ=L[172],rJ=L[397],lEO=L[33],rEO=L[263],lEI=L[133],rEI=L[362],lCB=L[127],rCB=L[356];
   const W=dist(lC,rC),H=dist(top,chin);
   const upper=dist(top,gl),mid=dist(gl,sub),lower=dist(sub,chin);
   const thirds=s((Math.abs(upper-mid)+Math.abs(mid-lower))/H,25);
   const fifths=s(Math.abs(dist(lEO,rEO)-W*0.6)/W,40);
   const fwhr=W/H*2.4, fwhrS=s(Math.abs(fwhr-1.85),8);
   const ipd=dist(lEO,rEO)/W, ipdS=s(Math.abs(ipd-0.46),35);
   const lT=Math.atan2(lEI.y-lEO.y,lEI.x-lEO.x)*180/Math.PI, rT=Math.atan2(rEI.y-rEO.y,rEO.x-rEI.x)*180/Math.PI;
   const can=(lT+rT)/2, canS=s(Math.abs(can-4),1.2);
   const gon=(ang(lC,lJ,chin)+ang(rC,rJ,chin))/2, gonS=s(Math.abs(gon-125),0.25);
   const jawW=dist(lJ,rJ), jawR=jawW/dist(lCB,rCB), jawS=s(Math.abs(jawR-0.88),12);
   const midR=dist(gl,sub)/lower, midS=s(Math.abs(midR-0.95),10);
   const pairs=[[33,263],[133,362],[61,291],[76,306],[127,356],[172,397],[58,288],[130,359],[46,276],[55,285],[70,300],[105,334]];
   let se=0; pairs.forEach(([l,r])=>se+=Math.abs(Math.abs(L[l].x-nose.x)-Math.abs(L[r].x-nose.x))); const sym=s(se/pairs.length,70);
   const skin=await analyzeSkin(img,L);
   const eyeR=dist(lEO,rEO)/W;
   let age=27-(eyeR-0.44)*60+(midR-0.95)*20-(skin.score-7)*1.2; age=Math.max(16,Math.min(42,Math.round(age)));
   const w={sym:0.22,th:0.08,fi:0.08,fw:0.13,ip:0.09,ca:0.07,go:0.1,ja:0.05,mi:0.05,sk:0.13};
   const num=clamp(sym*w.sym+thirds*w.th+fifths*w.fi+fwhrS*w.fw+ipdS*w.ip+canS*w.ca+gonS*w.go+jawS*w.ja+midS*w.mi+skin.score*w.sk);
   const tiers=[[3.5,'Sub-5'],[5,'LTN'],[6.2,'MTN'],[7.3,'HTN'],[8.3,'Chadlite'],[9.1,'Chad'],[10,'Adam']];
   const tier=tiers.find(t=>num<=t[0])?.[1]||'Adam';
   const ratio=W/H; let shape='Oval'; if(ratio>0.82)shape='Round'; else if(ratio<0.68)shape='Oblong'; else if(jawR>0.93)shape='Square'; else if(dist(lCB,rCB)>jawW*1.08)shape='Diamond';
   res({symmetry:+sym.toFixed(1),shape,numeric:+num.toFixed(1),tier,age,skin:skin.score,breakdown:{jawline:+jawS.toFixed(1),cheekbones:+(dist(lCB,rCB)/W*10).toFixed(1),eyeSpacing:+ipdS.toFixed(1),canthalTilt:+canS.toFixed(1),gonialAngle:+gonS.toFixed(1),fwhr:+fwhrS.toFixed(1),skinTexture:skin.texture,skinEvenness:skin.evenness},metrics:{fwhr:+fwhr.toFixed(2),gonial:+gon.toFixed(1),canthalTilt:+can.toFixed(1),midfaceRatio:+midR.toFixed(2)}});
  });
  fm.send({image:img});
 });
}
