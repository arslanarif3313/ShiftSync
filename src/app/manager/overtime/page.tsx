import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";
import { weeklyLaborReport } from "@/lib/overtime";

export default async function OvertimePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locationIds = await managerLocationIds(session.user.id, session.user.role);
  const locations = await prisma.location.findMany({ where: { id: { in: locationIds } } });

  const reports = [];
  for (const loc of locations) {
    reports.push({ location: loc, report: await weeklyLaborReport({ locationId: loc.id, around: new Date() }) });
  }

  const totalOtCost = reports.reduce((s, r) => s + r.report.totalOtCost, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Overtime Dashboard</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Projected overtime uses 1.5× hourly rate after 40h/week.
        </p>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ background: totalOtCost > 0 ? "#fef2f2" : "#f0fdf4", border: `1px solid ${totalOtCost > 0 ? "#fecaca" : "#bbf7d0"}`, borderRadius: "10px", padding: "16px 24px" }}>
          <div style={{ fontSize: "11.5px", fontWeight: 600, color: totalOtCost > 0 ? "#dc2626" : "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
            Total Projected OT Cost
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: totalOtCost > 0 ? "#dc2626" : "#16a34a", letterSpacing: "-0.04em", lineHeight: 1 }}>
            ${totalOtCost.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Per-location tables */}
      {reports.map(({ location, report }) => (
        <section key={location.id}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600 }}>{location.name}</h2>
            {report.totalOtCost > 0 && (
              <span className="badge badge-red">OT: ${report.totalOtCost.toFixed(2)}</span>
            )}
            {report.totalOtCost === 0 && (
              <span className="badge badge-green">No overtime</span>
            )}
          </div>
          <div className="card-flat" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff member</th>
                  <th>Weekly hours</th>
                  <th>OT hours</th>
                  <th>OT cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const hours = r.minutes / 60;
                  const otHours = r.otMinutes / 60;
                  const isWarn = hours >= 35 && hours < 40;
                  const isOT = otHours > 0;
                  return (
                    <tr key={r.userId}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td>{hours.toFixed(1)}h</td>
                      <td style={{ color: isOT ? "#dc2626" : "#6b7280", fontWeight: isOT ? 600 : 400 }}>
                        {otHours.toFixed(1)}h
                      </td>
                      <td style={{ color: isOT ? "#dc2626" : "#6b7280", fontWeight: isOT ? 600 : 400 }}>
                        ${r.otCost.toFixed(2)}
                      </td>
                      <td>
                        {isOT ? (
                          <span className="badge badge-red">Overtime</span>
                        ) : isWarn ? (
                          <span className="badge badge-amber">Near limit</span>
                        ) : (
                          <span className="badge badge-neutral">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {report.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af" }}>No assignments this week.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
