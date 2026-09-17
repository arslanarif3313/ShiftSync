import { AppShell } from "@/components/AppShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      links={[
        { href: "/manager", label: "Schedule" },
        { href: "/manager/on-duty", label: "On duty" },
        { href: "/manager/overtime", label: "Overtime" },
        { href: "/manager/fairness", label: "Fairness" },
        { href: "/manager/swaps", label: "Swaps" },
        { href: "/notifications", label: "Notifications" },
      ]}
    >
      {children}
    </AppShell>
  );
}
