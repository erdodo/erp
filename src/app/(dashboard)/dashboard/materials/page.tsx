"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Material } from "@/lib/inventory-types";

const EMPTY = { code: "", name: "", description: "", category: "", unit: "kg", specifications: "", suppliers: "", minOrderQty: 0, leadTimeDays: 0, cost: 0, currency: "TRY" };

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories,setCategories]= useState<string[]>([]);
  const [total,    setTotal]      = useState(0);
  const [pages,    setPages]      = useState(1);
  const [page,     setPage]       = useState(1);
  const [search,   setSearch]     = useState("");
  const [category, setCategory]   = useState("");
  const [loading,  setLoading]    = useState(false);
  const [drawer,   setDrawer]     = useState<"new" | Material | null>(null);
  const [form,     setForm]       = useState(EMPTY);
  const [saving,   setSaving]     = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; cat?: string }) => {
    setLoading(true);
    const p   = opts?.pg  ?? page;
    const q   = opts?.s   ?? search;
    const cat = opts?.cat ?? category;
    const params = new URLSearchParams({ page: String(p), search: q, category: cat });
    const r = await fetch(`/api/modules/materials?${params}`);
    const d = await r.json() as { materials: Material[]; total: number; pages: number; categories: string[] };
    setMaterials(d.materials); setTotal(d.total); setPages(d.pages);
    if (d.categories.length > 0) setCategories(d.categories.filter(Boolean) as string[]);
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setDrawer(null);
    }
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  function openEdit(m: Material) {
    setForm({ code: m.code, name: m.name, description: m.description ?? "", category: m.category ?? "", unit: m.unit, specifications: m.specifications ?? "", suppliers: m.suppliers ?? "", minOrderQty: m.minOrderQty ?? 0, leadTimeDays: m.leadTimeDays ?? 0, cost: m.cost ?? 0, currency: m.currency });
    setDrawer(m);
  }

  async function save() {
    setSaving(true);
    if (typeof drawer === "string") {
      await fetch("/api/modules/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (drawer !== null) {
      await fetch(`/api/modules/materials/${drawer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/materials/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-th-large text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">Malzeme Kütüphanesi</h1>
            <p className="text-xs text-slate-400">Teknik özellikler, tedarikçiler, min sipariş</p>
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Malzeme
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Malzeme adı veya kod ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        {categories.length > 0 && (
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); void load({ pg: 1, cat: e.target.value }); }}
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
            <option value="">Tüm Kategoriler</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Kod</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Malzeme</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Kategori</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Birim</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden lg:table-cell">Min Sipariş</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden lg:table-cell">Temin (gün)</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden md:table-cell">Maliyet</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-th-large text-4xl block mb-2 opacity-30" />
                  {search || category ? "Filtreye uyan malzeme yok" : "Henüz malzeme eklenmedi"}
                </td></tr>
              ) : materials.map((m) => (
                <tr key={m.id}
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(m); }}
                  className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                  <td className="py-3 px-5 font-mono text-xs font-semibold text-foreground">{m.code}</td>
                  <td className="py-3 px-4 font-medium text-foreground">
                    {m.name}
                    {m.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{m.description}</p>}
                  </td>
                  <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{m.category ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{m.unit}</td>
                  <td className="py-3 px-4 text-right text-slate-500 hidden lg:table-cell">{m.minOrderQty ?? "—"}</td>
                  <td className="py-3 px-4 text-right text-slate-500 hidden lg:table-cell">{m.leadTimeDays ?? "—"}</td>
                  <td className="py-3 px-4 text-right text-foreground hidden md:table-cell">
                    {m.cost ? `${m.cost.toLocaleString("tr-TR")} ${m.currency}` : "—"}
                  </td>
                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i className="pi pi-pencil text-xs" /></button>
                      <button onClick={() => deleteMaterial(m.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                    </div>
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

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Malzeme" : "Malzemeyi Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kod *</label>
                  <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="MAL-001"
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ad *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Kategori</label>
                  <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} list="cats"
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                  <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Birim</label>
                  <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Min Sipariş Miktarı</label>
                  <input type="number" min="0" value={form.minOrderQty} onChange={(e) => setForm((p) => ({ ...p, minOrderQty: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Temin Süresi (gün)</label>
                  <input type="number" min="0" value={form.leadTimeDays} onChange={(e) => setForm((p) => ({ ...p, leadTimeDays: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Birim Maliyet</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Para Birimi</label>
                  <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {["TRY","USD","EUR","GBP"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Teknik Özellikler</label>
                <textarea value={form.specifications} onChange={(e) => setForm((p) => ({ ...p, specifications: e.target.value }))} rows={3}
                  placeholder="Boyut, ağırlık, renk, standartlar…"
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tedarikçiler</label>
                <textarea value={form.suppliers} onChange={(e) => setForm((p) => ({ ...p, suppliers: e.target.value }))} rows={3}
                  placeholder="Tedarikçi adı, iletişim, koşullar…"
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button onClick={save} disabled={saving || !form.code || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                  {saving ? <i className="pi pi-spin pi-spinner" /> : typeof drawer === "string" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
