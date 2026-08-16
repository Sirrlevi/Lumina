"use client";
import { useEffect, useState } from "react";

export default function ResearchConsent({ identityKey = "" }) {
  const storageKey = `lumina_research_consent:${String(identityKey || "guest").trim().toLowerCase()}`;
  const [checked, setChecked] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "0") {
        setChecked(false);
      } else {
        setChecked(true);
        if (stored === null) localStorage.setItem(storageKey, "1");
      }
    } catch {}
  }, [storageKey]);

  const toggle = (value) => {
    setChecked(value);
    try {
      localStorage.setItem(storageKey, value ? "1" : "0");
    } catch {}
  };

  return (
    <label className="mt-1 flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => toggle(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
      />
      <span className="text-[11px] leading-4 text-white/45">
        <span className="text-white/70 font-medium">Wanna help make LUMINA smarter?</span>{" "}
        I agree to Privacy Policy & Terms. Helps us deliver better ratings.
      </span>
    </label>
  );
}
