"use client";

import { useMemo, useState } from "react";

const PRIORITY_META = {
  harmony: {
    title: "Facial harmony",
    focus: "balance & presentation",
    actions: [
      "Keep grooming choices proportional to your face shape rather than chasing a single trend.",
      "Use front-facing photos in neutral lighting when comparing changes.",
      "Prioritize sleep, nutrition and consistent training before cosmetic shortcuts.",
    ],
  },
  symmetry: {
    title: "Symmetry",
    focus: "presentation consistency",
    actions: [
      "Keep your camera at eye level and avoid extreme head tilt when evaluating progress.",
      "Maintain consistent posture and head position in progress photos.",
      "If asymmetry is persistent or changes suddenly, treat the scan as a prompt for professional assessment, not a diagnosis.",
    ],
  },
  jawline: {
    title: "Jawline",
    focus: "definition & posture",
    actions: [
      "Build overall strength and maintain a healthy, stable body composition.",
      "Train posture and upper back consistently; do not rely on chronic jaw clenching.",
      "Use a clean haircut and neckline that preserves the natural jaw contour.",
    ],
  },
  cheekbones: {
    title: "Cheekbones",
    focus: "facial framing",
    actions: [
      "Keep body composition stable rather than using aggressive dehydration or crash diets.",
      "Choose hairstyles that frame the upper face without hiding the cheek area.",
      "Prioritize sleep, hydration and a consistent basic skincare routine.",
    ],
  },
  eyeArea: {
    title: "Eye area",
    focus: "eye framing",
    actions: [
      "Keep sleep consistent and avoid treating an image-based under-eye signal as a medical diagnosis.",
      "Shape or groom brows conservatively to preserve natural symmetry.",
      "Use hairstyles and glasses only if they complement the eye area rather than overpowering it.",
    ],
  },
  canthalTilt: {
    title: "Eye framing",
    focus: "brow & eye presentation",
    actions: [
      "Keep brow grooming tidy while preserving your natural brow line.",
      "Compare scans under consistent lighting because eye-area measurements are sensitive to pose.",
      "Do not use exercises or devices marketed as permanently changing eye anatomy.",
    ],
  },
  facialProportions: {
    title: "Facial proportions",
    focus: "balance & framing",
    actions: [
      "Use a haircut and facial-hair shape that balances your measured face proportions.",
      "Keep progress photos at the same distance, angle and focal length.",
      "Focus on sustainable grooming and fitness habits rather than trying to force skeletal changes.",
    ],
  },
  midface: {
    title: "Midface",
    focus: "proportion & styling",
    actions: [
      "Use consistent front-facing photos before comparing scores.",
      "Experiment with hairstyle and facial-hair framing that balances the center of the face.",
      "Avoid products or exercises claiming to reshape adult facial bones without evidence.",
    ],
  },
  nose: {
    title: "Nose harmony",
    focus: "facial balance",
    actions: [
      "Use neutral camera distance; phone wide-angle distortion can change perceived nose proportions.",
      "Choose grooming and hairstyle choices that keep the whole face visually balanced.",
      "Do not interpret a single 2D ratio as a clinical or permanent structural assessment.",
    ],
  },
  lips: {
    title: "Lip / mouth harmony",
    focus: "mouth framing",
    actions: [
      "Keep lips moisturized and maintain basic oral and facial hygiene.",
      "Use consistent neutral expressions for progress scans.",
      "Treat the score as a visual ratio, not a judgement of health or attractiveness.",
    ],
  },
  skinPresentation: {
    title: "Skin presentation",
    focus: "texture & evenness",
    actions: [
      "Use a gentle cleanser and moisturizer that you tolerate well.",
      "Use broad-spectrum SPF daily when exposed to daylight.",
      "Keep sleep, hydration and nutrition consistent; avoid aggressive skin hacks.",
    ],
  },
};

const FALLBACK_PLAN = {
  title: "Overall presentation",
  focus: "consistency",
  actions: [
    "Keep sleep, nutrition, training and grooming consistent.",
    "Use repeatable lighting and camera distance for future scans.",
    "Change one variable at a time so you can tell what actually helped.",
  ],
};

