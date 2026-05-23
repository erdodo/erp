"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useHotkey } from "@/hooks/useHotkey";
import { useShortcutStore } from "@/stores/shortcut-store";

const TABS = [
  { href: "/dashboard/admin/settings",  label: "Ayarlar",     icon: "pi-cog",      shortcut: "1" },
  { href: "/dashboard/admin/users",     label: "Kullanıcılar", icon: "pi-users",    shortcut: "2" },
  { href: "/dashboard/admin/roles",     label: "Roller",       icon: "pi-shield",   shortcut: "3" },
  { href: "/dashboard/admin/departments", label: "Departmanlar", icon: "pi-sitemap", shortcut: "4" },
  { href: "/dashboard/admin/workflows", label: "Workflows",    icon: "pi-directions-alt", shortcut: "5" },
];

function useIsMac() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent);
  }, []);
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const altPressed = useShortcutStore((s) => s.altPressed);
  const isMac = useIsMac();

  useHotkey("1", "Ayarlar", "Admin: Şirket ayarları", () => router.push(TABS[0].href));
  useHotkey("2", "Kullanıcılar", "Admin: Kullanıcı yönetimi", () => router.push(TABS[1].href));
  useHotkey("3", "Roller", "Admin: Rol ve izin yönetimi", () => router.push(TABS[2].href));
  useHotkey("4", "Departmanlar", "Admin: Departman yönetimi", () => router.push(TABS[3].href));
  useHotkey("5", "Workflows", "Admin: Workflow motoru", () => router.push(TABS[4].href));

  const active = TABS.find((t) => pathname === t.href) ?? TABS[0];
  const modKey = isMac ? "⌥" : "Alt+";

  return (
    <div className="mb-6">
      {/* Desktop: pill tabs */}
      <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                  : "text-slate-500 hover:text-foreground hover:bg-white/50 dark:hover:bg-slate-700/50"
              }`}
            >
              <i className={`pi ${tab.icon} text-xs`} style={isActive ? { color: "var(--color-primary)" } : {}} />
              {tab.label}
              {altPressed && (
                <kbd className="ml-1 text-xs px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-400 font-mono animate-in fade-in duration-100">
                  {modKey}{tab.shortcut}
                </kbd>
              )}
            </Link>
          );
        })}
      </div>

      {/* Mobile: select dropdown */}
      <div className="sm:hidden">
        <select
          value={active.href}
          onChange={(e) => router.push(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none"
        >
          {TABS.map((tab) => (
            <option key={tab.href} value={tab.href}>{tab.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
