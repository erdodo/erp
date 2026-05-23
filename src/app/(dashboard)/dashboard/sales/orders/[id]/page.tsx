"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUSES, getOrderStatus, type SaleData, type OrderStatus } from "@/lib/sales-types";

const fmt = (n: number, cur = "TRY") =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " " + cur;

export default function OrderDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const [order, setOrder]     = useState<SaleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/modules/sales/orders/${id}`);
    if (r.ok) setOrder(await r.json() as SaleData);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(newStatus: OrderStatus) {
    setChanging(true);
    const r = await fetch(`/api/modules/sales/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    if (r.ok) await load();
    setChanging(false);
  }

  async function deleteOrder() {
    if (!confirm("Siparişi silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/sales/orders/${id}`, { method: "DELETE" });
    router.push("/dashboard/sales/orders");
  }

  if (loading) return <div className="flex items-center justify-center py-20"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>;
  if (!order)  return <div className="text-center py-20 text-slate-400"><p>Sipariş bulunamadı</p><Link href="/dashboard/sales/orders" className="text-sm mt-2 inline-block" style={{ color: "var(--color-primary)" }}>← Listeye dön</Link></div>;

  const st      = getOrderStatus(order.status);
  const items   = order.items ?? [];
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const discountAmt = subtotal * (order.discount / 100);
  const taxBase     = subtotal - discountAmt;
  const taxAmt      = taxBase * (order.tax / 100);

  // Build status timeline
  const mainFlow = ORDER_STATUSES.filter((s) => !["cancelled","returned"].includes(s.id));

  return (
    <div className="pb-8 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-bold font-mono text-foreground">{order.saleNo}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${st.bg}`}>
                <i className={`pi ${st.icon} text-xs`} />{st.label}
              </span>
              {order.invoiceUrl && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-green-100 text-green-700">
                  <i className="pi pi-receipt text-xs" />{order.invoiceUrl}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
              {order.customer && <span className="flex items-center gap-1.5"><i className="pi pi-user text-xs" /><Link href={`/dashboard/crm/customers/${order.customer.id}`} className="hover:underline">{order.customer.name}</Link></span>}
              <span className="flex items-center gap-1.5"><i className="pi pi-calendar text-xs" />{new Date(order.orderDate).toLocaleDateString("tr-TR", { day:"2-digit", month:"long", year:"numeric" })}</span>
              {order.deliveryDate && <span className="flex items-center gap-1.5"><i className="pi pi-truck text-xs" />Teslimat: {new Date(order.deliveryDate).toLocaleDateString("tr-TR")}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={deleteOrder} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition">
              <i className="pi pi-trash text-xs" />
            </button>
          </div>
        </div>

        {/* Status flow */}
        {!["cancelled","returned"].includes(order.status) && (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {mainFlow.map((s, i) => {
                const idx     = mainFlow.findIndex((ms) => ms.id === order.status);
                const done    = i <= idx;
                const current = s.id === order.status;
                return (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex flex-col items-center gap-1 px-2 ${current ? "scale-105" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition ${done ? "text-white" : "bg-slate-100 text-slate-400"}`}
                        style={done ? { background: s.color } : {}}>
                        {i < idx ? <i className="pi pi-check text-xs" /> : <i className={`pi ${s.icon} text-xs`} />}
                      </div>
                      <span className={`text-xs whitespace-nowrap ${current ? "font-semibold text-foreground" : "text-slate-400"}`}>{s.label}</span>
                    </div>
                    {i < mainFlow.length - 1 && (
                      <div className={`h-0.5 w-6 shrink-0 ${i < idx ? "bg-emerald-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next actions */}
        {st.next && st.next.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {st.next.map((ns) => {
              const nsCfg = getOrderStatus(ns);
              return (
                <button key={ns} onClick={() => changeStatus(ns)} disabled={changing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50"
                  style={{ borderColor: nsCfg.color, color: nsCfg.color }}>
                  <i className={`pi ${nsCfg.icon} text-xs`} />
                  {ns === "invoiced" ? "Faturala ve Stoktan Düş" : nsCfg.label}
                  {changing && <i className="pi pi-spin pi-spinner text-xs ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Sipariş Kalemleri ({items.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-left">
                <th className="py-3 px-5 font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 font-medium text-slate-500 text-right">Miktar</th>
                <th className="py-3 px-4 font-medium text-slate-500 text-right">Birim Fiyat</th>
                <th className="py-3 px-5 font-medium text-slate-500 text-right">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-5">
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.product?.sku && <p className="text-xs text-slate-400">{item.product.sku}</p>}
                    {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">{item.quantity} {item.unit}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{fmt(item.unitPrice, order.currency)}</td>
                  <td className="py-3 px-5 text-right font-semibold text-foreground">{fmt(item.totalPrice, order.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-t border-border">
          <div className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-slate-500"><span>Ara Toplam</span><span className="font-medium text-foreground">{fmt(subtotal, order.currency)}</span></div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>İskonto (-%{order.discount})</span><span>-{fmt(discountAmt, order.currency)}</span></div>}
            {order.tax > 0 && <div className="flex justify-between text-slate-500"><span>KDV (%{order.tax})</span><span>{fmt(taxAmt, order.currency)}</span></div>}
            <div className="flex justify-between font-bold text-base text-foreground border-t border-border pt-2">
              <span>Genel Toplam</span>
              <span style={{ color: "var(--color-primary)" }}>{fmt(order.totalAmount, order.currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes + Customer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {order.customer && (
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
            <h3 className="font-semibold text-foreground mb-3">Müşteri</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "var(--color-primary)" }}>
                {order.customer.name[0].toUpperCase()}
              </div>
              <div>
                <Link href={`/dashboard/crm/customers/${order.customer.id}`} className="font-medium text-foreground hover:underline">{order.customer.name}</Link>
                <p className="text-xs text-slate-400">{order.customer.type === "corporate" ? "Kurumsal" : "Bireysel"}</p>
              </div>
            </div>
          </div>
        )}
        {order.notes && (
          <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
            <h3 className="font-semibold text-foreground mb-3">Notlar</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
