import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ORDER_STATUSES, getOrderStatus } from "@/lib/sales-types";

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId!;

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalOrders, monthOrders, pendingApproval, invoicedOrders,
    monthRevenue, prevRevenue, byStatus, recentOrders, lowStock,
  ] = await Promise.all([
    prisma.sale.count({ where: { tenantId, deletedAt: null } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, createdAt: { gte: start } } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, status: "pending_approval" } }),
    prisma.sale.count({ where: { tenantId, deletedAt: null, status: "invoiced" } }),
    prisma.sale.aggregate({ where: { tenantId, deletedAt: null, status: { in: ["invoiced","delivered"] }, createdAt: { gte: start } }, _sum: { totalAmount: true } }),
    prisma.sale.aggregate({ where: { tenantId, deletedAt: null, status: { in: ["invoiced","delivered"] }, createdAt: { gte: prev, lt: start } }, _sum: { totalAmount: true } }),
    prisma.sale.groupBy({ by: ["status"], where: { tenantId, deletedAt: null }, _count: { _all: true } }),
    prisma.sale.findMany({
      where: { tenantId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, saleNo: true, status: true, totalAmount: true, currency: true, orderDate: true, customer: { select: { id: true, name: true } } },
    }),
    prisma.stockItem.findMany({
      where: { tenantId, deletedAt: null, isActive: true }, orderBy: { quantity: "asc" }, take: 5,
      select: { id: true, name: true, sku: true, quantity: true, minQuantity: true, unit: true },
    }),
  ]);

  const mrv      = monthRevenue._sum.totalAmount ?? 0;
  const prv      = prevRevenue._sum.totalAmount  ?? 0;
  const revGrowth = prv > 0 ? Math.round(((mrv - prv) / prv) * 100) : 0;
  const byStatusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count._all]));
  const lowStockItems = lowStock.filter((s) => s.quantity <= s.minQuantity);

  return (
    <div className="space-y-6 pb-8">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="pi-file-edit"    label="Toplam Sipariş"  value={totalOrders}        color="#6366f1" />
        <StatCard icon="pi-plus-circle"  label="Bu Ay Sipariş"  value={monthOrders}        color="#3b82f6" />
        <StatCard icon="pi-clock"        label="Onay Bekleyen"   value={pendingApproval}    color="#f59e0b" badge={pendingApproval > 0} />
        <StatCard icon="pi-receipt"      label="Bu Ay Gelir"     value={`₺${mrv.toLocaleString("tr-TR")}`} color="#10b981" sub={revGrowth !== 0 ? `${revGrowth > 0 ? "+" : ""}${revGrowth}% geçen ay` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status breakdown */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Sipariş Durum Dağılımı</h2>
            <Link href="/dashboard/sales/orders" className="text-sm hover:underline" style={{ color: "var(--color-primary)" }}>
              Tümünü gör →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ORDER_STATUSES.map((s) => {
              const count = byStatusMap[s.id] ?? 0;
              if (count === 0) return null;
              return (
                <Link key={s.id} href={`/dashboard/sales/orders?status=${s.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-slate-300 transition group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${s.color}20` }}>
                    <i className={`pi ${s.icon} text-sm`} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground group-hover:underline">{count}</p>
                    <p className="text-xs text-slate-400">{s.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Low stock alert */}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <i className="pi pi-exclamation-triangle text-amber-500 text-sm" />Kritik Stok
            </h2>
            <Link href="/dashboard/sales/products?lowStock=true" className="text-xs hover:underline" style={{ color: "var(--color-primary)" }}>Tümü</Link>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Kritik stok yok ✓</p>
          ) : lowStockItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                {item.sku && <p className="text-xs text-slate-400">{item.sku}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-500">{item.quantity} {item.unit}</p>
                <p className="text-xs text-slate-400">min: {item.minQuantity}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Son Siparişler</h2>
          <Link href="/dashboard/sales/orders" className="text-sm hover:underline" style={{ color: "var(--color-primary)" }}>
            Tümünü gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-medium text-slate-500">Sipariş No</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 hidden sm:table-cell">Müşteri</th>
                <th className="pb-2 pr-4 font-medium text-slate-500">Durum</th>
                <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Tutar</th>
                <th className="pb-2 font-medium text-slate-500 hidden md:table-cell">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => {
                const st = getOrderStatus(o.status);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-2.5 pr-4">
                      <Link href={`/dashboard/sales/orders/${o.id}`} className="font-mono font-medium text-foreground hover:underline"
                        style={{ color: "var(--color-primary)" }}>{o.saleNo}</Link>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 hidden sm:table-cell">{o.customer?.name ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-foreground">
                      {o.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {o.currency}
                    </td>
                    <td className="py-2.5 text-slate-400 text-xs hidden md:table-cell">
                      {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice count */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-emerald-950/20 dark:to-green-950/20">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
          <i className="pi pi-receipt text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{invoicedOrders} fatura kesildi</p>
          <p className="text-sm text-slate-500">Bu döneme ait faturalandırılmış siparişler</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, badge, sub }: { icon: string; label: string; value: string | number; color: string; badge?: boolean; sub?: string }) {
  return (
    <div className="relative rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
      {badge && <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <i className={`pi ${icon} text-lg`} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
        {sub && <p className="text-xs text-emerald-500 font-medium">{sub}</p>}
      </div>
    </div>
  );
}
