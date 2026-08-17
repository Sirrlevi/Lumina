"use client";

import { useId, useState } from "react";

const labels = {
  harmony: "Facial harmony",
  jawline: "Jawline",
  cheekbones: "Cheekbones",
  eyeArea: "Eye area",
  canthalTilt: "Canthal tilt",
  facialProportions: "Facial proportions",
  midface: "Midface",
  nose: "Nose harmony",
  lips: "Lip / mouth harmony",
  symmetry: "Symmetry",
  skinPresentation: "Skin presentation",
};

const icons = {
  harmony: "✦",
  jawline: "⌁",
  cheekbones: "◈",
  eyeArea: "◉",
  symmetry: "◫",
  skinPresentation: "✧",
  facialProportions: "▣",
  midface: "↕",
  nose: "◇",
  lips: "◡",
  canthalTilt: "◒",
};

const subScoreLabels = {
  eyeSpacing: "Eye spacing",
  facialWidthHeight: "Face width / height",
  facialThirds: "Facial thirds balance",
};

const DUPLICATE_KEYS = new Set(["noseProportion", "lipProportion", "skin"]);

const metricLabels = {
  faceWidthHeight: "Face width / height",
  jawToFace: "Jaw / face width",
  jawToCheek: "Jaw / cheek width",
  cheekToFace: "Cheek / face width",
  eyeSpacingRatio: "Inter-eye ratio",
  eyeAspectRatio: "Eye aspect ratio",
  facialThirdsDeviation: "Thirds deviation",
  midfaceRatio: "Midface ratio",
  canthalTilt: "Canthal tilt",
  noseWidthRatio: "Nose width ratio",
  mouthWidthRatio: "Mouth width ratio",
  lipHeightRatio: "Lip height ratio",
  browEyeRatio: "Brow / eye ratio",
  chinProjectionRatio: "Chin / nose distance",
  imageQuality: "Image quality",
};

function statusFor(score) {
  if (score >= 9) return { label: "Elite", text: "Very strong overall presentation" };
  if (score >= 8) return { label: "Excellent", text: "Strong overall presentation" };
  if (score >= 7) return { label: "Very good", text: "Above-average presentation" };
  if (score >= 6) return { label: "Good", text: "Solid base with room to improve" };
  if (score >= 5) return { label: "Developing", text: "Several measurable areas can be improved" };
  return { label: "Foundation", text: "Focus on the highest-impact basics first" };
}

function Bar({ value, amber = false }) {
  const n = Math.max(0, Math.min(10, Number(value) || 0));
  return (
    <div className="h-2 rounded-full bg-white/[.08] overflow-hidden">
      <div
        className={`h-full rounded-full ${amber ? "bg-gradient-to-r from-amber-400 to-cyan-400" : "bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-300"} transition-[width] duration-700`}
        style={{ width: `${n * 10}%` }}
      />
    </div>
  );
}

function ScoreRing({ value }) {
  const gradId = useId();
  const size = 190;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value * 10));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="55%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,.07)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="score-ring"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-5xl font-black tracking-tight">{value.toFixed(1)}</div>
          <div className="text-[10px] text-white/35 uppercase tracking-[.22em] mt-1">/ 10</div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ feature, value }) {
  const n = Number(value) || 0;
  return (
    <div className="rounded-xl border border-white/[.06] bg-black/20 p-3">
      <div className="flex items-center gap-2.5">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-emerald-400/[.08] text-emerald-300 text-xs">
          {icons[feature] || "•"}
        </span>
        <span className="text-sm text-white/70 flex-1 min-w-0 truncate">{labels[feature] || feature}</span>
        <b className="text-sm">{n.toFixed(1)}</b>
      </div>
      <div className="mt-2.5">
        <Bar value={n} />
      </div>
    </div>
  );
}

