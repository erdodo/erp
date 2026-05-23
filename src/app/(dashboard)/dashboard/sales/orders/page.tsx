"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ORDER_STATUSES, getOrderStatus, type SaleData, type OrderStatus } from "@/lib/sales-types";

interface CtxMenu { x: number; y: number; order: SaleData }

const fmt = (n: number, cur = "TRY") =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + cur;

export default function SalesOrdersPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [orders,    setOrders]   = useState<SaleData[]>([]);
  const [total,     setTotal]    = useState(0);
  const [pages,     setPages]    = useState(1);
  const [page,      setPage]     = useState(1);
  const [search,    setSearch]   = useState("");
  const [status,    setStatus]   = useState(searchParams.get("status") ?? "");
  const [loading,   setLoading]  = useState(false);
  const [selected,  setSelected] = useState<Set<string>>(new Set());
  const [ctxMenu,   setCtxMenu]  = useState<CtxMenu | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const q  = opts?.s  ?? search;
    const st = opts?.st ?? status;
    const params = new URLSearchParams({ page: String(p), search: q, status: st, limit: "25" });
    const r = await fetch(`/api/modules/sales/orders?${params}`);
    const data = await r.json() as { orders: SaleData[]; total: number; pages: number };
    setOrders(data.orders); setTotal(data.total); setPages(data.pages);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "/" ) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setCtxMenu(null);
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    if (!ctxMenu) return;
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [ctxMenu]);

  function onCtx(e: React.MouseEvent, order: SaleData) {
    e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, order });
  }

  async function changeStatus(id: string, newStatus: OrderStatus) {
    setCtxMenu(null);
    await fetch(`/api/modules/sales/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }

  async function deleteOrder(id: string) {
    if (!confirm("Siparişi silmek istiyor musunuz?")) return;
    setCtxMenu(null);
    await fetch(`/api/modules/sales/orders/${id}`, { method: "DELETE" });
    await load();
  }

  function toggleSelect(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function exportCsv() {
    const rows = orders.map((o) => [o.saleNo, o.customer?.name ?? "", o.status, o.totalAmount, o.currency, new Date(o.orderDate).toLocaleDateString("tr-TR")]);
    const csv  = [["Sipariş No","Müşteri","Durum","Tutar","Para Birimi","Tarih"], ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8" })); a.download = "siparisler.csv"; a.click();
  }

  const allSel = orders.length > 0 && selected.size === orders.length;

  const ctxOrder  = ctxMenu?.order;
  const ctxStatus = ctxOrder ? getOrderStatus(ctxOrder.status) : null;
  const nextSteps = ctxStatus?.next ?? [];

  return (
    <div className="pb-8 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Sipariş no, notlar… (/ ile odaklan)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); void load({ pg: 1, st: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
          <option value="">Tüm Durumlar</option>
          {ORDER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={exportCsv} className="px-3 py-2 rounded-lg border border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition" title="CSV">
          <i className="pi pi-download" />
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 text-sm" style={{ borderColor: "var(--color-primary)33" }}>
          <span className="font-medium text-foreground">{selected.size} seçili</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-foreground ml-auto">Temizle</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="w-10 py-3 px-4"><input type="checkbox" checked={allSel} onChange={() => setSelected(allSel ? new Set() : new Set(orders.map((o) => o.id)))} className="rounded" /></th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Sipariş No</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Müşteri</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Durum</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Tutar</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Tarih</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden xl:table-cell">Teslimat</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-file-edit text-4xl block mb-2 opacity-30" />
                  {search || status ? "Filtreleye uyan sipariş bulunamadı" : "Henüz sipariş yok"}
                </td></tr>
              ) : orders.map((o) => {
                const st = getOrderStatus(o.status);
                return (
                  <tr key={o.id} onContextMenu={(e) => onCtx(e, o)}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("input,a,button")) return; router.push(`/dashboard/sales/orders/${o.id}`); }}
                    className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${selected.has(o.id) ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleSelect(o.id)} className="rounded" /></td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/sales/orders/${o.id}`} onClick={(e) => e.stopPropagation()}
                        className="font-mono font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>{o.saleNo}</Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 hidden sm:table-cell">{o.customer?.name ?? <span className="text-slate-300">—</span>}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">{fmt(o.totalAmount, o.currency)}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell">{new Date(o.orderDate).toLocaleDateString("tr-TR")}</td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden xl:table-cell">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString("tr-TR") : "—"}</td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); onCtx(e as unknown as React.MouseEvent, o); }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-400">
                        <i className="pi pi-ellipsis-v text-xs" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} kayıt</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && ctxOrder && ctxStatus && (
        <div className="fixed z-50 w-56 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl py-1 text-sm"
          style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground font-mono">{ctxOrder.saleNo}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${ctxStatus.bg}`}>
              <i className={`pi ${ctxStatus.icon} text-xs`} />{ctxStatus.label}
            </span>
          </div>
          <button onClick={() => { router.push(`/dashboard/sales/orders/${ctxOrder.id}`); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-eye text-slate-400" /> Detay Görüntüle
          </button>
          {nextSteps.length > 0 && (
            <>
              <div className="border-t border-border mt-1 pt-1">
                <p className="px-3 py-1 text-xs text-slate-400 font-medium">Durumu Değiştir</p>
                {nextSteps.map((ns) => {
                  const nsCfg = getOrderStatus(ns);
                  return (
                    <button key={ns} onClick={() => changeStatus(ctxOrder.id, ns)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-xs transition">
                      <i className={`pi ${nsCfg.icon} text-xs`} style={{ color: nsCfg.color }} />{nsCfg.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteOrder(ctxOrder.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
