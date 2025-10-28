import React, { useEffect, useState } from "react";

const FREE_QUOTA = 500_000;

export default function UsageBadge() {
  const [usage, setUsage] = useState({ month: "", chars: 0, raw: {} });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchUsage = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/usage");
      // better error info
      if (!res.ok) {
        const body = await res.text().catch(() => "<no body>");
        throw new Error(`status=${res.status} body=${body}`);
      }
      const json = await res.json();
      // normalize shape
      setUsage({
        month: json.month || new Date().toISOString().slice(0, 7),
        chars: Number(json.chars || 0),
        raw: json.raw || {},
      });
    } catch (e) {
      console.error("[UsageBadge] fetch failed", e);
      setErr(String(e));
      // graceful fallback so UI doesn't show "Error" only
      setUsage((u) => ({
        ...u,
        month: u.month || new Date().toISOString().slice(0, 7),
        chars: u.chars || 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  fetchUsage();

  const id = setInterval(fetchUsage, 60_000); // refresh every 60s

  // listen for manual refresh events
  window.addEventListener("tts-usage-updated", fetchUsage);

  return () => {
    clearInterval(id);
    window.removeEventListener("tts-usage-updated", fetchUsage);
  };
  }, []);


  const used = usage.chars || 0;
  const pct = Math.min(100, Math.round((used / FREE_QUOTA) * 10000) / 100); // 2 decimals
  const barWidth = `${pct}%`;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="p-3 bg-black/40 rounded-lg backdrop-blur-sm shadow-lg w-56">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-white/70">TTS this month</div>
          <div className="text-xs text-white/60">{usage.month}</div>
        </div>

        <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden mb-2">
          <div
            className="h-3 bg-gradient-to-r from-emerald-400 to-emerald-200"
            style={{ width: barWidth }}
          />
        </div>

        <div className="text-xs text-white/80">
          {loading ? (
            "Loading…"
          ) : err ? (
            <>
              <span className="text-pink-300">Error</span>
              <div className="text-xxs text-white/60 mt-1 break-words">{err}</div>
            </>
          ) : (
            <>
              <strong className="font-mono">{used.toLocaleString()}</strong> /{" "}
              {FREE_QUOTA.toLocaleString()} chars ({pct}%)
            </>
          )}
        </div>
      </div>
    </div>
  );
}