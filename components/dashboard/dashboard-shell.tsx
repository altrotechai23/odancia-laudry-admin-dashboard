"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { CurrentUserProfile } from "@/lib/auth/get-current-user";
import { getNavigationForRole } from "./navigation";
import { logout } from "@/app/(dashboard)/actions";

type DashboardShellProps = {
  profile: CurrentUserProfile;
  children: React.ReactNode;
};

export default function DashboardShell({
  profile,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = getNavigationForRole(profile.role);

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-black/[0.06] bg-white/90 backdrop-blur-2xl transition-all duration-300",
          collapsed ? "w-[76px]" : "w-[260px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-20 items-center border-b border-black/[0.06] px-4">
          <Link
            href="/dashboard/services"
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-950 text-sm font-bold text-white shadow-lg">
              O
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  Odancia
                </p>

                <p className="truncate text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                  Laundry OS
                </p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <p
            className={[
              "mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400",
              collapsed ? "text-center" : "",
            ].join(" ")}
          >
            {collapsed ? "•" : "Workspace"}
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group flex h-11 items-center rounded-xl text-sm transition",
                    collapsed
                      ? "justify-center px-2"
                      : "gap-3 px-3",
                    active
                      ? "bg-neutral-950 text-white shadow-sm"
                      : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950",
                  ].join(" ")}
                >
                  <NavigationIcon
                    type={item.icon}
                    active={active}
                  />

                  {!collapsed && (
                    <span className="truncate font-medium">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-black/[0.06] p-3">
          <div
            className={[
              "mb-2 flex items-center rounded-xl bg-neutral-50 p-2",
              collapsed ? "justify-center" : "gap-3",
            ].join(" ")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
              {getInitials(profile.full_name)}
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">
                  {profile.full_name}
                </p>

                <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                  {profile.role}
                </p>
              </div>
            )}
          </div>

          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? "Log out" : undefined}
              className={[
                "flex h-10 w-full items-center rounded-xl text-sm text-neutral-500 transition hover:bg-red-50 hover:text-red-600",
                collapsed
                  ? "justify-center px-2"
                  : "gap-3 px-3",
              ].join(" ")}
            >
              <LogoutIcon />

              {!collapsed && <span>Log out</span>}
            </button>
          </form>
        </div>
      </aside>

      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
        ].join(" ")}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-black/[0.06] bg-[#f7f7f5]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-white lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon />
            </button>

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-white text-neutral-500 transition hover:text-neutral-950 lg:flex"
              aria-label={
                collapsed
                  ? "Expand navigation"
                  : "Collapse navigation"
              }
            >
              <SidebarIcon />
            </button>

            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
                {profile.role === "staff"
                  ? "Staff workspace"
                  : "Business workspace"}
              </p>

              <p className="mt-0.5 text-sm font-medium">
                Odancia Laundry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-black/[0.06] bg-white px-3 py-2 text-xs text-neutral-500 sm:block">
              ZAR · South Africa
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-xs font-semibold">
              {getInitials(profile.full_name)}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function NavigationIcon({
  type,
  active,
}: {
  type: string;
  active: boolean;
}) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "overview") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (type === "services") {
    return (
      <svg {...common}>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    );
  }

  if (type === "clients") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 11a3 3 0 1 0 0-6" />
        <path d="M16 15a5 5 0 0 1 4.5 5" />
      </svg>
    );
  }

  if (type === "payments") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    );
  }

  if (type === "reports") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 2 5-6" />
      </svg>
    );
  }

  if (type === "staff") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === "activity") {
    return (
      <svg {...common}>
        <path d="M4 5h16" />
        <path d="M4 12h16" />
        <path d="M4 19h16" />
        <circle cx="8" cy="5" r="1" fill={active ? "currentColor" : "none"} />
        <circle cx="15" cy="12" r="1" fill={active ? "currentColor" : "none"} />
        <circle cx="10" cy="19" r="1" fill={active ? "currentColor" : "none"} />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
      <path d="m5.6 5.6 1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="m13 9 3 3-3 3" />
    </svg>
  );
}