import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = String(min % 60).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m} ${ampm}`;
}

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { availability: { orderBy: { dayOfWeek: "asc" } }, availabilityExceptions: { orderBy: { startsAt: "asc" } } },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>My Availability</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Your timezone: <strong style={{ color: "#111827" }}>{user.timezone}</strong> · Shifts display in each location&apos;s timezone.
        </p>
      </div>

      {/* Weekly recurring */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Weekly Schedule</h2>
        <div className="card-flat" style={{ overflow: "hidden" }}>
          {user.availability.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No recurring availability set.
            </div>
          )}
          {user.availability.map((w, i) => (
            <div
              key={w.id}
              style={{
                display: "flex", alignItems: "center", gap: "16px",
                padding: "13px 18px",
                borderBottom: i < user.availability.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <div style={{ width: "90px", fontSize: "13.5px", fontWeight: 600, color: "#374151" }}>
                {DAYS[w.dayOfWeek]}
              </div>
              <span className="badge badge-green">
                {fmt(w.startMin)} – {fmt(w.endMin)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Exceptions */}
      <section>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>One-off Exceptions</h2>
        <div className="card-flat" style={{ overflow: "hidden" }}>
          {user.availabilityExceptions.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af", fontSize: "13.5px" }}>
              No exceptions added.
            </div>
          )}
          {user.availabilityExceptions.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px",
                padding: "13px 18px",
                borderBottom: i < user.availabilityExceptions.length - 1 ? "1px solid #f3f4f6" : "none",
              }}
            >
              <span className={e.isAvailable ? "badge badge-green" : "badge badge-red"}>
                {e.isAvailable ? "Open" : "Blackout"}
              </span>
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>
                {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleString()}
              </span>
              {e.reason && (
                <span style={{ fontSize: "12.5px", color: "#6b7280" }}>· {e.reason}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
