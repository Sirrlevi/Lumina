"use client";

const labels={jawline:"Jawline",cheekbones:"Cheekbones",eyeSpacing:"Eye spacing",canthalTilt:"Canthal tilt",gonialAngle:"Gonial angle",facialWidthHeight:"Face width / height",facialThirds:"Facial thirds",midface:"Midface",skinTexture:"Skin texture",skinEvenness:"Skin evenness"};
const metricLabels={faceWidthHeight:"Face width / height",jawToCheek:"Jaw / cheek width",cheekToFace:"Cheek / face width",eyeSpacingRatio:"Eye spacing ratio",facialThirdsError:"Thirds deviation",midfaceRatio:"Midface ratio",gonialAngle:"Gonial angle",canthalTilt:"Canthal tilt",skinScore:"Skin image score"};

export default function ResultCard({data}){
 if(!data)return null;
 const numeric=Number(data.numeric)||0;
 return <div className="space-y-5 min-w-0">
  <section className="glass p-5 sm:p-7 overflow-hidden">
   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
    <div className="min-w-0"><p className="eyebrow">ANALYSIS COMPLETE</p><h2 className="text-3xl sm:text-5xl font-black mt-2 break-words">{data.tier}</h2><p className="text-white/55 mt-2">{data.shape} face · symmetry {data.symmetry}/10</p><p className="text-xs text-white/30 mt-2">Geometry engine {data.version||"v2"}</p></div>
    <div className="shrink-0 w-full sm:w-44 rounded-3xl bg-white/[.04] border border-white/10 p-5 text-center"><div className="text-6xl sm:text-7xl leading-none font-black bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{numeric.toFixed(1)}</div><div className="text-xs text-white/40 uppercase tracking-widest mt-2">overall / 10</div></div>
   </div>
   <div className="mt-7"><div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-all" style={{width:`${Math.max(0,Math.min(100,numeric*10))}%`}}/></div><div className="flex justify-between text-[11px] text-white/30 mt-2"><span>1</span><span>5</span><span>10</span></div></div>
  </section>
  <section className="glass p-5 sm:p-7 overflow-hidden">
   <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2"><div><h3 className="text-xl font-bold">Feature breakdown</h3><p className="text-sm text-white/45 mt-1">Each score is derived from the landmarks detected in your image.</p></div><span className="text-xs text-white/30">10 measurements</span></div>
   <div className="grid sm:grid-cols-2 gap-3 mt-6">{Object.entries(data.breakdown||{}).map(([key,value])=>{const n=Number(value)||0;return <div key={key} className="rounded-2xl border border-white/[.07] bg-black/20 p-4 min-w-0"><div className="flex items-center justify-between gap-3"><span className="text-sm text-white/65 truncate">{labels[key]||key}</span><b className="shrink-0">{n.toFixed(1)}</b></div><div className="h-2 rounded-full bg-white/10 mt-3 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{width:`${Math.max(0,Math.min(100,n*10))}%`}}/></div></div>})}</div>
  </section>
  <section className="glass p-5 sm:p-7 overflow-hidden">
   <h3 className="text-xl font-bold">Measured geometry</h3><p className="text-sm text-white/45 mt-1">These are the actual ratios/angles used by the scoring engine.</p>
   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">{Object.entries(data.metrics||{}).map(([key,value])=><div key={key} className="rounded-xl bg-white/[.035] border border-white/[.06] p-3 sm:p-4 min-w-0"><div className="text-[11px] text-white/35 leading-4 break-words">{metricLabels[key]||key}</div><div className="text-base sm:text-lg font-bold mt-1 break-all">{value}</div></div>)}</div>
  </section>
  <div className="rounded-2xl p-4 bg-cyan-400/5 border border-cyan-300/10 text-xs leading-5 text-white/50">{data.disclaimer}</div>
 </div>;
}
