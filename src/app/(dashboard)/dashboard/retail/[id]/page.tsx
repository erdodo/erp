"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "overview" | "transactions" | "employees" | "expenses" | "subscriptions" | "rentals";

interface RetailStore { id: string; name: string; address: string | null; phone: string | null; isActive: boolean; managerId: string | null; createdAt: string }
interface RetailTransaction { id: string; type: string; totalAmount: number; currency: string; paymentMethod: string; receiptNo: string | null; transactedAt: string }
interface StoreEmployee { id: string; name: string; position: string | null; email: string | null; phone: string | null; employeeNo: string }
interface StoreExpense { id: string; title: string; amount: number; currency: string; status: string; expenseDate: string }
interface StoreSubscription { id: string; name: string; plan: string | null; amount: number; currency: string; status: string; nextRenewal: string | null }
interface StoreRental { id: string; name: string; type: string; address: string | null; area: number | null; contracts: { amount: number; currency: string; tenantName: string }[] }

interface StoreDetail {
  store: RetailStore;
  transactions: RetailTransaction[];
  employees: StoreEmployee[];
  expenses: StoreExpense[];
  subscriptions: StoreSubscription[];
  rentals: StoreRental[];
  revenue: number;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",      label: "Genel Bakış",    icon: "pi-home" },
  { id: "transactions",  label: "İşlemler",       icon: "pi-receipt" },
  { id: "employees",     label: "Çalışanlar",     icon: "pi-users" },
  { id: "expenses",      label: "Giderler",       icon: "pi-wallet" },
  { id: "subscriptions", label: "Abonelikler",    icon: "pi-sync" },
  { id: "rentals",       label: "Kira",           icon: "pi-building" },
];

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  cancelled:"bg-red-100 text-red-600",
};

