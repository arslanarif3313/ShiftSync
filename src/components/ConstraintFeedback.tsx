"use client";

type Violation = { code: string; message: string };
type Warning   = { code: string; message: string };
type Suggestion = { userId: string; name: string; reason: string };

export function ConstraintFeedback({
  result,
  onPickSuggestion,
}: {
  result: {
    ok: boolean;
    violations?: Violation[];
    warnings?: Warning[];
    suggestions?: Suggestion[];
  } | null;
  onPickSuggestion?: (userId: string) => void;
}) {
  if (!result) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Violations */}
      {!result.ok && result.violations && result.violations.length > 0 && (
        <div className="alert alert-error">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "6px" }}>Cannot assign</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              {result.violations.map((v) => (
                <li key={v.code + v.message} style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <code style={{ fontSize: "11px", background: "#fee2e2", borderRadius: "3px", padding: "1px 5px", fontFamily: "monospace", flexShrink: 0, marginTop: "1px" }}>
                    {v.code}
                  </code>
                  <span>{v.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings && result.warnings.length > 0 && (
        <div className="alert alert-warning">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "6px" }}>Warnings</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              {result.warnings.map((w) => (
                <li key={w.code + w.message} style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <code style={{ fontSize: "11px", background: "#fde68a", borderRadius: "3px", padding: "1px 5px", fontFamily: "monospace", flexShrink: 0, marginTop: "1px" }}>
                    {w.code}
                  </code>
                  <span>{w.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Success */}
      {result.ok && (!result.warnings || result.warnings.length === 0) && (
        <div className="alert alert-success">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Assignment is valid — no constraint violations.
        </div>
      )}

      {/* Suggestions */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="alert alert-info">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, marginBottom: "8px" }}>Suggested alternatives</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {result.suggestions.map((s) => (
                <div key={s.userId} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: "2px" }}>{s.name}</p>
                    <p style={{ fontSize: "12.5px", opacity: 0.85 }}>{s.reason}</p>
                  </div>
                  {onPickSuggestion && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => onPickSuggestion(s.userId)}
                    >
                      Use
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
