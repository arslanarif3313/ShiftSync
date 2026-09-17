import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MarkReadButton } from "@/components/MarkReadButton";
import { AppShell } from "@/components/AppShell";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notes = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const links =
    session.user.role === "ADMIN"
      ? [{ href: "/admin", label: "Overview" }, { href: "/notifications", label: "Notifications" }]
      : session.user.role === "MANAGER"
        ? [{ href: "/manager", label: "Schedule" }, { href: "/notifications", label: "Notifications" }]
        : [{ href: "/staff", label: "My shifts" }, { href: "/notifications", label: "Notifications" }];

  const unread = notes.filter((n) => !n.readAt).length;

  return (
    <AppShell links={links}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>Notification Center</h1>
            {unread > 0 && <span className="badge badge-blue">{unread} unread</span>}
          </div>
          <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
            Your latest alerts and schedule updates.
          </p>
        </div>

        <div className="card-flat" style={{ overflow: "hidden" }}>
          {notes.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "#9ca3af" }}>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "#4b5563", marginBottom: "4px" }}>No notifications yet</p>
              <p style={{ fontSize: "13px" }}>You&apos;ll be notified here when something needs your attention.</p>
            </div>
          )}
          {notes.map((n, i) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                padding: "14px 18px",
                borderBottom: i < notes.length - 1 ? "1px solid #f3f4f6" : "none",
                background: n.readAt ? "transparent" : "#eff6ff",
              }}
            >
              <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: 0 }}>
                {/* Unread dot */}
                <div style={{ paddingTop: "5px", flexShrink: 0 }}>
                  <span
                    style={{
                      width: "7px", height: "7px", borderRadius: "50%",
                      background: n.readAt ? "#d1d5db" : "#3b82f6",
                      display: "block",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "13.5px", fontWeight: n.readAt ? 400 : 600, color: n.readAt ? "#4b5563" : "#111827", marginBottom: "2px" }}>
                    {n.title}
                  </p>
                  <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>{n.body}</p>
                  <p style={{ fontSize: "11.5px", color: "#9ca3af" }}>
                    {new Date(n.createdAt).toLocaleString()}
                    {n.emailSimulatedAt && " · Email sent"}
                  </p>
                </div>
              </div>
              {!n.readAt && (
                <div style={{ flexShrink: 0 }}>
                  <MarkReadButton id={n.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
