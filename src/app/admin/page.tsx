import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function AdminHome() {
  const [locations, users, shifts] = await Promise.all([
    prisma.location.count(),
    prisma.user.count(),
    prisma.shift.count(),
  ]);

  const stats = [
    {
      label: "Locations",
      value: locations,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
      ),
    },
    {
      label: "Total Users",
      value: users,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: "Total Shifts",
      value: shifts,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
  ];

  const quickLinks = [
    { href: "/admin/on-duty",  label: "Live On-Duty",    desc: "See who's clocked in right now" },
    { href: "/admin/audit",    label: "Audit Logs",       desc: "Export change history by date range" },
    { href: "/notifications",  label: "Notifications",    desc: "View system alerts and messages" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="page-header">
        <h1>Admin Overview</h1>
        <p style={{ marginTop: "4px", fontSize: "13.5px", color: "#6b7280" }}>
          Corporate view across all Coastal Eats locations.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="stat-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 500, color: "#6b7280" }}>{label}</span>
              <div style={{ color: "#9ca3af" }}>{icon}</div>
            </div>
            <p style={{ fontSize: "32px", fontWeight: 700, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1 }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Quick Access</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {quickLinks.map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "block",
                padding: "16px",
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                textDecoration: "none",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#93c5fd";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 0 3px #dbeafe";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e5e7eb";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "none";
              }}
            >
              <p style={{ fontSize: "13.5px", fontWeight: 600, color: "#111827", marginBottom: "3px" }}>{label}</p>
              <p style={{ fontSize: "12.5px", color: "#6b7280" }}>{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
