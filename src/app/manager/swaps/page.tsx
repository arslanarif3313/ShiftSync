import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { managerLocationIds } from "@/lib/permissions";
import { shiftLabel } from "@/lib/format";
import { ApproveDropButton, ApproveSwapButton, RejectDropButton, RejectSwapButton } from "@/components/WorkflowButtons";

export default async function ManagerSwapsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const locationIds = await managerLocationIds(session.user.id, session.user.role);

  const swaps = await prisma.swapRequest.findMany({
    where: { status: "PENDING_MANAGER", shift: { locationId: { in: locationIds } } },
    include: { fromUser: true, toUser: true, shift: { include: { location: true, requiredSkill: true } } },
    orderBy: { createdAt: "desc" },
  });

  const drops = await prisma.dropRequest.findMany({
    where: { status: "CLAIMED_PENDING_MANAGER", shift: { locationId: { in: locationIds } } },
    include: { fromUser: true, claimant: true, shift: { include: { location: true, requiredSkill: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalPending = swaps.length + drops.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1>Approvals</h1>
          {totalPending > 0 && (
            <span className="badge badge-red">{totalPending} pending</span>
          )}
        </div>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Swap requests and drop claims waiting on your approval.
        </p>
      </div>

      {/* Swaps */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Swap Requests
          {swaps.length > 0 && <span className="badge badge-amber" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{swaps.length}</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {swaps.length === 0 && (
            <div className="card-flat" style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No pending swap requests.
            </div>
          )}
          {swaps.map((s) => (
            <div key={s.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{s.fromUser.name}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{s.toUser.name}</span>
                    <span className="badge badge-blue">{s.shift.requiredSkill.name}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    {s.shift.location.name} · {shiftLabel(s.shift.startsAt, s.shift.endsAt, s.shift.location.timezone)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <ApproveSwapButton id={s.id} />
                  <RejectSwapButton id={s.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Drops */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Drop Claims
          {drops.length > 0 && <span className="badge badge-amber" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{drops.length}</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {drops.length === 0 && (
            <div className="card-flat" style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No drop claims to review.
            </div>
          )}
          {drops.map((d) => (
            <div key={d.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#6b7280" }}>{d.fromUser.name}</span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>dropped →</span>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{d.claimant?.name ?? "Unknown"}</span>
                    <span className="badge badge-blue">{d.shift.requiredSkill.name}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    {d.shift.location.name} · {shiftLabel(d.shift.startsAt, d.shift.endsAt, d.shift.location.timezone)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <ApproveDropButton id={d.id} />
                  <RejectDropButton id={d.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
