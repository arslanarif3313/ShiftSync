import { AppShell } from "@/components/AppShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      links={[
        { href: "/admin", label: "Overview" },
        { href: "/admin/audit", label: "Audit export" },
        { href: "/admin/on-duty", label: "On duty" },
        { href: "/notifications", label: "Notifications" },
      ]}
    >
      {children}
    </AppShell>
  );
}
