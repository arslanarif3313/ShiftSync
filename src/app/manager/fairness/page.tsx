import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";
import { fairnessReport } from "@/lib/fairness";

export default async function FairnessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locationIds = await managerLocationIds(session.user.id, session.user.role);
  const locations = await prisma.location.findMany({ where: { id: { in: locationIds } } });

  const from = subDays(new Date(), 28);
  const to = new Date();

  const blocks = await Promise.all(
    locations.map(async (loc) => {
      const report = await fairnessReport({ locationId: loc.id, from, to });
      return { loc, report };
    })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Schedule Fairness</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Last 28 days · Desired hours are targets, not hard caps · Premium = Fri/Sat evenings
        </p>
      </div>

      {blocks.map(({ loc, report }) => {
        const score = report.fairnessScore;
        const scoreColor = score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
        const scoreBg = score >= 75 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fef2f2";
        const scoreBorder = score >= 75 ? "#bbf7d0" : score >= 50 ? "#fde68a" : "#fecaca";

        return (
          <section key={loc.id}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 600 }}>{loc.name}</h2>
              <div style={{ background: scoreBg, border: `1px solid ${scoreBorder}`, borderRadius: "8px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: scoreColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fairness score</span>
                <span style={{ fontSize: "18px", fontWeight: 700, color: scoreColor, letterSpacing: "-0.03em" }}>{score}<span style={{ fontSize: "11px", fontWeight: 500 }}>/100</span></span>
              </div>
            </div>
            <div className="card-flat" style={{ overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Staff member</th>
                    <th>Hours worked</th>
                    <th>Desired hours</th>
                    <th>Delta</th>
                    <th>Premium shifts</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.userId}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td>{r.hours.toFixed(1)}h</td>
                      <td style={{ color: "#6b7280" }}>{r.desiredHours.toFixed(1)}h</td>
                      <td style={{ color: r.deltaHours < -2 ? "#dc2626" : r.deltaHours > 2 ? "#d97706" : "#16a34a", fontWeight: 600 }}>
                        {r.deltaHours > 0 ? "+" : ""}{r.deltaHours.toFixed(1)}h
                      </td>
                      <td>
                        {r.premiumCount > 0 ? (
                          <span className="badge badge-premium">★ {r.premiumCount}</span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "12.5px" }}>—</span>
                        )}
                      </td>
                      <td>
                        {r.underScheduled ? (
                          <span className="badge badge-blue">Under-scheduled</span>
                        ) : r.overScheduled ? (
                          <span className="badge badge-amber">Over-scheduled</span>
                        ) : (
                          <span className="badge badge-green">On track</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
