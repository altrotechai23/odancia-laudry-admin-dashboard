import type { UserRole } from "@/lib/constants/app";

export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
};

export const staffNavigation: NavigationItem[] = [
  {
    label: "Services",
    href: "/dashboard/services",
    icon: "services",
  },
];

export const adminNavigation: NavigationItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: "overview",
  },
  {
    label: "Services",
    href: "/dashboard/services",
    icon: "services",
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: "clients",
  },
  {
    label: "Payments",
    href: "/dashboard/payments",
    icon: "payments",
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: "reports",
  },
  {
    label: "Staff",
    href: "/dashboard/staff",
    icon: "staff",
  },
  {
    label: "Activity",
    href: "/dashboard/activity",
    icon: "activity",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
];

export function getNavigationForRole(
  role: UserRole,
): NavigationItem[] {
  if (role === "staff") {
    return staffNavigation;
  }

  return adminNavigation;
}