function Disclosure({ title, subtitle, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="glass p-5 sm:p-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-white/35 mt-1">{subtitle}</p>
        </div>
        <span className={`text-white/35 transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function ResultCard({ data }) {
  if (!data) return null;

  const numeric = Number(data.numeric) || 0;
  const status = statusFor(numeric);
  const breakdown = data.breakdown || data.geometryBreakdown || {};

  const entries = Object.entries(breakdown)
    .filter(([key]) => !DUPLICATE_KEYS.has(key) && !subScoreLabels[key] && Number.isFinite(Number(breakdown[key])))
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const topFeatures = ["eyeArea", "jawline", "cheekbones", "symmetry", "skinPresentation", "harmony"]
    .filter((key) => breakdown[key] !== undefined);

  const strongest = entries.length
    ? entries.slice(0, 4)
    : (data.strengths || []).slice(0, 4).map((x) => [x, 0]);

  const weakest = entries.length
    ? [...entries].reverse().slice(0, 4)
    : (data.priorities || []).slice(0, 4).map((x) => [x, 0]);

  const confidence = Math.round((Number(data.confidence) || 0) * 100);

  return (
    <div className="space-y-5">
      {/* Screenshot-inspired hero report */}
      <section className="result-hero overflow-hidden rounded-3xl border border-white/[.08]">
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">LUMINA · AI AESTHETIC EVALUATION</p>
              <h2 className="text-2xl sm:text-3xl font-black mt-2">PSL analysis</h2>
              {data.adminOverrideApplied && <span className="inline-flex mt-2 rounded-full border border-amber-300/15 bg-amber-300/[.05] px-2.5 py-1 text-[10px] uppercase tracking-[.16em] text-amber-200/75">Ai powered result</span>}
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-2 text-[10px] uppercase tracking-[.18em] text-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Local model
            </div>
          </div>

          <div className="grid lg:grid-cols-[.9fr_1.1fr] gap-5 mt-5">
            <div className="rounded-2xl border border-white/[.07] bg-black/25 p-5 sm:p-6 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[.2em] text-white/35">Overall PSL score</p>
              <div className="mt-3">
                <ScoreRing value={numeric} />
              </div>
              <div className="text-center mt-2">
                <span className="inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-1 text-xs font-bold uppercase tracking-[.15em] text-emerald-300">
                  {status.label}
                </span>
                <p className="text-sm text-white/45 mt-2">{status.text}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[.07] bg-black/25 p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[.2em] text-white/35">PSL rating breakdown</p>
                  <h3 className="text-lg font-bold mt-1">Your strongest signals</h3>
                </div>
                <span className="text-xs text-cyan-300/70">{confidence}% confidence</span>
              </div>

              <div className="space-y-3 mt-5">
                {topFeatures.map((key) => (
                  <FeatureRow key={key} feature={key} value={breakdown[key]} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-white/[.03] border border-white/[.06] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/30">Face shape</span>
                  <b className="block mt-1">{data.shape || "—"}</b>
                </div>
                <div className="rounded-xl bg-white/[.03] border border-white/[.06] p-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/30">Tier</span>
                  <b className="block mt-1">{data.tier || "—"}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strengths + weaknesses */}
      <section className="grid md:grid-cols-2 gap-5">
        <div className="glass p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-emerald-300">Top strengths</h3>
            <span className="text-[10px] uppercase tracking-[.18em] text-emerald-300/50">highest scores</span>
          </div>
          <div className="space-y-2.5 mt-4">
            {strongest.map(([key, value], i) => (
              <div key={`${key}-${i}`} className="rounded-xl border border-white/[.06] bg-black/15 p-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full grid place-items-center bg-emerald-400/[.08] text-emerald-300 text-xs">{i + 1}</span>
                  <span className="flex-1 text-sm">{labels[key] || String(key)}</span>
                  {Number.isFinite(Number(value)) && <b className="text-sm">{Number(value).toFixed(1)}</b>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-amber-300">Areas for improvement</h3>
            <span className="text-[10px] uppercase tracking-[.18em] text-amber-300/50">lowest scores</span>
          </div>
          <div className="space-y-2.5 mt-4">
            {weakest.map(([key, value], i) => (
              <div key={`${key}-${i}`} className="rounded-xl border border-white/[.06] bg-black/15 p-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full grid place-items-center bg-amber-400/[.08] text-amber-300 text-xs">{i + 1}</span>
                  <span className="flex-1 text-sm">{labels[key] || String(key)}</span>
                  {Number.isFinite(Number(value)) && <b className="text-sm">{Number(value).toFixed(1)}</b>}
                </div>
                {Number.isFinite(Number(value)) && <div className="mt-2.5"><Bar value={value} amber /></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {data.summary && (
        <section className="glass p-5 sm:p-6">
          <p className="eyebrow">ASSESSMENT</p>
          <p className="text-base sm:text-lg text-white/70 leading-7 mt-3">{data.summary}</p>
        </section>
      )}

      <Disclosure
        title="Advanced measurements"
        subtitle="Raw landmark ratios and calibration sub-scores are kept here for transparency."
      >
        <div className="space-y-6">
          {Object.entries(breakdown).filter(([key]) => subScoreLabels[key]).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-[.16em]">Sub-scores</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                {Object.entries(breakdown).filter(([key]) => subScoreLabels[key]).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-white/[.03] border border-white/[.06] p-3">
                    <div className="text-[11px] text-white/35">{subScoreLabels[key]}</div>
                    <div className="text-lg font-bold mt-1">{Number(value).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-[.16em]">Browser measurements</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {Object.entries(data.geometryBreakdown || {}).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-white/[.03] border border-white/[.06] p-3 min-w-0">
                  <div className="text-[11px] text-white/35 break-words">{labels[key] || key}</div>
                  <div className="text-base font-bold mt-1 break-all">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-[.16em]">Measured geometry</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              {Object.entries(data.metrics || {}).map(([key, value]) => (
                <div key={key} className="rounded-xl bg-white/[.03] border border-white/[.06] p-3 min-w-0">
                  <div className="text-[11px] text-white/35 break-words">{metricLabels[key] || key}</div>
                  <div className="text-base font-bold mt-1 break-all">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Disclosure>

      <div className="rounded-2xl p-4 bg-cyan-400/[.035] border border-cyan-300/10 text-xs leading-5 text-white/45">
        {data.disclaimer || "LUMINA's score is a heuristic appearance metric based on visible 2D landmarks. It is not a medical measure or an objective truth about attractiveness."}
      </div>
    </div>
  );
}
