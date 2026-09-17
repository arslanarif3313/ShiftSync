import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shiftLabel } from "@/lib/format";
import { AssignPanel } from "@/components/AssignPanel";
import Link from "next/link";

export default async function ManagerShiftPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { shiftId } = await params;
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      location: true,
      requiredSkill: true,
      assignments: { include: { user: true } },
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: true },
      },
    },
  });
  if (!shift) notFound();

  const staff = await prisma.user.findMany({
    where: {
      role: "STAFF",
      staffLocations: { some: { locationId: shift.locationId, certified: true } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const filled = shift.assignments.length;
  const isFull = filled >= shift.headcount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6b7280" }}>
        <Link href="/manager" style={{ color: "#6b7280", textDecoration: "none" }}>Schedule</Link>
        <span>/</span>
        <span style={{ color: "#111827", fontWeight: 500 }}>Shift Detail</span>
      </div>

      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>
        {/* Left — shift info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Shift card */}
          <div className="card" style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: 0 }}>
                {shift.location.name}
              </h1>
              <span className="badge badge-blue">{shift.requiredSkill.name}</span>
              {shift.isPremium && <span className="badge badge-premium">★ Premium</span>}
              <span className={`badge ${shift.status === "PUBLISHED" ? "badge-green" : "badge-neutral"}`}>
                {shift.status}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#9ca3af", width: "72px", flexShrink: 0 }}>Time</span>
                <span style={{ color: "#374151", fontWeight: 500 }}>
                  {shiftLabel(shift.startsAt, shift.endsAt, shift.location.timezone)}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "#9ca3af", width: "72px", flexShrink: 0 }}>Headcount</span>
                <span style={{ color: "#374151", fontWeight: 500 }}>
                  {filled}/{shift.headcount}
                  {isFull && <span className="badge badge-green" style={{ marginLeft: "8px" }}>Full</span>}
                  {!isFull && filled === 0 && <span className="badge badge-red" style={{ marginLeft: "8px" }}>Empty</span>}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: "#9ca3af", width: "72px", flexShrink: 0 }}>Assigned</span>
                <span style={{ color: "#374151" }}>
                  {shift.assignments.length > 0
                    ? shift.assignments.map((a) => a.user.name).join(", ")
                    : <span style={{ color: "#dc2626", fontWeight: 500 }}>None</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Audit history */}
          <div className="card" style={{ padding: "22px 24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "14px" }}>
              Audit History
            </h2>
            {shift.auditLogs.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#9ca3af" }}>No audit entries yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {shift.auditLogs.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      padding: "10px 12px",
                      background: "#f9fafb",
                      border: "1px solid #f3f4f6",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#374151" }}>
                        {l.action}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "#9ca3af" }}>
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px" }}>
                      by {l.actor?.name ?? "system"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — assign panel */}
        <AssignPanel shiftId={shift.id} shiftVersion={shift.version} staff={staff} />
      </div>
    </div>
  );
}
