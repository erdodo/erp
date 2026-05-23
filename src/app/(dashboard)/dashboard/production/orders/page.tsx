"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRODUCTION_STATUSES, getProductionStatus, type ProductionOrder, type ProductionStatus } from "@/lib/production-types";

interface CtxMenu { x: number; y: number; order: ProductionOrder }

export default function ProductionOrdersPage() {
  const router = useRouter();
  const [orders,   setOrders]   = useState<ProductionOrder[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ctxMenu,  setCtxMenu]  = useState<CtxMenu | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const q  = opts?.s  ?? search;
    const st = opts?.st ?? status;
    const params = new URLSearchParams({ page: String(p), search: q, status: st, limit: "25" });
    const r = await fetch(`/api/modules/production/orders?${params}`);
    const d = await r.json() as { orders: ProductionOrder[]; total: number; pages: number };
    setOrders(d.orders); setTotal(d.total); setPages(d.pages);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setCtxMenu(null);
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    if (!ctxMenu) return;
    let fn: ((e: MouseEvent) => void) | null = null;
    const t = setTimeout(() => { fn = () => setCtxMenu(null); window.addEventListener("mousedown", fn); }, 0);
    return () => { clearTimeout(t); if (fn) window.removeEventListener("mousedown", fn); };
  }, [ctxMenu]);

  async function changeStatus(id: string, newStatus: ProductionStatus) {
    setCtxMenu(null);
    await fetch(`/api/modules/production/orders/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }

  async function deleteOrder(id: string) {
    if (!confirm("Bu üretim emrini silmek istiyor musunuz?")) return;
    setCtxMenu(null);
    await fetch(`/api/modules/production/orders/${id}`, { method: "DELETE" });
    await load();
  }

  function exportCsv() {
    const headers = ["Emir No", "Ürün", "Miktar", "Birim", "Hat", "Durum", "Planlanan Başlangıç"];
    const rows = orders.map((o) => [o.orderNo, o.productName, o.quantity, o.unit, o.line?.name ?? "", o.status, o.plannedStart ?? ""]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" })); a.download = "uretim_emirleri.csv"; a.click();
  }

  const allSelected = orders.length > 0 && selected.size === orders.length;

  return (
    <div className="pb-8 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara… (/ ile odaklan)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); void load({ pg: 1, st: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer focus:outline-none">
          <option value="">Tüm Durumlar</option>
          {PRODUCTION_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button onClick={exportCsv} title="CSV İndir" className="px-3 py-2 rounded-lg border border-border text-slate-500 hover:bg-slate-50 text-sm transition">
          <i className="pi pi-download" />
        </button>
        <Link href="/dashboard/production/orders/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Emir
        </Link>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-indigo-50/50 text-sm" style={{ borderColor: "var(--color-primary)33" }}>
          <span className="font-medium text-foreground">{selected.size} seçili</span>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-500 hover:text-foreground">Temizle</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="w-10 py-3 px-4"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)))} className="rounded" /></th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Emir No</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Hat</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Miktar</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden lg:table-cell">Planlanan Başlangıç</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-cog text-4xl block mb-2 opacity-30" />
                  {search || status ? "Filtreye uyan emir bulunamadı" : "Henüz üretim emri yok"}
                </td></tr>
              ) : orders.map((o) => {
                const st = getProductionStatus(o.status);
                return (
                  <tr key={o.id}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, order: o }); }}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("input,a,button")) return; router.push(`/dashboard/production/orders/${o.id}`); }}
                    className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${selected.has(o.id) ? "bg-indigo-50/40" : ""}`}>
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(o.id)} onChange={() => setSelected((prev) => { const n = new Set(prev); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} className="rounded" />
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/production/orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="font-mono font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>{o.orderNo}</Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{o.productName}</td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{o.line?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-right text-foreground">{o.quantity} {o.unit}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell">
                      {o.plannedStart ? new Date(o.plannedStart).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, order: o }); }}
                        onMouseDown={(e) => e.stopPropagation()}
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
      {ctxMenu && (
        <div className="fixed z-50 w-56 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl py-1 text-sm"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground font-mono">{ctxMenu.order.orderNo}</p>
            <p className="text-xs text-slate-400 truncate">{ctxMenu.order.productName}</p>
          </div>
          <button onClick={() => { router.push(`/dashboard/production/orders/${ctxMenu.order.id}`); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-eye text-slate-400 text-xs" /> Detay Görüntüle
          </button>
          {(() => {
            const st = getProductionStatus(ctxMenu.order.status);
            return st.next.length > 0 ? (
              <div className="border-t border-border pt-1">
                <p className="px-3 py-1 text-xs text-slate-400 font-medium">Durum Değiştir</p>
                {st.next.map((ns) => {
                  const nsCfg = getProductionStatus(ns);
                  return (
                    <button key={ns} onClick={() => changeStatus(ctxMenu.order.id, ns)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-xs transition text-foreground">
                      <i className={`pi ${nsCfg.icon} text-xs`} style={{ color: nsCfg.color }} />{nsCfg.label}
                    </button>
                  );
                })}
              </div>
            ) : null;
          })()}
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteOrder(ctxMenu.order.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
