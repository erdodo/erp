"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/dashboard/crm",           label: "Dashboard", icon: "pi-chart-bar",  alt: "d" },
  { href: "/dashboard/crm/customers", label: "Müşteriler", icon: "pi-users",     alt: "m" },
  { href: "/dashboard/crm/pipeline",  label: "Pipeline",  icon: "pi-list",       alt: "p" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  // Keyboard shortcuts: Alt+D, Alt+M, Alt+P, Alt+N (new)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.code === "KeyD") { e.preventDefault(); router.push("/dashboard/crm"); }
      if (e.code === "KeyM") { e.preventDefault(); router.push("/dashboard/crm/customers"); }
      if (e.code === "KeyP") { e.preventDefault(); router.push("/dashboard/crm/pipeline"); }
      if (e.code === "KeyN") { e.preventDefault(); router.push("/dashboard/crm/customers/new"); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-4">
      {/* CRM Module Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-briefcase text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">CRM</h1>
            <p className="text-xs text-slate-400">Müşteri İlişkileri</p>
          </div>
        </div>

        <Link
          href="/dashboard/crm/customers/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus" /> Yeni Müşteri
          <kbd className="ml-1 text-xs opacity-70 font-mono bg-white/20 px-1 rounded">Alt+N</kbd>
        </Link>
      </div>

      {/* Sub Navigation */}
      <nav className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto">
        {NAV.map((item) => {
          const active = item.href === "/dashboard/crm"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-foreground hover:border-slate-300"
              }`}
              style={active ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}
            >
              <i className={`pi ${item.icon} text-xs`} />
              {item.label}
              <kbd className="text-xs opacity-40 font-mono hidden sm:block">Alt+{item.alt.toUpperCase()}</kbd>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
