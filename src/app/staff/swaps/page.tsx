import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shiftLabel } from "@/lib/format";
import { SwapRequestForm } from "@/components/SwapRequestForm";
import { AcceptPeerSwapButton, CancelSwapButton, DeclinePeerSwapButton } from "@/components/WorkflowButtons";

export default async function StaffSwapsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const myAssignments = await prisma.shiftAssignment.findMany({
    where: {
      userId: session.user.id,
      status: "ASSIGNED",
      shift: { status: "PUBLISHED", startsAt: { gt: new Date() } },
    },
    include: { shift: { include: { location: true, requiredSkill: true } } },
  });

  const peers = await prisma.user.findMany({
    where: { role: "STAFF", id: { not: session.user.id } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const incoming = await prisma.swapRequest.findMany({
    where: { toUserId: session.user.id, status: "PENDING_PEER" },
    include: { fromUser: true, shift: { include: { location: true, requiredSkill: true } } },
  });

  const outgoing = await prisma.swapRequest.findMany({
    where: { fromUserId: session.user.id, status: { in: ["PENDING_PEER", "PENDING_MANAGER"] } },
    include: { toUser: true, shift: { include: { location: true, requiredSkill: true } } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1>Shift Swaps</h1>
          {incoming.length > 0 && (
            <span className="badge badge-red">{incoming.length} incoming</span>
          )}
        </div>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Request a swap with a peer, or respond to incoming requests.
        </p>
      </div>

      {/* Request form */}
      <SwapRequestForm
        shifts={myAssignments.map((a) => ({
          id: a.shiftId,
          label: `${a.shift.location.name} · ${shiftLabel(a.shift.startsAt, a.shift.endsAt, a.shift.location.timezone)}`,
        }))}
        peers={peers}
      />

      {/* Incoming */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Incoming Requests
          {incoming.length > 0 && <span className="badge badge-red" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{incoming.length}</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {incoming.length === 0 && (
            <div className="card-flat" style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No incoming swap requests.
            </div>
          )}
          {incoming.map((s) => (
            <div key={s.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{s.fromUser.name}</span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>wants to swap</span>
                    <span className="badge badge-blue">{s.shift.requiredSkill.name}</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    {s.shift.location.name} · {shiftLabel(s.shift.startsAt, s.shift.endsAt, s.shift.location.timezone)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <AcceptPeerSwapButton id={s.id} />
                  <DeclinePeerSwapButton id={s.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My pending */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          My Pending Requests
          {outgoing.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{outgoing.length}</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {outgoing.length === 0 && (
            <div className="card-flat" style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No outgoing swap requests.
            </div>
          )}
          {outgoing.map((s) => (
            <div key={s.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                      To {s.toUser.name}
                    </span>
                    <span className={s.status === "PENDING_PEER" ? "badge badge-amber" : "badge badge-blue"}>
                      {s.status === "PENDING_PEER" ? "Awaiting peer" : "Awaiting manager"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#6b7280" }}>
                    {s.shift.location.name} · {shiftLabel(s.shift.startsAt, s.shift.endsAt, s.shift.location.timezone)}
                  </p>
                </div>
                <CancelSwapButton id={s.id} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
