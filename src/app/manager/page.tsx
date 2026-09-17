import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";
import { shiftLabel } from "@/lib/format";
import { PublishWeekButton } from "@/components/PublishWeekButton";

export default async function ManagerHome() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locationIds = await managerLocationIds(session.user.id, session.user.role);

  const shifts = await prisma.shift.findMany({
    where: { locationId: { in: locationIds } },
    include: { location: true, requiredSkill: true, assignments: { include: { user: true } } },
    orderBy: { startsAt: "asc" },
    take: 50,
  });

  const weeks = await prisma.scheduleWeek.findMany({
    where: { locationId: { in: locationIds } },
    include: { location: true },
    orderBy: { weekStart: "desc" },
    take: 10,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Schedule</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Times shown in each location&apos;s local timezone.
        </p>
      </div>

      {/* Schedule weeks */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Schedule Weeks</h2>
        <div className="card-flat" style={{ overflow: "hidden" }}>
          {weeks.length === 0 && (
            <p style={{ padding: "24px", color: "#9ca3af", fontSize: "13.5px", textAlign: "center" }}>
              No schedule weeks yet.
            </p>
          )}
          {weeks.map((w, i) => (
            <div
              key={w.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 18px",
                borderBottom: i < weeks.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className={`dot ${w.publishedAt ? "dot-green" : "dot-amber"}`} />
                <div>
                  <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#111827" }}>{w.location.name}</p>
                  <p style={{ fontSize: "12.5px", color: "#6b7280" }}>
                    Week of {w.weekStart.toISOString().slice(0, 10)}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={w.publishedAt ? "badge badge-green" : "badge badge-amber"}>
                  {w.publishedAt ? "Published" : "Draft"}
                </span>
                <PublishWeekButton scheduleWeekId={w.id} publish={!w.publishedAt} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shifts */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Upcoming Shifts
          <span className="badge badge-neutral" style={{ marginLeft: "8px", verticalAlign: "middle" }}>
            {shifts.length}
          </span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {shifts.length === 0 && (
            <div
              className="card-flat"
              style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}
            >
              No shifts found for your locations.
            </div>
          )}
          {shifts.map((s) => {
            const filled = s.assignments.length;
            const pct    = Math.min(100, (filled / s.headcount) * 100);
            const isFull = filled >= s.headcount;
            const barColor = isFull ? "#22c55e" : filled === 0 ? "#ef4444" : "#3b82f6";

            return (
              <div
                key={s.id}
                className="card"
                style={{ padding: "16px 18px" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    {/* Top row */}
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                        {s.location.name}
                      </span>
                      <span className="badge badge-blue">{s.requiredSkill.name}</span>
                      {s.isPremium && <span className="badge badge-premium">★ Premium</span>}
                      <span className={`badge ${
                        s.status === "PUBLISHED" ? "badge-green" : "badge-neutral"
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    {/* Time */}
                    <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
                      {shiftLabel(s.startsAt, s.endsAt, s.location.timezone)}
                    </p>

                    {/* Fill */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <div className="progress-track" style={{ width: "120px" }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        {filled}/{s.headcount} filled
                      </span>
                    </div>

                    {/* Assigned names */}
                    {filled > 0 ? (
                      <p style={{ fontSize: "12.5px", color: "#4b5563" }}>
                        {s.assignments.map((a) => a.user.name).join(", ")}
                      </p>
                    ) : (
                      <p style={{ fontSize: "12.5px", color: "#dc2626", fontWeight: 500 }}>
                        Unassigned
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/manager/shifts/${s.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: "none", alignSelf: "flex-start" }}
                  >
                    Open
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
