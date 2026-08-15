function clamp(v, min=1, max=10){return Math.max(min,Math.min(max,Number.isFinite(v)?v:min));}
function avg(a){return a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);}

export function analyzeSkin(canvas, landmarks){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const w=canvas.width,h=canvas.height;
  const xs=landmarks.map(p=>p.x*w),ys=landmarks.map(p=>p.y*h);
  const minX=Math.max(0,Math.floor(Math.min(...xs))),maxX=Math.min(w-1,Math.ceil(Math.max(...xs)));
  const minY=Math.max(0,Math.floor(Math.min(...ys))),maxY=Math.min(h-1,Math.ceil(Math.max(...ys)));
  const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY);
  const data=ctx.getImageData(minX,minY,bw,bh).data;
  const gray=[];const skin=[];let brightness=0;
  for(let i=0;i<data.length;i+=4){
    const R=data[i],G=data[i+1],B=data[i+2];
    const Y=.299*R+.587*G+.114*B; brightness+=Y;
    gray.push(Y);
    const max=Math.max(R,G,B),min=Math.min(R,G,B);
    const chroma=max-min;
    // Broad skin-color gate; used only for image-quality/skin-surface estimation.
    if(R>45 && G>25 && B>15 && R>=G*0.82 && R>=B*1.08 && chroma>8) skin.push({R,G,B,Y});
  }
  const meanBrightness=brightness/Math.max(1,gray.length);
  const mean=avg(gray);
  let variance=0;
  for(const v of gray) variance+=(v-mean)**2;
  variance/=Math.max(1,gray.length);
  const contrast=Math.sqrt(variance);
  const quality=clamp(10 - Math.abs(meanBrightness-135)/24 - Math.max(0,18-contrast)/9,1,10);
  if(!skin.length) return {score:clamp(quality*.65+4*.35),texture:5,evenness:5,quality};

  const ys2=skin.map(p=>p.Y), meanY=avg(ys2);
  let v=0;for(const y of ys2)v+=(y-meanY)**2;v/=Math.max(1,ys2.length);
  const texture=clamp(10-Math.sqrt(v)/13,1,10);
  const rg=skin.map(p=>p.R-p.G);const rgMean=avg(rg);let rgVar=0;for(const x of rg)rgVar+=(x-rgMean)**2;rgVar/=Math.max(1,rg.length);
  const evenness=clamp(10-Math.sqrt(rgVar)/5.5,1,10);
  const score=texture*.45+evenness*.35+quality*.20;
  return {score:+score.toFixed(1),texture:+texture.toFixed(1),evenness:+evenness.toFixed(1),quality:+quality.toFixed(1)};
}
