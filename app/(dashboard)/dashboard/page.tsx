import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/get-current-user";

export default async function DashboardPage() {
  const profile = await requireUser();

  if (profile.role === "staff") {
    redirect("/dashboard/services");
  }

  // Owner and Admin stay on the overview dashboard
  return (
    <main>
      {/* Owner/Admin dashboard goes here */}
    </main>
  );
}