import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function CurrentAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId!;

  // Aggregate per customer
  const rows = await prisma.sale.groupBy({
    by:    ["customerId", "currency"],
    where: { tenantId, deletedAt: null, customerId: { not: null } },
    _sum:  { totalAmount: true },
    _count: { _all: true },
  });

  const openRows = await prisma.sale.groupBy({
    by:    ["customerId"],
    where: { tenantId, deletedAt: null, customerId: { not: null }, status: { notIn: ["invoiced", "cancelled", "returned"] } },
    _count: { _all: true },
  });
  const openMap = Object.fromEntries(openRows.map((r) => [r.customerId!, r._count._all]));

  const invoicedRows = await prisma.sale.groupBy({
    by:    ["customerId"],
    where: { tenantId, deletedAt: null, customerId: { not: null }, status: "invoiced" },
    _sum:  { totalAmount: true },
    _count: { _all: true },
  });
  const invoicedMap = Object.fromEntries(invoicedRows.map((r) => [r.customerId!, { sum: r._sum.totalAmount ?? 0, count: r._count._all }]));

  const customerIds = [...new Set(rows.map((r) => r.customerId!))];
  const customers   = customerIds.length
    ? await prisma.customer.findMany({ where: { id: { in: customerIds }, tenantId }, select: { id: true, name: true, type: true, email: true, city: true } })
    : [];
  const cMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  const cari = rows.map((r) => ({
    customerId:    r.customerId!,
    customer:      cMap[r.customerId!] ?? null,
    currency:      r.currency,
    totalOrders:   r._count._all,
    totalAmount:   r._sum.totalAmount ?? 0,
    invoicedAmount: invoicedMap[r.customerId!]?.sum ?? 0,
    invoicedCount:  invoicedMap[r.customerId!]?.count ?? 0,
    openOrders:    openMap[r.customerId!] ?? 0,
  })).sort((a, b) => b.totalAmount - a.totalAmount);

  const grandTotal     = cari.reduce((s, r) => s + r.totalAmount, 0);
  const grandInvoiced  = cari.reduce((s, r) => s + r.invoicedAmount, 0);
  const totalOpenOrds  = cari.reduce((s, r) => s + r.openOrders, 0);

  return (
    <div className="pb-8 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#6366f120" }}>
            <i className="pi pi-users text-lg" style={{ color: "#6366f1" }} />
          </div>
          <div><p className="text-xl font-bold text-foreground">{cari.length}</p><p className="text-xs text-slate-400">Aktif Cari Müşteri</p></div>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#10b98120" }}>
            <i className="pi pi-receipt text-lg" style={{ color: "#10b981" }} />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{grandInvoiced.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</p>
            <p className="text-xs text-slate-400">Toplam Faturalandı</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#f59e0b20" }}>
            <i className="pi pi-clock text-lg" style={{ color: "#f59e0b" }} />
          </div>
          <div><p className="text-xl font-bold text-foreground">{totalOpenOrds}</p><p className="text-xs text-slate-400">Açık Sipariş</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Cari Hesap Özeti</h2>
          <p className="text-sm text-slate-400">Toplam hacim: <span className="font-semibold text-foreground">{grandTotal.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺</span></p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-left">
                <th className="py-3 px-5 font-medium text-slate-500">Müşteri</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden sm:table-cell">Şehir</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Toplam Sipariş</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Faturalandı</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden md:table-cell">Açık</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden lg:table-cell">Bakiye Durum</th>
                <th className="py-3 px-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {cari.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <i className="pi pi-wallet text-4xl block mb-2 opacity-30" />Henüz cari hesap yok
                </td></tr>
              ) : cari.map((row) => {
                const pct = row.totalAmount > 0 ? Math.round((row.invoicedAmount / row.totalAmount) * 100) : 0;
                return (
                  <tr key={row.customerId} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: "var(--color-primary)" }}>
                          {(row.customer?.name ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          {row.customer ? (
                            <Link href={`/dashboard/crm/customers/${row.customerId}`} className="font-medium text-foreground hover:underline">{row.customer.name}</Link>
                          ) : <span className="text-slate-400 text-xs">Silinmiş müşteri</span>}
                          <p className="text-xs text-slate-400">{row.customer?.type === "corporate" ? "Kurumsal" : "Bireysel"} · {row.totalOrders} sipariş</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 hidden sm:table-cell">{row.customer?.city ?? "—"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {row.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {row.currency}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      {row.invoicedAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {row.currency}
                    </td>
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      {row.openOrders > 0 ? (
                        <Link href={`/dashboard/sales/orders?customer=${row.customerId}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition">
                          {row.openOrders} açık
                        </Link>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Link href={`/dashboard/sales/orders?customer=${row.customerId}`}
                        className="text-xs px-2 py-1 rounded-lg border border-border text-slate-500 hover:bg-slate-50 transition">
                        Siparişler
                      </Link>
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
