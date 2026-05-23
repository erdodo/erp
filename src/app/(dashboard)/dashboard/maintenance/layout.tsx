"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard/maintenance",         label: "Bakım Planları", icon: "pi-calendar"  },
  { href: "/dashboard/maintenance/records", label: "Bakım Kayıtları",icon: "pi-history"   },
];

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-screen-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-calendar text-white text-sm" />
        </div>
        <div>
          <h1 className="font-bold text-foreground text-lg leading-tight">Bakım Yönetimi</h1>
          <p className="text-xs text-slate-400">Önleyici · Düzeltici · Kestirimci</p>
        </div>
      </div>
      <nav className="flex items-center gap-1 border-b border-border">
        {NAV.map((item) => {
          const active = item.href === "/dashboard/maintenance" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground hover:border-slate-300"}`}
              style={active ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className={`pi ${item.icon} text-xs`} />{item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
