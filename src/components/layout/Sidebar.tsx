"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveModules } from "@/hooks/useModule";
import { useThemeStore } from "@/stores/theme-store";
import { MODULE_GROUPS } from "@/lib/modules-data";
import { ShortcutHint } from "@/components/ui/ShortcutHint";
import { useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  const { modules } = useActiveModules();
  const { sidebarCollapsed, toggleSidebar } = useThemeStore();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isSuperAdmin = session?.user?.isSuperAdmin;

  // Use false until mounted to match SSR — avoids Zustand persist hydration mismatch
  const collapsed = mounted ? sidebarCollapsed : false;

  const w = collapsed ? "w-16" : "w-[260px]";

  return (
    <aside
      className={`${w} shrink-0 h-full bg-white dark:bg-slate-900 border-r border-border flex flex-col transition-all duration-200 overflow-hidden`}
      style={{ minHeight: "100vh" }}
    >
      {/* Logo */}
      <div className="flex h-14 border-b border-border shrink-0">
        {collapsed ? (
          <button
            onClick={toggleSidebar}
            title="Kenar çubuğunu aç"
            className="w-16 self-stretch flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <i className="pi pi-chevron-right text-sm" />
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-4 w-full">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--color-primary)" }}
            >
              <i className="pi pi-sitemap text-white text-sm" />
            </div>
            <span className="font-bold text-base truncate flex-1">ERP Sistemi</span>
            <button
              onClick={toggleSidebar}
              title="Kenar çubuğunu daralt"
              className="text-slate-400 hover:text-slate-600 transition p-1 shrink-0"
            >
              <i className="pi pi-chevron-left text-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {/* Dashboard */}
        <NavItem
          href="/dashboard"
          icon="pi-home"
          label="Ana Sayfa"
          shortcut="H"
          active={pathname === "/dashboard"}
          collapsed={collapsed}
        />

        {/* Module groups */}
        {MODULE_GROUPS.map((group) => {
          const groupModules = modules.filter((m) => m.group === group);
          if (groupModules.length === 0) return null;
          return (
            <div key={group} className="mt-3">
              {!collapsed && (
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
                  {group}
                </p>
              )}
              {groupModules.map((m) => (
                <NavItem
                  key={m.slug}
                  href={m.route}
                  icon={m.icon}
                  label={m.name}
                  shortcut={m.shortcut}
                  active={pathname.startsWith(m.route)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          );
        })}

        {/* Admin section */}
        {session?.user?.isAdmin && (
          <div className="mt-3">
            {!collapsed && (
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
                Yönetim
              </p>
            )}
            <NavItem href="/dashboard/admin/settings" icon="pi-cog" label="Ayarlar" shortcut="AS" active={pathname.startsWith("/dashboard/admin")} collapsed={collapsed} />
          </div>
        )}

        {/* SuperAdmin section */}
        {isSuperAdmin && (
          <div className="mt-3">
            {!collapsed && (
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-500 select-none">
                Super Admin
              </p>
            )}
            <NavItem href="/dashboard/superadmin" icon="pi-shield" label="SuperAdmin" shortcut="SA" active={pathname.startsWith("/dashboard/superadmin")} collapsed={collapsed} />
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2 shrink-0 space-y-0.5">
        <NavItem href="/dashboard/onboarding" icon="pi-sparkles" label="Kurulum Sihirbazı" shortcut="OB" active={pathname.startsWith("/dashboard/onboarding")} collapsed={collapsed} />
        <NavItem href="/dashboard/help" icon="pi-question-circle" label="Yardım" shortcut="HE" active={pathname.startsWith("/dashboard/help")} collapsed={collapsed} />
        <NavItem href="/dashboard/notifications" icon="pi-bell" label="Bildirimler" shortcut="NB" active={pathname.startsWith("/dashboard/notifications")} collapsed={collapsed} />
      </div>
    </aside>
  );
}

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  shortcut: string;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ href, icon, label, shortcut, active, collapsed }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "text-white"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      } ${collapsed ? "justify-center" : ""}`}
      style={active ? { background: "var(--color-primary)" } : {}}
    >
      <ShortcutHint shortcut={shortcut}>
        <i className={`pi ${icon} text-sm shrink-0`} />
      </ShortcutHint>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
