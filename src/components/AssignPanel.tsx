"use client";

import { useState } from "react";
import { ConstraintFeedback } from "./ConstraintFeedback";

type StaffOption = { id: string; name: string };

type Result = {
  ok: boolean;
  violations?: { code: string; message: string }[];
  warnings?: { code: string; message: string }[];
  suggestions?: { userId: string; name: string; reason: string }[];
};

export function AssignPanel({
  shiftId,
  shiftVersion,
  staff,
}: {
  shiftId: string;
  shiftVersion: number;
  staff: StaffOption[];
}) {
  const [userId, setUserId] = useState(staff[0]?.id ?? "");
  const [overrideReason, setOverrideReason] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(shiftVersion);

  async function runWhatIf(id = userId) {
    const res = await fetch(`/api/shifts/${shiftId}/what-if`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, seventhDayOverrideReason: overrideReason || undefined }),
    });
    setResult(await res.json());
  }

  async function assign(id = userId) {
    setPending(true);
    const res = await fetch(`/api/shifts/${shiftId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, shiftVersion: version, seventhDayOverrideReason: overrideReason || undefined }),
    });
    const data = await res.json();
    setResult(data);
    setPending(false);
    if (data.ok) { setVersion((v) => v + 1); window.location.reload(); }
  }

  return (
    <div className="card" style={{ padding: "22px 24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "18px" }}>
        Assign Staff
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Staff selector */}
        <div>
          <label className="form-label" htmlFor="assign-staff">Staff member</label>
          <select
            id="assign-staff"
            className="form-input"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {staff.length === 0 && <option value="">No eligible staff</option>}
          </select>
        </div>

        {/* Override reason */}
        <div>
          <label className="form-label" htmlFor="override-reason">
            7th-day override reason
            <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "4px" }}>(if required)</span>
          </label>
          <textarea
            id="override-reason"
            className="form-input"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={2}
            placeholder="Required only when assigning a 7th consecutive day..."
            style={{ resize: "vertical", minHeight: "64px" }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => runWhatIf()}
            className="btn btn-secondary"
            disabled={!userId}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            What-if impact
          </button>
          <button
            type="button"
            disabled={pending || !userId}
            onClick={() => assign()}
            className="btn btn-primary"
          >
            {pending ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Assigning…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Confirm assign
              </>
            )}
          </button>
        </div>

        <ConstraintFeedback
          result={result}
          onPickSuggestion={(id) => { setUserId(id); runWhatIf(id); }}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
