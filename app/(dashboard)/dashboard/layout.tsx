import { requireUser } from "@/lib/auth/get-current-user";

import DashboardShell from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireUser();

  return (
    <DashboardShell profile={profile}>
      {children}
    </DashboardShell>
  );
}