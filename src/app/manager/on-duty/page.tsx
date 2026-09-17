import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function OnDutyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locationIds = await managerLocationIds(session.user.id, session.user.role);
  const now = new Date();

  const onDuty = await prisma.shiftAssignment.findMany({
    where: {
      status: "ASSIGNED",
      clockedInAt: { not: null },
      clockedOutAt: null,
      shift: { locationId: { in: locationIds }, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    include: { user: true, shift: { include: { location: true, requiredSkill: true } } },
  });

  const expected = await prisma.shiftAssignment.findMany({
    where: {
      status: "ASSIGNED",
      shift: { locationId: { in: locationIds }, startsAt: { lte: now }, endsAt: { gte: now } },
    },
    include: { user: true, shift: { include: { location: true } } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1>On Duty Now</h1>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: "11.5px", fontWeight: 600, color: "#16a34a",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: "999px", padding: "2px 10px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Live
          </span>
        </div>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Updates in real-time via SSE — no refresh needed.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "8px" }}>
        {[
          { label: "Clocked In", value: onDuty.length, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
          { label: "Expected on Shift", value: expected.length, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
          { label: "Missing", value: Math.max(0, expected.length - onDuty.length), color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "10px", padding: "16px 20px" }}>
            <div style={{ fontSize: "11.5px", fontWeight: 600, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{label}</div>
            <div style={{ fontSize: "36px", fontWeight: 700, color, letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Clocked in */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Clocked In</h2>
        <div className="card-flat" style={{ overflow: "hidden" }}>
          {onDuty.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              Nobody clocked in right now.
            </div>
          )}
          {onDuty.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "13px 18px",
                borderBottom: i < onDuty.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                {a.user.name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{a.user.name}</p>
                <p style={{ fontSize: "12.5px", color: "#6b7280" }}>{a.shift.location.name} · {a.shift.requiredSkill.name}</p>
              </div>
              <span className="badge badge-green">Clocked in</span>
            </div>
          ))}
        </div>
      </section>

      {/* Expected */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Expected on Shift</h2>
        <div className="card-flat" style={{ overflow: "hidden" }}>
          {expected.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No shifts in progress.
            </div>
          )}
          {expected.map((a, i) => {
            const isIn = a.clockedInAt && !a.clockedOutAt;
            return (
              <div
                key={a.id}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "13px 18px",
                  borderBottom: i < expected.length - 1 ? "1px solid #f3f4f6" : "none",
                }}
              >
                <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "#f3f4f6", color: "#4b5563", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                  {a.user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{a.user.name}</p>
                  <p style={{ fontSize: "12.5px", color: "#6b7280" }}>{a.shift.location.name}</p>
                </div>
                <span className={isIn ? "badge badge-green" : "badge badge-red"}>
                  {isIn ? "Present" : "Not clocked in"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
