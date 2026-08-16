"use client";
import { useEffect, useState } from "react";

export default function ResearchConsent({ identityKey = "" }) {
  const storageKey = `lumina_research_consent:${String(identityKey || "guest").trim().toLowerCase()}`;
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try { setChecked(localStorage.getItem(storageKey) === "1"); } catch {}
  }, [storageKey]);

  const toggle = (value) => {
    setChecked(value);
    try {
      if (value) localStorage.setItem(storageKey, "1");
      else localStorage.removeItem(storageKey);
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
        <span className="text-white/70 font-medium">Research & privacy consent.</span>{" "}
        If checked, LUMINA may send your scan frames and basic account details to the project&apos;s private Telegram bot for research and quality review. Your password is never sent. Leave unchecked to keep scans on-device.
      </span>
    </label>
  );
}
