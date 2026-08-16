"use client";
import { useEffect, useMemo, useState } from "react";
import { TIER_BANDS } from "@/lib/referenceData";

const targets = ["MTN", "HTN", "Chadlite", "Chad", "Adam"];
const plans = {
  MTN: { focus: "foundation", habits: ["Prioritize 7–9 hours of sleep", "Strength train 3× weekly", "Eat enough protein and total calories", "Use a simple cleanser + moisturizer + SPF"], foods: ["dal, eggs or paneer", "curd and fruit", "rice/roti with vegetables", "nuts and seeds"] },
  HTN: { focus: "definition", habits: ["Keep body fat in a healthy range rather than crash dieting", "Train neck/posture safely", "Progressive strength training 3–4× weekly", "Wear a daily broad-spectrum SPF"], foods: ["lean protein", "whole grains", "vegetables and fruit", "water and unsweetened drinks"] },
  Chadlite: { focus: "polish", habits: ["Maintain a stable healthy weight", "Improve posture and shoulder positioning", "Keep grooming consistent", "Protect skin from sun exposure"], foods: ["protein-rich meals", "colorful vegetables", "fruit", "healthy fats"] },
  Chad: { focus: "maintenance", habits: ["Maintain sleep consistency", "Keep training progressive", "Keep grooming and skin routine consistent", "Avoid extreme dieting or jaw-clenching routines"], foods: ["balanced meals", "adequate protein", "fruit and vegetables", "healthy fats"] },
  Adam: { focus: "maintenance", habits: ["Maintain healthy body composition", "Protect skin from UV", "Keep posture and training consistent", "Avoid unsafe cosmetic or supplement shortcuts"], foods: ["balanced whole foods", "adequate protein", "fruit and vegetables", "healthy fats"] }
};

// TIER_BANDS now comes from lib/referenceData.js - the single place that also
// drives faceAnalysis.js's tierFor(). This used to be a second, separately
// hardcoded {MTN:6.2, HTN:7.3, ...} table here, which matched today but had
// no mechanism keeping it in sync if the bands in referenceData.js ever changed.
function tierForRating(rating) {
  for (const [min, t] of TIER_BANDS) if (rating < min) return t;
  return "Adam";
}

// Auto-select the tier ABOVE the one the scan just rated you at, not the same
// tier restated - "Target: MTN" on a report that already says you're MTN
// isn't a target, it's just your current result again.
function nextTargetFor(rating) {
  const current = tierForRating(rating);
  const idx = targets.indexOf(current);
  if (idx === -1) return targets[0]; // current tier (Sub-5/LTN) has no plan of its own - start from MTN
  return targets[Math.min(idx + 1, targets.length - 1)];
}

export default function PlanGenerator({ rating = 5 }) {
  const suggested = useMemo(() => nextTargetFor(rating), [rating]);
  const [target, setTarget] = useState(suggested);
  // Keep the default in sync if this instance ever gets reused for a new rating
  // (e.g. re-scan without a full route remount) without clobbering a manual pick.
  useEffect(() => { setTarget(suggested); }, [suggested]);
  const plan = useMemo(() => plans[target], [target]);
  return <div className="glass p-6 mt-5">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Your improvement plan</h2><p className="text-sm text-white/50 mt-1">Target: {target} • focus: {plan.focus}</p></div><select value={target} onChange={e => setTarget(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2">{targets.map(t => <option key={t}>{t}</option>)}</select></div>
    <div className="grid md:grid-cols-2 gap-5 mt-5"><div><h3 className="font-semibold">Habits</h3><ul className="mt-2 space-y-2 text-sm text-white/75">{plan.habits.map(x => <li key={x}>• {x}</li>)}</ul></div><div><h3 className="font-semibold">Food framework</h3><ul className="mt-2 space-y-2 text-sm text-white/75">{plan.foods.map(x => <li key={x}>• {x}</li>)}</ul></div></div>
    <p className="text-xs text-white/40 mt-5">These are general lifestyle suggestions, not medical treatment. Extreme dieting, dehydration, chronic jaw clenching and unproven supplements are not recommended.</p>
  </div>;
}
