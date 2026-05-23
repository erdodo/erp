import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PRODUCTION_STATUSES } from "@/lib/production-types";

export default async function ProductionDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId!;

  const [total, byStatus, lines, recent] = await Promise.all([
    prisma.productionOrder.count({ where: { tenantId, deletedAt: null } }),
    prisma.productionOrder.groupBy({
      by: ["status"], where: { tenantId, deletedAt: null }, _count: { _all: true },
    }),
    prisma.productionLine.findMany({
      where: { tenantId, deletedAt: null, isActive: true },
      include: { _count: { select: { orders: { where: { status: "in_progress" } } } } },
      orderBy: { name: "asc" },
      take: 6,
    }),
    prisma.productionOrder.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { line: { select: { name: true } } },
    }),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
  const executed  = total - (statusMap["planned"] ?? 0);
  const completed = statusMap["completed"] ?? 0;
  const oee       = executed > 0 ? Math.round((completed / executed) * 100) : 0;
  const inProgress = statusMap["in_progress"] ?? 0;

  const kpis = [
    { label: "Toplam Emir",   value: total,      icon: "pi-list",        color: "#6366f1" },
    { label: "Üretimde",      value: inProgress, icon: "pi-spin pi-cog", color: "#f59e0b" },
    { label: "Tamamlandı",    value: completed,  icon: "pi-check-circle",color: "#10b981" },
    { label: "OEE Oranı",     value: `${oee}%`,  icon: "pi-chart-bar",   color: "#3b82f6" },
  ];

  return (
    <div className="pb-8 space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${k.color}20` }}>
              <i className={`pi ${k.icon} text-xl`} style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-slate-400">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-4">Durum Dağılımı</h2>
          <div className="space-y-3">
            {PRODUCTION_STATUSES.map((s) => {
              const count = statusMap[s.id] ?? 0;
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <i className={`pi ${s.icon} text-xs`} style={{ color: s.color }} />{s.label}
                    </span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Lines */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Aktif Hatlar</h2>
            <Link href="/dashboard/production/lines" className="text-xs hover:underline" style={{ color: "var(--color-primary)" }}>Tümü</Link>
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Hat tanımlı değil</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${line._count.orders > 0 ? "#f59e0b" : "#10b981"}20` }}>
                      <i className="pi pi-sliders-h text-xs" style={{ color: line._count.orders > 0 ? "#f59e0b" : "#10b981" }} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{line.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${line._count.orders > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {line._count.orders > 0 ? `${line._count.orders} aktif` : "Boş"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OEE Gauge */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 flex flex-col items-center justify-center">
          <h2 className="font-semibold text-foreground mb-4 self-start">OEE Performansı</h2>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="12" />
              <circle cx="60" cy="60" r="50" fill="none"
                stroke={oee >= 70 ? "#10b981" : oee >= 40 ? "#f59e0b" : "#ef4444"}
                strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${oee * 3.14} 314`}
                style={{ transition: "stroke-dasharray 0.6s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">{oee}%</span>
              <span className="text-xs text-slate-400">OEE</span>
            </div>
          </div>
          <div className="mt-3 text-center text-sm text-slate-500">
            <p>{completed} tamamlandı / {executed} işlendi</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Son Üretim Emirleri</h2>
          <Link href="/dashboard/production/orders" className="text-xs hover:underline" style={{ color: "var(--color-primary)" }}>Tümünü Gör</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-left">
                <th className="py-3 px-5 font-medium text-slate-500">Emir No</th>
                <th className="py-3 px-4 font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden sm:table-cell">Hat</th>
                <th className="py-3 px-4 font-medium text-slate-500 text-right">Miktar</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-slate-400 text-sm">Henüz üretim emri yok</td></tr>
              ) : recent.map((o) => {
                const st = PRODUCTION_STATUSES.find((s) => s.id === o.status) ?? PRODUCTION_STATUSES[0];
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5">
                      <Link href={`/dashboard/production/orders/${o.id}`} className="font-mono font-medium hover:underline" style={{ color: "var(--color-primary)" }}>{o.orderNo}</Link>
                    </td>
                    <td className="py-3 px-4 text-foreground">{o.productName}</td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{o.line?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-right text-foreground">{o.quantity} {o.unit}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
