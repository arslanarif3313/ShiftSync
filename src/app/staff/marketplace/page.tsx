import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shiftLabel } from "@/lib/format";
import { ClaimDropButton } from "@/components/WorkflowButtons";

export default async function MarketplacePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const certs = await prisma.staffLocation.findMany({
    where: { userId: session.user.id, certified: true },
    select: { locationId: true },
  });
  const locationIds = certs.map((c) => c.locationId);

  const openDrops = await prisma.dropRequest.findMany({
    where: {
      status: "OPEN",
      fromUserId: { not: session.user.id },
      shift: { locationId: { in: locationIds }, status: "PUBLISHED" },
    },
    include: { fromUser: true, shift: { include: { location: true, requiredSkill: true } } },
    orderBy: { expiresAt: "asc" },
  });

  const unassigned = await prisma.shift.findMany({
    where: {
      locationId: { in: locationIds },
      status: "PUBLISHED",
      assignments: { none: { status: "ASSIGNED" } },
    },
    include: { location: true, requiredSkill: true },
    orderBy: { startsAt: "asc" },
    take: 20,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Open Shifts</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Available drops and unassigned shifts at your certified locations.
        </p>
      </div>

      {/* Drop marketplace */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Drop Marketplace
          {openDrops.length > 0 && <span className="badge badge-blue" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{openDrops.length} available</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {openDrops.length === 0 && (
            <div className="card-flat" style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No open drops right now. Check back later.
            </div>
          )}
          {openDrops.map((d) => {
            const hoursUntil = d.expiresAt ? (new Date(d.expiresAt).getTime() - Date.now()) / 3600000 : null;
            const expiringSoon = hoursUntil !== null && hoursUntil < 6;
            return (
              <div key={d.id} className="card" style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                        {d.shift.location.name}
                      </span>
                      <span className="badge badge-blue">{d.shift.requiredSkill.name}</span>
                      {expiringSoon && <span className="badge badge-red">Expires soon</span>}
                    </div>
                    <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                      {shiftLabel(d.shift.startsAt, d.shift.endsAt, d.shift.location.timezone)}
                    </p>
                    <p style={{ fontSize: "12.5px", color: "#9ca3af" }}>
                      Offered by {d.fromUser.name}
                      {d.expiresAt && ` · Expires ${new Date(d.expiresAt).toLocaleString()}`}
                    </p>
                  </div>
                  <ClaimDropButton id={d.id} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Unassigned */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>
          Unassigned Published Shifts
          {unassigned.length > 0 && <span className="badge badge-neutral" style={{ marginLeft: "8px", verticalAlign: "middle" }}>{unassigned.length}</span>}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {unassigned.length === 0 && (
            <div className="card-flat" style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No unassigned shifts available.
            </div>
          )}
          {unassigned.map((s) => (
            <div key={s.id} className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{s.location.name}</span>
                <span className="badge badge-blue">{s.requiredSkill.name}</span>
                {s.isPremium && <span className="badge badge-premium">★ Premium</span>}
              </div>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>
                {shiftLabel(s.startsAt, s.endsAt, s.location.timezone)}
              </p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                Ask your manager to assign you, or wait for a drop offer.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
