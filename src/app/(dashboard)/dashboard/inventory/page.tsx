"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { InventoryItem } from "@/lib/inventory-types";

const EMPTY = { name: "", sku: "", barcode: "", category: "", unit: "adet", quantity: 0, minQuantity: 0, location: "" };

export default function InventoryItemsPage() {
  const [items,    setItems]    = useState<InventoryItem[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState<"new" | InventoryItem | null>(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string }) => {
    setLoading(true);
    const p = opts?.pg ?? page;
    const q = opts?.s  ?? search;
    const params = new URLSearchParams({ page: String(p), search: q });
    const r = await fetch(`/api/modules/inventory/items?${params}`);
    const d = await r.json() as { items: InventoryItem[]; total: number; pages: number };
    setItems(d.items); setTotal(d.total); setPages(d.pages); setLoading(false);
  }, [page, search]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function openEdit(item: InventoryItem) {
    setForm({ name: item.name, sku: item.sku ?? "", barcode: item.barcode ?? "", category: item.category ?? "", unit: item.unit, quantity: item.quantity, minQuantity: item.minQuantity, location: item.location ?? "" });
    setModal(item);
  }

  async function save() {
    setSaving(true);
    if (typeof modal === "string") {
      await fetch("/api/modules/inventory/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (modal !== null) {
      await fetch(`/api/modules/inventory/items/${modal.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false); setModal(null); await load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/inventory/items/${id}`, { method: "DELETE" });
    await load();
  }

  const isLow = (item: InventoryItem) => item.quantity <= item.minQuantity;

  return (
    <div className="pb-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, SKU veya barkod ara… (/)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <button onClick={() => { setForm(EMPTY); setModal("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Öğe
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Ad</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">SKU / Barkod</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Konum</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Miktar</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                  <i className="pi pi-database text-4xl block mb-2 opacity-30" />
                  {search ? "Aramanızla eşleşen öğe yok" : "Henüz öğe eklenmedi"}
                </td></tr>
              ) : items.map((item) => (
                <tr key={item.id}
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(item); }}
                  className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${isLow(item) ? "bg-amber-50/30" : ""}`}>
                  <td className="py-3 px-5 font-medium text-foreground">
                    {isLow(item) && <i className="pi pi-exclamation-triangle text-amber-500 text-xs mr-1.5" />}
                    {item.name}
                  </td>
                  <td className="py-3 px-4 hidden sm:table-cell">
                    <div className="text-xs font-mono text-slate-500">{item.sku && <span className="mr-2 text-blue-600">{item.sku}</span>}{item.barcode && <span className="text-slate-400">{item.barcode}</span>}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{item.location ?? "—"}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${isLow(item) ? "text-amber-600" : "text-foreground"}`}>{item.quantity} {item.unit}</td>
                  <td className="py-3 px-4">
                    {isLow(item)
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Kritik</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Normal</span>}
                  </td>
                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => deleteItem(item.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition">
                      <i className="pi pi-trash text-xs" />
                    </button>
                  </td>
                </tr>
              ))}
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

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">{typeof modal === "string" ? "Yeni Öğe" : "Öğeyi Düzenle"}</h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Ad *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">SKU</label>
                <input value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Barkod</label>
                <input value={form.barcode} onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Birim</label>
                <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Miktar</label>
                <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Min. Miktar</label>
                <input type="number" min="0" value={form.minQuantity} onChange={(e) => setForm((p) => ({ ...p, minQuantity: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Konum</label>
                <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Raf, oda, alan" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : typeof modal === "string" ? "Oluştur" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
