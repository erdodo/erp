"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const NAV = [
  { href: "/dashboard/sales",                  label: "Dashboard",  icon: "pi-chart-bar",  alt: "d" },
  { href: "/dashboard/sales/orders",           label: "Siparişler", icon: "pi-file-edit",  alt: "s" },
  { href: "/dashboard/sales/products",         label: "Ürünler",    icon: "pi-box",        alt: "u" },
  { href: "/dashboard/sales/current-account",  label: "Cari",       icon: "pi-wallet",     alt: "c" },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.code === "KeyD") { e.preventDefault(); router.push("/dashboard/sales"); }
      if (e.code === "KeyS") { e.preventDefault(); router.push("/dashboard/sales/orders"); }
      if (e.code === "KeyU") { e.preventDefault(); router.push("/dashboard/sales/products"); }
      if (e.code === "KeyC") { e.preventDefault(); router.push("/dashboard/sales/current-account"); }
      if (e.code === "KeyN") { e.preventDefault(); router.push("/dashboard/sales/orders/new"); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [router]);

  return (
    <div className="max-w-screen-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-shopping-cart text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">Satış</h1>
            <p className="text-xs text-slate-400">Sipariş & Faturalama</p>
          </div>
        </div>
        <Link href="/dashboard/sales/orders/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus" /> Yeni Sipariş
          <kbd className="ml-1 text-xs opacity-70 bg-white/20 px-1 rounded">Alt+N</kbd>
        </Link>
      </div>

      <nav className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {NAV.map((item) => {
          const active = item.href === "/dashboard/sales"
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground hover:border-slate-300"
              }`}
              style={active ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className={`pi ${item.icon} text-xs`} />{item.label}
              <kbd className="text-xs opacity-40 font-mono hidden sm:block">Alt+{item.alt.toUpperCase()}</kbd>
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
