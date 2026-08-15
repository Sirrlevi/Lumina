"use client";

const labels = {
  jawline: "Jawline",
  cheekbones: "Cheekbones",
  eyeSpacing: "Eye spacing",
  canthalTilt: "Canthal tilt",
  gonialAngle: "Gonial angle",
  facialWidthHeight: "Width / height",
  facialThirds: "Facial thirds",
  midface: "Midface",
  skinTexture: "Skin texture",
  skinEvenness: "Skin evenness"
};

export default function ResultCard({ data }) {
  if (!data) return null;
  return <div className="space-y-5">
    <div className="glass p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-cyan-300/80">LUMINA analysis complete</p>
          <h2 className="text-4xl md:text-5xl font-black mt-2">{data.tier}</h2>
          <p className="text-white/55 mt-2">{data.shape} face · symmetry {data.symmetry}/10</p>
        </div>
        <div className="rounded-2xl bg-white/[.04] border border-white/10 px-7 py-5 text-center min-w-36">
          <div className="text-6xl font-black bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{data.numeric}</div>
          <div className="text-xs text-white/40 uppercase tracking-wider">overall / 10</div>
        </div>
      </div>
      <div className="mt-7">
        <div className="flex justify-between text-xs text-white/45 mb-2"><span>1</span><span>5</span><span>10</span></div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400" style={{width:`${data.numeric * 10}%`}} /></div>
      </div>
    </div>

    <div className="glass p-6">
      <div className="flex items-end justify-between"><div><h3 className="text-xl font-bold">What LUMINA analyzed</h3><p className="text-sm text-white/45 mt-1">Higher means closer to the heuristic reference used by this app.</p></div><span className="text-xs text-white/35">10 metrics</span></div>
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {Object.entries(data.breakdown || {}).map(([key, value]) => <div key={key} className="rounded-2xl border border-white/7 bg-black/20 p-4">
          <div className="flex justify-between gap-3"><span className="text-sm text-white/65">{labels[key] || key}</span><b>{value}/10</b></div>
          <div className="h-2 rounded-full bg-white/10 mt-3 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{width:`${Math.max(0, Math.min(100, Number(value)*10))}%`}} /></div>
        </div>)}
      </div>
    </div>

    <div className="glass p-6">
      <h3 className="text-xl font-bold">Measured proportions</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {Object.entries(data.metrics || {}).map(([key,value]) => <div key={key} className="rounded-xl bg-white/[.035] border border-white/5 p-4"><div className="text-xs text-white/40 capitalize">{key.replace(/([A-Z])/g," $1")}</div><div className="text-lg font-bold mt-1">{value}</div></div>)}
      </div>
    </div>

    <div className="rounded-2xl p-4 bg-cyan-400/5 border border-cyan-300/10 text-xs leading-5 text-white/50">{data.disclaimer}</div>
  </div>;
}
