"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getMethodStatus, METHOD_STATUSES, type ProductionMethod } from "@/lib/production-types";

interface CtxMenu { x: number; y: number; method: ProductionMethod }

const EMPTY_FORM = { name: "", version: "1.0", description: "", steps: "", materials: "", equipment: "" };

export default function ProductionMethodPage() {
  const [methods,  setMethods]  = useState<ProductionMethod[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [drawer,   setDrawer]   = useState<"new" | ProductionMethod | null>(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [ctxMenu,  setCtxMenu]  = useState<CtxMenu | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const q  = opts?.s  ?? search;
    const st = opts?.st ?? status;
    const params = new URLSearchParams({ page: String(p), search: q, status: st });
    const r = await fetch(`/api/modules/production/methods?${params}`);
    const d = await r.json() as { methods: ProductionMethod[]; total: number; pages: number };
    setMethods(d.methods); setTotal(d.total); setPages(d.pages);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setCtxMenu(null); setDrawer(null); }
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

  function openNew() { setForm(EMPTY_FORM); setDrawer("new"); }
  function openEdit(m: ProductionMethod) { setForm({ name: m.name, version: m.version, description: m.description ?? "", steps: m.steps ?? "", materials: m.materials ?? "", equipment: m.equipment ?? "" }); setDrawer(m); }

  async function save() {
    setSaving(true);
    if (typeof drawer === "string") {
      await fetch("/api/modules/production/methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (drawer !== null) {
      await fetch(`/api/modules/production/methods/${drawer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function approve(id: string) {
    setCtxMenu(null);
    await fetch(`/api/modules/production/methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve: true }) });
    await load();
  }

  async function deprecate(id: string) {
    setCtxMenu(null);
    await fetch(`/api/modules/production/methods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "deprecated" }) });
    await load();
  }

  async function deleteMethod(id: string) {
    if (!confirm("Bu metodu silmek istiyor musunuz?")) return;
    setCtxMenu(null);
    await fetch(`/api/modules/production/methods/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-list text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">Üretim Metotları</h1>
            <p className="text-xs text-slate-400">Versiyonlu metot kütüphanesi</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Metot
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Metot ara… (/ ile odaklan)"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); void load({ pg: 1, st: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer focus:outline-none text-foreground">
          <option value="">Tüm Durumlar</option>
          {METHOD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Metot Adı</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Versiyon</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Açıklama</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Onaylayan</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {methods.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                  <i className="pi pi-list text-4xl block mb-2 opacity-30" />
                  {search || status ? "Filtreye uyan metot bulunamadı" : "Henüz metot eklenmedi"}
                </td></tr>
              ) : methods.map((m) => {
                const st = getMethodStatus(m.status);
                return (
                  <tr key={m.id}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, method: m }); }}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(m); }}
                    className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                    <td className="py-3 px-5 font-medium text-foreground">{m.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">v{m.version}</td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell max-w-xs truncate">{m.description ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs hidden lg:table-cell">{m.approvedBy ?? "—"}</td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, method: m }); }}
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
            <p className="font-semibold text-foreground truncate">{ctxMenu.method.name}</p>
            <p className="text-xs text-slate-400">v{ctxMenu.method.version}</p>
          </div>
          <button onClick={() => { openEdit(ctxMenu.method); setCtxMenu(null); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-foreground transition">
            <i className="pi pi-pencil text-slate-400 text-xs" /> Düzenle
          </button>
          {ctxMenu.method.status === "draft" && (
            <button onClick={() => approve(ctxMenu.method.id)}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 flex items-center gap-2 text-emerald-700 transition">
              <i className="pi pi-check text-xs" /> Onayla (Aktif et)
            </button>
          )}
          {ctxMenu.method.status === "active" && (
            <button onClick={() => deprecate(ctxMenu.method.id)}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-500 transition">
              <i className="pi pi-ban text-xs" /> Kullanım Dışı Yap
            </button>
          )}
          <div className="border-t border-border mt-1 pt-1">
            <button onClick={() => deleteMethod(ctxMenu.method.id)}
              className="w-full text-left px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 transition">
              <i className="pi pi-trash text-xs" /> Sil
            </button>
          </div>
        </div>
      )}

      {/* Drawer — New/Edit */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{drawer === "new" ? "Yeni Metot" : "Metotu Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Metot Adı *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Metot adı" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Versiyon</label>
                  <input value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                    placeholder="1.0" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                  <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Adımlar (her satır bir adım)</label>
                <textarea value={form.steps} onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))} rows={5}
                  placeholder="1. Hammadde kontrolü&#10;2. Ön işlem&#10;3. Montaj" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Malzeme Gereksinimleri</label>
                <textarea value={form.materials} onChange={(e) => setForm((p) => ({ ...p, materials: e.target.value }))} rows={3}
                  placeholder="Malzeme listesi" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ekipman Gereksinimleri</label>
                <textarea value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} rows={3}
                  placeholder="Gerekli ekipman" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                  {saving ? <i className="pi pi-spin pi-spinner" /> : drawer === "new" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
