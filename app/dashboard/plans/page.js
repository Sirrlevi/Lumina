"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import PlanGenerator from "@/components/PlanGenerator";

export default function Plans() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      setData(JSON.parse(localStorage.getItem("lumina_last") || "null"));
    } catch {
      setData(null);
    }
  }, []);

  return (
    <AuthGate>
      <div className="max-w-6xl mx-auto">
        <p className="eyebrow">PERSONAL PLAN</p>
        <h1 className="text-3xl sm:text-4xl font-black mt-1">Your improvement plan</h1>
        <p className="text-white/50 mt-2">
          The roadmap is generated from the weakest areas in your latest scan and refreshes automatically after a new scan.
        </p>
        <PlanGenerator data={data} rating={data?.numeric || 5} />
      </div>
    </AuthGate>
  );
}