export default function RetailStoreDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const router       = useRouter();
  const [data, setData]       = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/modules/retail/${id}`);
    if (r.ok) setData(await r.json() as StoreDetail);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} />
    </div>
  );

  if (!data) return (
    <div className="text-center py-20 text-slate-400">
      <p>Mağaza bulunamadı</p>
      <Link href="/dashboard/retail" className="text-sm mt-2 inline-block" style={{ color: "var(--color-primary)" }}>← Listeye dön</Link>
    </div>
  );

  const { store, transactions, employees, expenses, subscriptions, rentals, revenue } = data;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRent = rentals.flatMap((r) => r.contracts).reduce((s, c) => s + c.amount, 0);
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-8">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shrink-0"
            style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-shop" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{store.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${store.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {store.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 mt-1.5 text-sm text-slate-500">
              {store.address && <span className="flex items-center gap-1.5"><i className="pi pi-map-marker text-xs" />{store.address}</span>}
              {store.phone && <span className="flex items-center gap-1.5"><i className="pi pi-phone text-xs" />{store.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/dashboard/retail" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border text-slate-500 hover:bg-slate-50 transition">
              <i className="pi pi-arrow-left text-xs" /> Geri
            </Link>
            <button onClick={() => router.push(`/dashboard/retail`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition"
              style={{ background: "var(--color-primary)" }}>
              <i className="pi pi-pencil text-xs" /> Düzenle
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { icon: "pi-arrow-up-right", label: "Toplam Gelir", value: `₺${revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, color: "#10b981" },
            { icon: "pi-receipt", label: "İşlem Sayısı", value: transactions.length, color: "#6366f1" },
            { icon: "pi-users", label: "Çalışan", value: employees.length, color: "#3b82f6" },
            { icon: "pi-sync", label: "Aktif Abonelik", value: activeSubs, color: "#f59e0b" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${kpi.color}20` }}>
                <i className={`pi ${kpi.icon} text-sm`} style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-slate-400">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-foreground"
              }`}
              style={tab === t.id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className={`pi ${t.icon} text-xs`} /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview */}
          {tab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {[
                ["Mağaza Adı", store.name],
                ["Adres", store.address],
                ["Telefon", store.phone],
                ["Durum", store.isActive ? "Aktif" : "Pasif"],
                ["Oluşturulma", new Date(store.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })],
                ["Toplam Gelir", `₺${revenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`],
                ["Toplam Gider", `₺${totalExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`],
                ["Aylık Kira", `₺${totalRent.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-border/50">
                  <span className="text-xs text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transactions */}
          {tab === "transactions" && (
            <div>
              {transactions.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Henüz işlem yok</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 pr-4 font-medium text-slate-500">Tarih</th>
                        <th className="pb-2 pr-4 font-medium text-slate-500">Tür</th>
                        <th className="pb-2 pr-4 font-medium text-slate-500">Ödeme</th>
                        <th className="pb-2 pr-4 font-medium text-slate-500 text-right">Tutar</th>
                        <th className="pb-2 font-medium text-slate-500">Fiş No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 pr-4 text-slate-500">{new Date(tx.transactedAt).toLocaleDateString("tr-TR")}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tx.type === "sale" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                              {tx.type === "sale" ? "Satış" : "İade"}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">{tx.paymentMethod}</td>
                          <td className="py-2.5 pr-4 text-right font-medium text-foreground">
                            {tx.totalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {tx.currency}
                          </td>
                          <td className="py-2.5 text-slate-400 font-mono text-xs">{tx.receiptNo ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Employees */}
          {tab === "employees" && (
            <div>
              <div className="flex justify-end mb-3">
                <Link href="/dashboard/hr/employees" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border text-slate-500 hover:bg-slate-50 transition">
                  <i className="pi pi-external-link text-xs" /> HR Modülüne Git
                </Link>
              </div>
              {employees.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Bu mağazaya atanmış çalışan yok.<br />HR modülünden çalışanları bu mağazaya atayabilirsiniz.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employees.map((emp) => (
                    <div key={emp.id} className="rounded-xl border border-border p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "var(--color-primary)" }}>
                        {emp.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{emp.name}</p>
                        {emp.position && <p className="text-xs text-slate-400">{emp.position}</p>}
                        <p className="text-xs text-slate-400 font-mono">{emp.employeeNo}</p>
                        {emp.phone && <p className="text-xs text-slate-500 mt-0.5"><i className="pi pi-phone text-xs mr-1" />{emp.phone}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expenses */}
          {tab === "expenses" && (
            <div>
              <div className="flex justify-end mb-3">
                <Link href="/dashboard/expenses" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border text-slate-500 hover:bg-slate-50 transition">
                  <i className="pi pi-external-link text-xs" /> Gider Modülüne Git
                </Link>
              </div>
              {expenses.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Bu mağazaya ait gider kaydı yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 pr-4 font-medium text-slate-500">Başlık</th>
                        <th className="pb-2 pr-4 font-medium text-slate-500">Tarih</th>
                        <th className="pb-2 pr-4 font-medium text-slate-500">Durum</th>
                        <th className="pb-2 font-medium text-slate-500 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 pr-4 text-foreground">{e.title}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{new Date(e.expenseDate).toLocaleDateString("tr-TR")}</td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] ?? "bg-slate-100 text-slate-500"}`}>{e.status}</span>
                          </td>
                          <td className="py-2.5 text-right font-medium text-foreground">
                            {e.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {e.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Subscriptions */}
          {tab === "subscriptions" && (
            <div>
              <div className="flex justify-end mb-3">
                <Link href="/dashboard/subscriptions" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border text-slate-500 hover:bg-slate-50 transition">
                  <i className="pi pi-external-link text-xs" /> Abonelik Modülüne Git
                </Link>
              </div>
              {subscriptions.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Bu mağazaya ait abonelik yok.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{sub.name}</p>
                          {sub.plan && <p className="text-xs text-slate-400">{sub.plan}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[sub.status] ?? "bg-slate-100 text-slate-500"}`}>{sub.status}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <span className="text-lg font-bold text-foreground">{sub.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} {sub.currency}</span>
                        {sub.nextRenewal && (
                          <span className="text-xs text-slate-400">Yenileme: {new Date(sub.nextRenewal).toLocaleDateString("tr-TR")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rentals */}
          {tab === "rentals" && (
            <div>
              <div className="flex justify-end mb-3">
                <Link href="/dashboard/rental" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border text-slate-500 hover:bg-slate-50 transition">
                  <i className="pi pi-external-link text-xs" /> Kira Modülüne Git
                </Link>
              </div>
              {rentals.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Bu mağazaya ait kira kaydı yok.<br />Kira modülünden mülk eklerken bu mağazayı seçebilirsiniz.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rentals.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--color-primary)20" }}>
                          <i className="pi pi-building text-sm" style={{ color: "var(--color-primary)" }} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{r.name}</p>
                          <p className="text-xs text-slate-400">{r.type} {r.area ? `• ${r.area} m²` : ""}</p>
                        </div>
                      </div>
                      {r.address && <p className="text-xs text-slate-500 mb-2"><i className="pi pi-map-marker text-xs mr-1" />{r.address}</p>}
                      {r.contracts.map((c, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-t border-border/50">
                          <span className="text-xs text-slate-400">{c.tenantName}</span>
                          <span className="text-sm font-bold text-foreground">{c.amount.toLocaleString("tr-TR")} {c.currency}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
