"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PRODUCTION_STATUSES, getProductionStatus, type ProductionOrder, type ProductionStatus } from "@/lib/production-types";

const fmt = (d: string | null) => d ? new Date(d).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function ProductionOrderDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const [order,    setOrder]    = useState<ProductionOrder | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [changing, setChanging] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/modules/production/orders/${id}`);
    if (r.ok) setOrder(await r.json() as ProductionOrder);
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(newStatus: ProductionStatus) {
    setChanging(true);
    await fetch(`/api/modules/production/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    await load(); setChanging(false);
  }

  async function deleteOrder() {
    if (!confirm("Bu üretim emrini silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/production/orders/${id}`, { method: "DELETE" });
    router.push("/dashboard/production/orders");
  }

  if (loading) return <div className="flex items-center justify-center py-20"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>;
  if (!order)  return <div className="text-center py-20 text-slate-400">Emir bulunamadı<br /><Link href="/dashboard/production/orders" style={{ color: "var(--color-primary)" }}>← Geri</Link></div>;

  const st       = getProductionStatus(order.status);
  const mainFlow = PRODUCTION_STATUSES.filter((s) => !["cancelled"].includes(s.id));
  const curIdx   = mainFlow.findIndex((s) => s.id === order.status);

  return (
    <div className="pb-8 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-xl font-bold font-mono text-foreground">{order.orderNo}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${st.bg}`}>
                <i className={`pi ${st.icon} text-xs`} />{st.label}
              </span>
            </div>
            <p className="text-lg text-foreground font-medium">{order.productName}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
              <span><i className="pi pi-box text-xs mr-1" />{order.quantity} {order.unit}</span>
              {order.line && <span><i className="pi pi-sliders-h text-xs mr-1" />{order.line.name}</span>}
              {order.method && <span><i className="pi pi-list text-xs mr-1" />{order.method.name} v{order.method.version}</span>}
            </div>
          </div>
          <button onClick={deleteOrder} className="px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition">
            <i className="pi pi-trash text-xs" />
          </button>
        </div>

        {/* Timeline */}
        {order.status !== "cancelled" && (
          <div className="mt-5 pt-4 border-t border-border overflow-x-auto pb-1">
            <div className="flex items-center min-w-max">
              {mainFlow.map((s, i) => {
                const done    = i <= curIdx;
                const current = s.id === order.status;
                return (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex flex-col items-center gap-1 px-2 ${current ? "scale-105" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition`}
                        style={done ? { background: s.color, color: "#fff" } : { background: "#f1f5f9", color: "#94a3b8" }}>
                        {i < curIdx ? <i className="pi pi-check text-xs" /> : <i className={`pi ${s.icon} text-xs`} />}
                      </div>
                      <span className={`text-xs whitespace-nowrap ${current ? "font-semibold text-foreground" : "text-slate-400"}`}>{s.label}</span>
                    </div>
                    {i < mainFlow.length - 1 && (
                      <div className={`h-0.5 w-8 shrink-0 ${i < curIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next actions */}
        {st.next.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {st.next.map((ns) => {
              const nsCfg = getProductionStatus(ns);
              return (
                <button key={ns} onClick={() => changeStatus(ns)} disabled={changing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition disabled:opacity-50"
                  style={{ borderColor: nsCfg.color, color: nsCfg.color }}>
                  <i className={`pi ${nsCfg.icon} text-xs`} />{nsCfg.label}
                  {changing && <i className="pi pi-spin pi-spinner text-xs ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Planlanan Başlangıç", value: fmt(order.plannedStart) },
          { label: "Planlanan Bitiş",     value: fmt(order.plannedEnd) },
          { label: "Fiili Başlangıç",     value: fmt(order.actualStart) },
          { label: "Fiili Bitiş",         value: fmt(order.actualEnd) },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4">
            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
            <p className="font-medium text-foreground text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-2">Notlar</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
