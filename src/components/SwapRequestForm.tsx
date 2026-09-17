"use client";

import { useState } from "react";

export function SwapRequestForm({
  shifts,
  peers,
}: {
  shifts: { id: string; label: string }[];
  peers: { id: string; name: string }[];
}) {
  const [shiftId, setShiftId] = useState(shifts[0]?.id ?? "");
  const [toUserId, setToUserId] = useState(peers[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (shifts.length === 0) {
    return (
      <div
        style={{
          background: "#f9fafb",
          border: "1px dashed #d1d5db",
          borderRadius: "10px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "14px", fontWeight: 500, color: "#4b5563", marginBottom: "4px" }}>
          No upcoming shifts
        </p>
        <p style={{ fontSize: "13px", color: "#9ca3af" }}>
          You need a published shift to request a swap.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "22px 24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "18px" }}>
        Request a Swap
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label className="form-label" htmlFor="swap-shift">Your shift</label>
          <select
            id="swap-shift"
            className="form-input"
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor="swap-with">Swap with</label>
          <select
            id="swap-with"
            className="form-input"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
          >
            {peers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {msg && (
          <div className="alert alert-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {msg}
          </div>
        )}

        <div>
          <button
            type="button"
            disabled={pending || !shiftId || !toUserId}
            className="btn btn-primary"
            onClick={async () => {
              setPending(true);
              setMsg(null);
              const res = await fetch("/api/swaps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shiftId, toUserId }),
              });
              const data = await res.json();
              setPending(false);
              if (!res.ok) { setMsg(data.error ?? "Something went wrong."); return; }
              window.location.reload();
            }}
          >
            {pending ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send swap request
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
