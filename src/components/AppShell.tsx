import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { RealtimeListener } from "@/components/RealtimeListener";

export async function AppShell({
  children,
  links,
}: {
  children: React.ReactNode;
  links: { href: string; label: string }[];
}) {
  const session = await auth();
  const name  = session?.user?.name ?? "";
  const role  = session?.user?.role ?? "";
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <RealtimeListener />

      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px rgb(0 0 0 / .04)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* Logo + Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1, minWidth: 0 }}>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
                ShiftSync
              </span>
            </Link>

            {/* Divider */}
            <div style={{ width: "1px", height: "20px", background: "#e5e7eb", flexShrink: 0 }} />

            {/* Nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: "2px", flexWrap: "wrap" }}>
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="nav-link">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* User info + sign out */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "#dbeafe",
                  color: "#1d4ed8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials || "?"}
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                  {name}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280", textTransform: "capitalize" }}>
                  {role.toLowerCase()}
                </div>
              </div>
            </div>

            {/* Sign out */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                style={{ gap: "5px" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Page */}
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px 64px" }}>
        {children}
      </main>
    </div>
  );
}
