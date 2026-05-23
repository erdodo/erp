"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/dashboard/production",          label: "Dashboard",    icon: "pi-chart-bar",    code: "KeyD" },
  { href: "/dashboard/production/orders",   label: "Üretim Emirleri", icon: "pi-list",      code: "KeyO" },
  { href: "/dashboard/production/lines",    label: "Hatlar",       icon: "pi-sliders-h",    code: "KeyL" },
];

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.code === "KeyD") { e.preventDefault(); router.push("/dashboard/production"); }
      if (e.code === "KeyO") { e.preventDefault(); router.push("/dashboard/production/orders"); }
      if (e.code === "KeyL") { e.preventDefault(); router.push("/dashboard/production/lines"); }
      if (e.code === "KeyN") { e.preventDefault(); router.push("/dashboard/production/orders/new"); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-cog text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">Üretim Takip</h1>
            <p className="text-xs text-slate-400">Üretim emirleri & hat yönetimi</p>
          </div>
        </div>
        <Link href="/dashboard/production/orders/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus" /> Yeni Üretim Emri
          <kbd className="ml-1 text-xs opacity-70 font-mono bg-white/20 px-1 rounded">Alt+N</kbd>
        </Link>
      </div>

      <nav className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {NAV.map((item) => {
          const active = item.href === "/dashboard/production"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground hover:border-slate-300"
              }`}
              style={active ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className={`pi ${item.icon} text-xs`} />
              {item.label}
              <kbd className="text-xs opacity-40 font-mono hidden sm:block">Alt+{item.code.replace("Key","")}</kbd>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
