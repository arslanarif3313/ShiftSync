import { prisma } from "@/lib/db";

export default async function AuditPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Audit Export</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Download a CSV of all schedule changes within a date range.
        </p>
      </div>

      <div className="card" style={{ padding: "24px", maxWidth: "560px" }}>
        <form method="GET" action="/api/admin/audit/export">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label className="form-label" htmlFor="audit-from">From</label>
                <input
                  id="audit-from"
                  type="date"
                  name="from"
                  defaultValue={weekAgo}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="audit-to">To</label>
                <input
                  id="audit-to"
                  type="date"
                  name="to"
                  defaultValue={today}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="audit-location">Location</label>
              <select id="audit-location" name="locationId" className="form-input">
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div>
              <button type="submit" className="btn btn-primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="alert alert-info" style={{ maxWidth: "560px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        The CSV includes all shift assignments, status changes, and actor details within the selected range. Times are in UTC.
      </div>
    </div>
  );
}
