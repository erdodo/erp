"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SalesProduct } from "@/lib/sales-types";

interface CtxMenu { x: number; y: number; product: SalesProduct }

export default function ProductsPage() {
  const router = useRouter();
  const [products,  setProducts]  = useState<SalesProduct[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState("");
  const [lowStock,  setLowStock]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [ctxMenu,   setCtxMenu]   = useState<CtxMenu | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ sku: "", name: "", category: "", unit: "adet", quantity: 0, minQuantity: 0, cost: 0, currency: "TRY" });
  const [saving,    setSaving]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; ls?: boolean }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const q  = opts?.s  ?? search;
    const ls = opts?.ls ?? lowStock;
    const params = new URLSearchParams({ page: String(p), search: q, lowStock: String(ls), limit: "50" });
    const r = await fetch(`/api/modules/sales/products?${params}`);
    const d = await r.json() as { products: SalesProduct[]; total: number; pages: number };
    setProducts(d.products); setTotal(d.total); setPages(d.pages);
    setLoading(false);
  }, [page, search, lowStock]);

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setCtxMenu(null); setShowForm(false); }
      if (e.key === "n" && !showForm) setShowForm(true);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showForm]);
  useEffect(() => {
    if (!ctxMenu) return;
    const h = () => setCtxMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [ctxMenu]);

  async function saveProduct() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/modules/sales/products", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setShowForm(false); setForm({ sku: "", name: "", category: "", unit: "adet", quantity: 0, minQuantity: 0, cost: 0, currency: "TRY" }); setSaving(false);
    await load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Bu ürünü silmek istiyor musunuz?")) return;
    setCtxMenu(null);
    await fetch(`/api/modules/sales/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="pb-8 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ürün ara… (/ ile odaklan)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={lowStock} onChange={(e) => { setLowStock(e.target.checked); setPage(1); void load({ pg: 1, ls: e.target.checked }); }} className="rounded" />
          Kritik stok
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
        </label>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition hover:opacity-90"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Ürün
          <kbd className="text-xs opacity-70 bg-white/20 px-1 rounded">N</kbd>
        </button>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">Yeni Ürün / Stok Kalemi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["name","sku","category"] as const).map((f) => (
              <div key={f} className={f === "name" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{f === "name" ? "Ürün Adı *" : f === "sku" ? "SKU / Barkod" : "Kategori"}</label>
                <input value={form[f]} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Birim</label>
              <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stok Adedi</label>
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Min. Stok</label>
              <input type="number" min="0" value={form.minQuantity} onChange={(e) => setForm((p) => ({ ...p, minQuantity: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Birim Maliyet</label>
              <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Para Birimi</label>
              <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                {["TRY","USD","EUR"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button onClick={saveProduct} disabled={saving || !form.name} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Ürün</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">SKU</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Kategori</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Stok</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden lg:table-cell">Maliyet</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                  <i className="pi pi-box text-4xl block mb-2 opacity-30" />
                  {search || lowStock ? "Filtreleye uyan ürün bulunamadı" : "Henüz ürün eklenmedi"}
                </td></tr>
              ) : products.map((p) => {
                const isLow = p.quantity <= p.minQuantity;
                return (
                  <tr key={p.id} onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, product: p }); }}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("button,a")) return; router.push(`/dashboard/sales/products/${p.id}`); }}
                    className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                    <td className="py-3 px-5">
                      <Link href={`/dashboard/sales/products/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:underline">{p.name}</Link>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs hidden sm:table-cell">{p.sku ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{p.category ?? "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${isLow ? "text-red-500" : "text-foreground"}`}>{p.quantity}</span>
                      <span className="text-slate-400 text-xs ml-1">{p.unit}</span>
                      {isLow && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Kritik</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 hidden lg:table-cell">
                      {p.cost != null ? `${p.cost.toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ${p.currency}` : "—"}
                    </td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, product: p }); }}
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
          <span>{total} ürün</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div className="fixed z-50 w-48 rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xl py-1 text-sm"
          style={{ top: ctxMenu.y, left: ctxMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold text-foreground truncate">{ctxMenu.product.name}</p>
            <p className="text-xs text-slate-400">{ctxMenu.product.sku ?? "SKU yok"}</p>
          </div>
          <button onClick={() => { router.push(`/dashboard/sales/products/${ctxMenu.product.id}`); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-eye text-slate-400" /> Detay Görüntüle
          </button>
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteProduct(ctxMenu.product.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> Sil
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
