"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MOVEMENT_TYPES, getMovementType, type StockItem, type Warehouse, type MovementType } from "@/lib/inventory-types";

interface MovementForm { type: MovementType; quantity: number; reason: string; reference: string }
interface CtxMenu { x: number; y: number; item: StockItem }

const EMPTY_ITEM = { name: "", sku: "", category: "", unit: "adet", quantity: 0, minQuantity: 0, cost: 0, warehouseId: "" };
const EMPTY_MV: MovementForm = { type: "in", quantity: 1, reason: "", reference: "" };

export default function StockPage() {
  const [items,      setItems]     = useState<StockItem[]>([]);
  const [warehouses, setWarehouses]= useState<Warehouse[]>([]);
  const [total,      setTotal]     = useState(0);
  const [pages,      setPages]     = useState(1);
  const [page,       setPage]      = useState(1);
  const [search,     setSearch]    = useState("");
  const [whFilter,   setWhFilter]  = useState("");
  const [lowOnly,    setLowOnly]   = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [ctxMenu,    setCtxMenu]   = useState<CtxMenu | null>(null);
  const [mvModal,    setMvModal]   = useState<StockItem | null>(null);
  const [addModal,   setAddModal]  = useState(false);
  const [form,       setForm]      = useState(EMPTY_ITEM);
  const [mvForm,     setMvForm]    = useState<MovementForm>(EMPTY_MV);
  const [saving,     setSaving]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; wh?: string; low?: boolean }) => {
    setLoading(true);
    const p   = opts?.pg  ?? page;
    const q   = opts?.s   ?? search;
    const wh  = opts?.wh  !== undefined ? opts.wh  : whFilter;
    const low = opts?.low !== undefined ? opts.low : lowOnly;
    const params = new URLSearchParams({ page: String(p), search: q, warehouseId: wh, lowStock: low ? "1" : "0", limit: "25" });
    const [ir, wr] = await Promise.all([
      fetch(`/api/modules/stock/items?${params}`),
      fetch("/api/modules/stock/warehouses"),
    ]);
    const id = await ir.json() as { items: StockItem[]; total: number; pages: number };
    const wd = await wr.json() as { warehouses: Warehouse[] };
    setItems(id.items); setTotal(id.total); setPages(id.pages);
    setWarehouses(wd.warehouses);
    setLoading(false);
  }, [page, search, whFilter, lowOnly]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea,select")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setCtxMenu(null); setMvModal(null); setAddModal(false); }
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

  async function saveItem() {
    setSaving(true);
    await fetch("/api/modules/stock/items", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, warehouseId: form.warehouseId || undefined }),
    });
    setSaving(false); setAddModal(false); setForm(EMPTY_ITEM); await load();
  }

  async function saveMovement() {
    if (!mvModal) return;
    setSaving(true);
    await fetch(`/api/modules/stock/items/${mvModal.id}/movement`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mvForm),
    });
    setSaving(false); setMvModal(null); setMvForm(EMPTY_MV); await load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Bu stok kalemini silmek istiyor musunuz?")) return;
    setCtxMenu(null);
    await fetch(`/api/modules/stock/items/${id}`, { method: "DELETE" });
    await load();
  }

  const lowCount = items.filter((i) => i.quantity <= i.minQuantity).length;

  return (
    <div className="pb-8 space-y-4">
      {/* Low-stock alert bar */}
      {lowCount > 0 && !lowOnly && (
        <button onClick={() => { setLowOnly(true); void load({ low: true }); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm hover:bg-amber-100 transition text-left">
          <i className="pi pi-exclamation-triangle text-amber-500" />
          <span><strong>{lowCount}</strong> kalem minimum stok seviyesinin altında — görmek için tıkla</span>
          <i className="pi pi-chevron-right ml-auto text-amber-400 text-xs" />
        </button>
      )}
      {lowOnly && (
        <button onClick={() => { setLowOnly(false); void load({ low: false }); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-border text-sm text-slate-600 hover:bg-slate-100 transition">
          <i className="pi pi-times text-xs" /> Minimum stok filtresi kaldır
        </button>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün/SKU ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={whFilter} onChange={(e) => { setWhFilter(e.target.value); setPage(1); void load({ pg: 1, wh: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
          <option value="">Tüm Depolar</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Stok Kalemi
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">SKU</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Depo</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Kategori</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Miktar</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden sm:table-cell">Min</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-box text-4xl block mb-2 opacity-30" />
                  {search || whFilter || lowOnly ? "Filtreye uyan kayıt yok" : "Henüz stok kalemi eklenmedi"}
                </td></tr>
              ) : items.map((item) => {
                const isLow = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.id}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item }); }}
                    className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${isLow ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
                    <td className="py-3 px-5 font-medium text-foreground">
                      {isLow && <i className="pi pi-exclamation-triangle text-amber-500 text-xs mr-1.5" />}
                      {item.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs hidden sm:table-cell">{item.sku ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{item.warehouse?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{item.category ?? "—"}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${isLow ? "text-amber-600" : "text-foreground"}`}>
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-xs hidden sm:table-cell">{item.minQuantity}</td>
                    <td className="py-3 px-4">
                      {isLow
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Kritik</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Normal</span>}
                    </td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, item }); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
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
        <div className="fixed z-50 w-52 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl py-1 text-sm"
          style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground truncate">{ctxMenu.item.name}</p>
            <p className="text-xs text-slate-400">{ctxMenu.item.quantity} {ctxMenu.item.unit}</p>
          </div>
          <button onClick={() => { setMvModal(ctxMenu.item); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-arrows-v text-slate-400 text-xs" /> Stok Hareketi Ekle
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteItem(ctxMenu.item.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {addModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setAddModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Yeni Stok Kalemi</h2>
              <button onClick={() => setAddModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Ürün Adı *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">SKU</label>
                <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Birim</label>
                <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç Miktarı</label>
                <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min. Miktar</label>
                <input type="number" min="0" value={form.minQuantity} onChange={(e) => setForm((p) => ({ ...p, minQuantity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Maliyet (TRY)</label>
                <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Depo</label>
                <select value={form.warehouseId} onChange={(e) => setForm((p) => ({ ...p, warehouseId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  <option value="">— Seçin —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAddModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveItem} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {mvModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setMvModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground">Stok Hareketi</h2>
                <p className="text-xs text-slate-400">{mvModal.name} — mevcut: {mvModal.quantity} {mvModal.unit}</p>
              </div>
              <button onClick={() => setMvModal(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hareket Tipi</label>
                <div className="grid grid-cols-3 gap-2">
                  {MOVEMENT_TYPES.filter((m) => ["in","out","adjustment","transfer"].includes(m.id)).map((mt) => (
                    <button key={mt.id} type="button" onClick={() => setMvForm((p) => ({ ...p, type: mt.id }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${mvForm.type === mt.id ? "border-transparent text-white" : "border-border text-slate-500 hover:bg-slate-50"}`}
                      style={mvForm.type === mt.id ? { background: mt.color } : {}}>
                      <i className={`pi ${mt.icon} text-xs block mb-0.5`} />{mt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Miktar</label>
                <input type="number" min="0.01" step="0.01" value={mvForm.quantity} onChange={(e) => setMvForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Neden</label>
                <input value={mvForm.reason} onChange={(e) => setMvForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Opsiyonel"
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Referans</label>
                <input value={mvForm.reference} onChange={(e) => setMvForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Sipariş no, fatura no vb."
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setMvModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={saveMovement} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: getMovementType(mvForm.type).color }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : `${getMovementType(mvForm.type).label} Kaydet`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
