"use client";
import { useId, useState } from "react";

const labels = {
  harmony: "Facial harmony", jawline: "Jawline", cheekbones: "Cheekbones", eyeArea: "Eye area",
  canthalTilt: "Canthal tilt", facialProportions: "Facial proportions", midface: "Midface",
  nose: "Nose harmony", lips: "Lip / mouth harmony", symmetry: "Symmetry", skinPresentation: "Skin presentation",
};
const subScoreLabels = {
  eyeSpacing: "Eye spacing", facialWidthHeight: "Facial width / height", facialThirds: "Facial thirds balance",
};
// These three breakdown keys are exact duplicates of nose / lips / skinPresentation
// above (faceAnalysis.js copies the same rounded value under a second name) -
// showing the same number twice under two labels isn't extra information, so
// they're intentionally left out of both maps and filtered out below.
const DUPLICATE_KEYS = new Set(["noseProportion", "lipProportion", "skin"]);

const metricLabels = {faceWidthHeight:"Face width / height",jawToFace:"Jaw / face width",jawToCheek:"Jaw / cheek width",cheekToFace:"Cheek / face width",eyeSpacingRatio:"Inter-eye ratio",eyeAspectRatio:"Eye aspect ratio",facialThirdsDeviation:"Thirds deviation",midfaceRatio:"Midface ratio",canthalTilt:"Canthal tilt",noseWidthRatio:"Nose width ratio",mouthWidthRatio:"Mouth width ratio",lipHeightRatio:"Lip height ratio",browEyeRatio:"Brow / eye ratio",chinProjectionRatio:"Chin / nose distance",imageQuality:"Image quality"};

// Small hand-drawn line icons matching the thin cyan/fuchsia mesh-line style
// already used for the live scan overlay in CameraAnalyzer.jsx, rather than a
// generic icon-pack look.
const ICON_PATHS = {
  harmony: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" /><path d="M12 3v18M4 7.5l8 4.5 8-4.5" /></>,
  symmetry: <><path d="M12 3v18" strokeDasharray="2 2" /><circle cx="7" cy="8" r="2" /><circle cx="17" cy="8" r="2" /><path d="M5 17c1.5-1.5 3-2 4-2M19 17c-1.5-1.5-3-2-4-2" /></>,
  jawline: <path d="M5 6c0 6 2.5 12 7 15 4.5-3 7-9 7-15" />,
  cheekbones: <><path d="M4 9c2-1 3.5-1 5 0M15 9c1.5-1 3-1 5 0" /><ellipse cx="12" cy="13" rx="7" ry="8" /></>,
  eyeArea: <><path d="M2 12s3.5-5 10-5 10 5 10 5-3.5 5-10 5-10-5-10-5z" /><circle cx="12" cy="12" r="2.5" /></>,
  canthalTilt: <><path d="M3 13s3.5-4 9-4 9 4 9 4" /><path d="M17 6l3 1-1 3" /></>,
  facialProportions: <><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M6 9h12M6 15h12" /></>,
  midface: <><rect x="3" y="9" width="18" height="6" rx="1.5" /><path d="M3 5h18M3 19h18" strokeOpacity=".4" /></>,
  nose: <path d="M11 3c-1 3-2.5 5-2.5 9 0 2 1.5 3 3.5 3s3.5-1 3.5-3" />,
  lips: <><path d="M3 12c2.5-2 4-2 5-1s2.5 1 4 1 3-2 4-1 3-1 5 1" /><path d="M4 12.5c2 2 5 3 8 3s6-1 8-3" strokeOpacity=".5" /></>,
  skinPresentation: <><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" /><circle cx="18" cy="17" r="1.6" /></>,
};
function FeatureIcon({ name, className }) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>{path}</svg>;
}

function Bar({ value }) {
  const n = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-400 to-cyan-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${n * 10}%` }} />
    </div>
  );
}

function ScoreRing({ value }) {
  const gradId = useId();
  const size = 168, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0 mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${gradId})`} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent leading-none">{value.toFixed(1)}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-widest mt-1.5">out of 10</div>
        </div>
      </div>
    </div>
  );
}

