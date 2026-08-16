"use client";

import { useEffect, useMemo, useState } from "react";

const METRICS = [
  ["harmony", "Facial harmony"],
  ["jawline", "Jawline"],
  ["cheekbones", "Cheekbones"],
  ["eyeArea", "Eye area"],
  ["symmetry", "Symmetry"],
  ["skinPresentation", "Skin presentation"],
];

const TIERS = ["", "Sub-5", "LTN", "MTN", "HTN", "Chadlite", "Chad", "Adam"];

export default function AdminPage() {
  const [auth, setAuth] = useState("checking");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState("");
  const [tierOverride, setTierOverride] = useState("");
  const [metricOverrides, setMetricOverrides] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((x) => setAuth(x.authenticated ? "ready" : "login"))
      .catch(() => setAuth("login"));
  }, []);

  useEffect(() => {
    if (auth === "ready") loadUsers("");
  }, [auth]);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setPassword("");
      setAuth("ready");
    } catch (e) {
      setError(e.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadUsers(search = query) {
    setLoadingUsers(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/users?q=${encodeURIComponent(search.trim())}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setUsers(j.users || []);
      if (!j.users?.length) setError(search.trim() ? "No matching users found." : "No users found.");
    } catch (e) {
      setUsers([]);
      setError(e.message || "Could not load users.");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function openUser(uid) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/users/${uid}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setSelected(j);
      setRating(j.override?.enabled ? String(j.override.overallRating) : "");
      setTierOverride(j.override?.enabled ? (j.override.tierOverride || "") : "");
      setMetricOverrides(j.override?.enabled ? (j.override.breakdownOverrides || {}) : {});
    } catch (e) {
      setError(e.message || "Could not load user.");
    } finally {
      setBusy(false);
    }
  }

  function changeMetric(key, value) {
    setMetricOverrides((old) => ({ ...old, [key]: value }));
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/users/${selected.user.uid}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          overallRating: rating,
          tierOverride,
          breakdownOverrides: metricOverrides,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      await openUser(selected.user.uid);
      await loadUsers(query);
    } catch (e) {
      setError(e.message || "Could not save custom result.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !confirm("Remove this custom result and return future scans to the normal model?")) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/users/${selected.user.uid}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      await openUser(selected.user.uid);
      await loadUsers(query);
    } catch (e) {
      setError(e.message || "Could not remove custom result.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuth("login");
    setSelected(null);
    setUsers([]);
  }

  const selectedSummary = useMemo(() => {
    if (!selected?.override?.enabled) return "No custom result";
    return `${selected.override.overallRating}/10 · ${selected.override.tierOverride || "auto tier"}`;
  }, [selected]);

  if (auth === "checking") {
    return <div className="glass p-8 max-w-md mx-auto mt-12 text-center">Checking admin session…</div>;
  }

  if (auth === "login") {
    return (
      <div className="max-w-md mx-auto mt-12">
        <form onSubmit={login} className="glass p-6 sm:p-8 space-y-4">
          <div>
            <p className="eyebrow">LUMINA</p>
            <h1 className="text-3xl font-black mt-1">Admin</h1>
            <p className="text-sm text-white/40 mt-2">Personal project controls.</p>
          </div>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" className="field" />
          <button disabled={busy} className="btn-neon w-full">{busy ? "Checking…" : "Enter admin panel"}</button>
          {error && <p className="error-box">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12">
      <div className="glass p-5 sm:p-7 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">PERSONAL CONTROL PANEL</p>
          <h1 className="text-3xl font-black mt-1">LUMINA Admin</h1>
          <p className="text-sm text-white/40 mt-2">Pick a friend, tune the demo result, and save it.</p>
        </div>
        <button onClick={logout} className="text-sm text-white/45 hover:text-white transition">Logout</button>
      </div>

      <section className="glass p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(query)}
            placeholder="Search by email, name or username"
            className="field flex-1"
          />
          <button onClick={() => loadUsers(query)} disabled={loadingUsers} className="btn-neon px-6">
            {loadingUsers ? "Loading…" : "Search"}
          </button>
          {query && <button onClick={() => { setQuery(""); loadUsers(""); }} disabled={loadingUsers} className="px-4 rounded-xl border border-white/10 text-white/55 hover:text-white">Clear</button>}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Users</p>
            <p className="text-xs text-white/30 mt-0.5">{users.length} shown · click any user to edit</p>
          </div>
          <button onClick={() => loadUsers(query)} disabled={loadingUsers} className="text-xs text-cyan-300/70">Refresh</button>
        </div>

        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-2xl border border-white/[.07] bg-black/15 divide-y divide-white/[.05]">
          {loadingUsers && !users.length ? (
            <div className="p-6 text-center text-sm text-white/35">Loading users…</div>
          ) : users.length ? (
            users.map((u) => (
              <button
                key={u.uid}
                onClick={() => openUser(u.uid)}
                className={`w-full text-left p-4 transition hover:bg-white/[.035] ${selected?.user?.uid === u.uid ? "bg-cyan-300/[.06]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-400/25 to-cyan-300/20 border border-white/10 grid place-items-center text-sm font-bold shrink-0">
                    {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <b className="truncate">{u.name || "Unnamed user"}</b>
                      {u.username && <span className="text-xs text-cyan-300/55">@{u.username}</span>}
                    </div>
                    <p className="text-xs text-white/35 truncate mt-1">{u.email || "No email"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {u.override?.enabled ? (
                      <><b className="text-emerald-300 text-sm">{u.override.overallRating}/10</b><p className="text-[10px] text-white/25">custom</p></>
                    ) : <span className="text-[10px] uppercase tracking-wider text-white/25">normal</span>}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-white/35">No users match this search.</div>
          )}
        </div>

        {error && <p className="error-box mt-4">{error}</p>}
      </section>

      {selected && (
        <div className="grid lg:grid-cols-[.78fr_1.22fr] gap-5">
          <section className="glass p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">SELECTED USER</p>
                <h2 className="text-xl font-bold mt-1">{selected.user.name || "Unnamed"}</h2>
                <p className="text-sm text-white/45 mt-1 break-all">{selected.user.email}</p>
                <p className="text-sm text-white/35 mt-1">@{selected.user.username || "—"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-white/30 hover:text-white">Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl bg-black/20 border border-white/5 p-4">
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Saved scans</p>
                <p className="text-2xl font-black mt-1">{selected.history?.length || 0}</p>
              </div>
              <div className="rounded-xl bg-black/20 border border-white/5 p-4">
                <p className="text-[10px] text-white/35 uppercase tracking-wider">Custom result</p>
                <p className="font-bold mt-1">{selectedSummary}</p>
              </div>
            </div>

            <p className="eyebrow mt-7">RECENT HISTORY</p>
            <div className="mt-3 space-y-2 max-h-80 overflow-auto">
              {(selected.history || []).length ? selected.history.map((x) => (
                <div key={x.id} className="rounded-xl border border-white/5 bg-black/20 p-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/40">{x.ts ? new Date(x.ts).toLocaleString() : "—"}</span>
                  <b>{Number(x.numeric || 0).toFixed(1)}/10 · {x.tier || "—"}</b>
                </div>
              )) : <p className="text-sm text-white/30">No saved scans yet.</p>}
            </div>
          </section>

          <section className="glass p-5 sm:p-6">
            <p className="eyebrow">CUSTOM RESULT</p>
            <h2 className="text-2xl font-black mt-1">Tune the result</h2>
            <p className="text-sm text-white/40 mt-2">Leave individual metrics blank to let LUMINA derive them from the overall score.</p>

            <div className="grid sm:grid-cols-2 gap-4 mt-5">
              <label className="block">
                <span className="text-xs text-white/40">Overall rating</span>
                <input type="number" min="1" max="10" step=".1" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="8.7" className="field mt-1.5" />
              </label>
              <label className="block">
                <span className="text-xs text-white/40">Tier</span>
                <select value={tierOverride} onChange={(e) => setTierOverride(e.target.value)} className="field mt-1.5">
                  {TIERS.map((t) => <option key={t} value={t}>{t || "Auto from rating"}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3">
                <div><p className="eyebrow">DETAILED METRICS</p><p className="text-xs text-white/30 mt-1">Optional manual values · 1.0–10.0</p></div>
                <button onClick={() => setMetricOverrides({})} className="text-xs text-white/30 hover:text-white">Reset metrics</button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {METRICS.map(([key, label]) => (
                  <label key={key} className="block rounded-xl border border-white/[.06] bg-black/15 p-3">
                    <span className="text-xs text-white/45">{label}</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step=".1"
                      value={metricOverrides[key] ?? ""}
                      onChange={(e) => changeMetric(key, e.target.value)}
                      placeholder="Auto"
                      className="field mt-1.5"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button onClick={save} disabled={busy} className="btn-neon px-6">{busy ? "Saving…" : "Save custom result"}</button>
              {selected.override?.enabled && <button onClick={remove} disabled={busy} className="text-sm text-rose-300/70 hover:text-rose-200">Remove custom result</button>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
