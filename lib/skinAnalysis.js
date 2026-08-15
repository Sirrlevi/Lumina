export async function analyzeSkin(imageBitmap, landmarks){
  const c=document.createElement('canvas'); c.width=imageBitmap.width; c.height=imageBitmap.height;
  const ctx=c.getContext('2d'); ctx.drawImage(imageBitmap,0,0);
  const xs=landmarks.map(p=>p.x*c.width), ys=landmarks.map(p=>p.y*c.height);
  const minX=Math.max(0,Math.min(...xs)), maxX=Math.min(c.width,Math.max(...xs));
  const minY=Math.max(0,Math.min(...ys)), maxY=Math.min(c.height,Math.max(...ys));
  const d=ctx.getImageData(minX,minY,Math.max(1,maxX-minX),Math.max(1,maxY-minY)).data;
  let r=0,g=0,b=0,co=0; const gray=[];
  for(let i=0;i<d.length;i+=4){const R=d[i],G=d[i+1],B=d[i+2]; if(R>95&&G>40&&B>20&&R>G&&R>B){r+=R;g+=G;b+=B;co++} gray.push(0.299*R+0.587*G+0.114*B);}
  const avgR=r/co, avgG=g/co;
  const redness=Math.min(10,Math.max(1,(avgR-avgG)/12));
  const mean=gray.reduce((a,b)=>a+b,0)/gray.length;
  const vari=gray.reduce((a,b)=>a+(b-mean)**2,0)/gray.length;
  const texture=Math.max(1,Math.min(10,11-vari/500));
  const evenness=Math.max(1,10-Math.abs(avgR-avgG)/10);
  const score=texture*0.5+evenness*0.3+(10-redness)*0.2;
  return {score:+score.toFixed(1),texture:+texture.toFixed(1),evenness:+evenness.toFixed(1),redness:+redness.toFixed(1)};
}