function Disclosure({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="glass p-5 sm:p-7 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 text-left">
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          {subtitle && <p className="text-sm text-white/45 mt-1">{subtitle}</p>}
        </div>
        <span className={`shrink-0 text-white/40 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </button>
      {open && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function ResultCard({ data }) {
  if (!data) return null;
  const numeric = Number(data.numeric) || 0;
  const breakdownEntries = Object.entries(data.breakdown || {}).filter(([k]) => !DUPLICATE_KEYS.has(k) && !subScoreLabels[k]);
  const subScoreEntries = Object.entries(data.breakdown || {}).filter(([k]) => subScoreLabels[k]);

  return (
    <div className="space-y-5 min-w-0">
      <section className="glass p-5 sm:p-7 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
          <ScoreRing value={numeric} />
          <div className="min-w-0 text-center lg:text-left">
            <p className="eyebrow">ANALYSIS COMPLETE</p>
            <h2 className="text-3xl sm:text-5xl font-black mt-2 break-words">{data.tier}</h2>
            <p className="text-white/55 mt-2">{data.shape} face · Local confidence {Math.round((Number(data.confidence) || 0) * 100)}%</p>
            <p className="text-xs text-white/30 mt-2">{data.version || "LUMINA vision engine"}</p>
          </div>
        </div>
      </section>

      {data.summary && (
        <section className="glass p-5 sm:p-7 overflow-hidden">
          <p className="eyebrow">ASSESSMENT</p>
          <p className="text-base sm:text-lg text-white/75 leading-7 mt-3">{data.summary}</p>
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            {data.strengths?.length > 0 && (
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-4">
                <h3 className="font-bold text-emerald-300 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Strongest areas
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-white/70">{data.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
            {data.priorities?.length > 0 && (
              <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[.04] p-4">
                <h3 className="font-bold text-amber-300 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4v9M12 17v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /></svg>
                  Priority areas
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-white/70">{data.priorities.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="glass p-5 sm:p-7 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold">Local feature scores</h3>
            <p className="text-sm text-white/45 mt-1">The local calibration combines measured proportions, symmetry and visible presentation signals.</p>
          </div>
          <span className="text-xs text-cyan-300/60">LOCAL ENGINE</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          {breakdownEntries.map(([key, value]) => {
            const n = Number(value) || 0;
            return (
              <div key={key} className="rounded-2xl border border-white/[.07] bg-black/20 p-4 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="shrink-0 grid place-items-center w-8 h-8 rounded-lg bg-white/5 text-cyan-300/80"><FeatureIcon name={key} className="w-4 h-4" /></span>
                  <span className="text-sm text-white/65 truncate flex-1">{labels[key] || key}</span>
                  <b className="shrink-0">{n.toFixed(1)}</b>
                </div>
                <div className="mt-3"><Bar value={n} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <Disclosure title="Advanced measurements" subtitle="The raw landmark ratios and sub-scores behind the numbers above, shown for transparency.">
        <div className="space-y-6">
          {subScoreEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Sub-scores</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {subScoreEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-white/[.035] border border-white/[.06] p-3 sm:p-4 min-w-0">
                    <div className="text-[11px] text-white/35 leading-4 break-words">{subScoreLabels[key]}</div>
                    <div className="text-base sm:text-lg font-bold mt-1 break-all">{Number(value).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Browser measurements</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {Object.entries(data.geometryBreakdown || {}).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-white/[.035] border border-white/[.06] p-3 sm:p-4 min-w-0">
                  <div className="text-[11px] text-white/35 leading-4 break-words">{labels[key] || key}</div>
                  <div className="text-base sm:text-lg font-bold mt-1 break-all">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wide">Measured geometry</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {Object.entries(data.metrics || {}).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-white/[.035] border border-white/[.06] p-3 sm:p-4 min-w-0">
                  <div className="text-[11px] text-white/35 leading-4 break-words">{metricLabels[key] || key}</div>
                  <div className="text-base sm:text-lg font-bold mt-1 break-all">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Disclosure>

      <div className="rounded-2xl p-4 bg-cyan-400/5 border border-cyan-300/10 text-xs leading-5 text-white/50">{data.disclaimer}</div>
    </div>
  );
}
