import { AppShell } from "@/components/AppShell";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      links={[
        { href: "/staff", label: "My shifts" },
        { href: "/staff/availability", label: "Availability" },
        { href: "/staff/marketplace", label: "Open shifts" },
        { href: "/staff/swaps", label: "Swaps" },
        { href: "/notifications", label: "Notifications" },
      ]}
    >
      {children}
    </AppShell>
  );
}
