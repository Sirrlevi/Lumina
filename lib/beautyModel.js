import * as ort from "onnxruntime-web";

let sessionPromise = null;
const MODEL_URL = "https://cdn.jsdelivr.net/gh/kale-eb/moggle-model@main/web/beauty_model.onnx";

async function getSession(){
  if(!sessionPromise){
    ort.env.wasm.wasmPaths="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/";
    sessionPromise=ort.InferenceSession.create(MODEL_URL,{executionProviders:["wasm"],graphOptimizationLevel:"all"});
  }
  return sessionPromise;
}

function cropFace(source, landmarks){
  const w=source.videoWidth||source.naturalWidth||source.width;
  const h=source.videoHeight||source.naturalHeight||source.height;
  const xs=landmarks.map(p=>p.x), ys=landmarks.map(p=>p.y);
  const minX=Math.max(0,Math.min(...xs)-.08), maxX=Math.min(1,Math.max(...xs)+.08);
  const minY=Math.max(0,Math.min(...ys)-.10), maxY=Math.min(1,Math.max(...ys)+.10);
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2, side=Math.min(1,Math.max(maxX-minX,maxY-minY)*1.12);
  const sx=Math.max(0,(cx-side/2)*w), sy=Math.max(0,(cy-side/2)*h);
  const sw=Math.min(w-sx,side*w), sh=Math.min(h-sy,side*h);
  const c=document.createElement("canvas");c.width=224;c.height=224;
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(source,sx,sy,sw,sh,0,0,224,224);
  return ctx.getImageData(0,0,224,224);
}

function float32ToFloat16(value){
  const buffer=new ArrayBuffer(4);
  new Float32Array(buffer)[0]=value;
  const bits=new Uint32Array(buffer)[0];
  const sign=(bits>>16)&0x8000;
  const exp=((bits>>23)&0xff)-127+15;
  const frac=(bits>>13)&0x3ff;
  if(exp<=0)return sign;
  if(exp>=31)return sign|0x7c00;
  return sign|(exp<<10)|frac;
}

function tensorFromImageData(img){
  const data=new Uint16Array(3*224*224);
  for(let y=0;y<224;y++)for(let x=0;x<224;x++){
    const i=(y*224+x)*4,j=y*224+x;
    const r=img.data[i]/255,g=img.data[i+1]/255,b=img.data[i+2]/255;
    data[j]=float32ToFloat16((r-.485)/.229);
    data[224*224+j]=float32ToFloat16((g-.456)/.224);
    data[2*224*224+j]=float32ToFloat16((b-.406)/.225);
  }
  return new ort.Tensor("float16",data,[1,3,224,224]);
}

export async function predictBeauty(source){
  try{
    // Use FaceMesh already run by faceAnalysis to locate a stable crop.
    const { FaceMesh } = await import("@mediapipe/face_mesh");
    const mesh=new FaceMesh({locateFile:file=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
    mesh.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:.6,minTrackingConfidence:.6});
    const landmarks=await new Promise((resolve,reject)=>{
      let done=false;
      mesh.onResults(r=>{if(done)return;done=true;try{mesh.close()}catch{};r.multiFaceLandmarks?.[0]?resolve(r.multiFaceLandmarks[0]):reject(new Error("No face detected for model scoring."));});
      mesh.send({image:source}).catch(reject);
      setTimeout(()=>{if(!done){done=true;try{mesh.close()}catch{};reject(new Error("Local beauty model face detection timed out."));}},10000);
    });
    const session=await getSession();
    const tensor=tensorFromImageData(cropFace(source,landmarks));
    const feeds={};
    feeds[session.inputNames[0]]=tensor;
    const output=await session.run(feeds);
    const raw=Number(output[session.outputNames[0]].data[0]);
    // The upstream v7b browser implementation calibrates raw [2, 9] to [0, 10].
    const score=Math.max(0,Math.min(10,((raw-2)/7)*10));
    return {score:Number(score.toFixed(2)),confidence:.78,modelName:"EfficientNet-B0 model trained on SCUT-FBP5500 + MEBeauty + FairFace"};
  }catch(e){
    // Do not fabricate a beauty-model score. The geometry engine remains the only fallback.
    return {score:null,confidence:.55,modelName:"Local geometry fallback",error:e?.message||"model unavailable"};
  }
}