function parsePriority(value) {
  const match = String(value || "").match(/^([a-zA-Z]+)\s*\((\d+(?:\.\d+)?)\/10\)/);
  return {
    key: match?.[1] || "",
    score: match ? Number(match[2]) : null,
  };
}

function buildPriorityPlan(data) {
  const raw = Array.isArray(data?.priorities) ? data.priorities : [];
  const parsed = raw
    .map(parsePriority)
    .filter((x) => PRIORITY_META[x.key])
    .map((x) => ({ ...x, ...PRIORITY_META[x.key] }));

  // Older saved scans may not have priorities. Fall back to the lowest
  // measured feature scores so the plan is still result-driven.
  if (!parsed.length && data?.breakdown) {
    return Object.entries(data.breakdown)
      .filter(([key, value]) => PRIORITY_META[key] && Number.isFinite(Number(value)))
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .slice(0, 3)
      .map(([key, value]) => ({ key, score: Number(value), ...PRIORITY_META[key] }));
  }

  return parsed.slice(0, 3);
}

function scoreTone(score) {
  if (score >= 8.5) return "Strong";
  if (score >= 7) return "Good";
  if (score >= 5.5) return "Priority";
  return "High priority";
}

export default function PlanGenerator({ data, rating = 5 }) {
  const priorities = useMemo(() => buildPriorityPlan(data), [data]);
  const [expanded, setExpanded] = useState(null);

  const overall = Number(data?.numeric ?? rating) || 0;
  const targetText = priorities.length
    ? `Built from your ${priorities.length} lowest-scoring measured areas`
    : "Built from your latest scan";

  return (
    <section className="glass p-5 sm:p-7 mt-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="eyebrow">PERSONALIZED ROADMAP</p>
          <h2 className="text-2xl sm:text-3xl font-black mt-1">Your improvement plan</h2>
          <p className="text-sm text-white/45 mt-2">{targetText} · overall {overall.toFixed(1)}/10</p>
        </div>
        <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[.04] px-3 py-2 text-xs text-cyan-200/80">
          Updates automatically after every scan
        </div>
      </div>

      {priorities.length ? (
        <div className="grid lg:grid-cols-3 gap-3 mt-6">
          {priorities.map((item, index) => {
            const isOpen = expanded === item.key;
            return (
              <article key={item.key} className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-[.2em] text-amber-300/70">
                      Priority {index + 1}
                    </span>
                    <h3 className="font-bold mt-1">{item.title}</h3>
                    <p className="text-xs text-white/40 mt-1">{item.focus}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <b className="text-lg">{item.score?.toFixed(1)}</b>
                    <p className="text-[10px] text-white/35">/10 · {scoreTone(item.score)}</p>
                  </div>
                </div>

                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-cyan-400"
                    style={{ width: `${Math.max(0, Math.min(100, (item.score || 0) * 10))}%` }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : item.key)}
                  className="text-xs text-cyan-300 mt-4 hover:text-cyan-200"
                  aria-expanded={isOpen}
                >
                  {isOpen ? "Hide actions ↑" : "Show actions →"}
                </button>

                {isOpen && (
                  <ul className="mt-3 space-y-2 text-sm text-white/65 leading-5">
                    {item.actions.map((action) => <li key={action}>• {action}</li>)}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4 mt-6">
          <h3 className="font-bold">{FALLBACK_PLAN.title}</h3>
          <p className="text-xs text-white/40 mt-1">{FALLBACK_PLAN.focus}</p>
          <ul className="mt-3 space-y-2 text-sm text-white/65">
            {FALLBACK_PLAN.actions.map((action) => <li key={action}>• {action}</li>)}
          </ul>
        </div>
      )}

      <p className="text-xs text-white/35 mt-6 leading-5">
        This roadmap uses LUMINA's heuristic scan results to prioritize presentation and lifestyle actions.
        It is not medical treatment and cannot diagnose or change facial anatomy.
      </p>
    </section>
  );
}
