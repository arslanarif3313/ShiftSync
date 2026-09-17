import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shiftLabel } from "@/lib/format";
import { ClockButton, OfferDropButton } from "@/components/WorkflowButtons";

export default async function StaffHome() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId: session.user.id,
      status: "ASSIGNED",
      shift: { status: "PUBLISHED" },
    },
    include: { shift: { include: { location: true, requiredSkill: true } } },
    orderBy: { shift: { startsAt: "asc" } },
  });

  const now = new Date();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>My Shifts</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Your upcoming published shifts.
        </p>
      </div>

      {/* Shifts */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {assignments.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              background: "#ffffff",
              border: "1px dashed #d1d5db",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "14px", fontWeight: 500, color: "#4b5563", marginBottom: "4px" }}>
              No published shifts yet
            </p>
            <p style={{ fontSize: "13px", color: "#9ca3af" }}>
              Check back once your manager publishes the schedule.
            </p>
          </div>
        )}

        {assignments.map((a) => {
          const isActive     = a.shift.startsAt <= now && a.shift.endsAt >= now;
          const isClockedIn  = !!a.clockedInAt && !a.clockedOutAt;
          const isClockedOut = !!a.clockedInAt && !!a.clockedOutAt;

          return (
            <div
              key={a.id}
              className="card"
              style={{
                padding: "16px 18px",
                borderLeft: isActive ? "3px solid #22c55e" : isClockedIn ? "3px solid #3b82f6" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  {/* Top row */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                      {a.shift.location.name}
                    </span>
                    <span className="badge badge-blue">{a.shift.requiredSkill.name}</span>
                    {isActive && (
                      <span className="badge badge-green">
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                        Live now
                      </span>
                    )}
                    {isClockedOut && (
                      <span className="badge badge-neutral">Completed</span>
                    )}
                    {isClockedIn && !isClockedOut && (
                      <span className="badge badge-blue">Clocked in</span>
                    )}
                  </div>

                  {/* Time */}
                  <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
                    {shiftLabel(a.shift.startsAt, a.shift.endsAt, a.shift.location.timezone)}
                  </p>

                  {/* Actions */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {!a.clockedInAt && <ClockButton assignmentId={a.id} action="in" />}
                    {a.clockedInAt && !a.clockedOutAt && <ClockButton assignmentId={a.id} action="out" />}
                    <OfferDropButton shiftId={a.shiftId} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
