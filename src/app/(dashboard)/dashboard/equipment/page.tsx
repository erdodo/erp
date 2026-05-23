"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { EQUIP_STATUSES, getEquipStatus, type EquipmentItem } from "@/lib/quality-types";

const EMPTY = { code: "", name: "", brand: "", model: "", serialNo: "", location: "", status: "active", purchaseDate: "", purchasePrice: 0, currency: "TRY", warrantyUntil: "", notes: "" };

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState("");
  const [statusF,   setStatusF]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [drawer,    setDrawer]    = useState<"new" | EquipmentItem | null>(null);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = new Date();

  const load = useCallback(async (opts?: { pg?: number; s?: string; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const q  = opts?.s  ?? search;
    const st = opts?.st ?? statusF;
    const params = new URLSearchParams({ page: String(p), search: q, status: st });
    const r = await fetch(`/api/modules/equipment?${params}`);
    const d = await r.json() as { equipment: EquipmentItem[]; total: number; pages: number };
    setEquipment(d.equipment); setTotal(d.total); setPages(d.pages); setLoading(false);
  }, [page, search, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg: 1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function h(e: KeyboardEvent) {
      if ((e.target as HTMLElement).matches("input,textarea")) return;
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setDrawer(null);
    }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  function openEdit(eq: EquipmentItem) {
    setForm({
      code: eq.code, name: eq.name, brand: eq.brand ?? "", model: eq.model ?? "", serialNo: eq.serialNo ?? "",
      location: eq.location ?? "", status: eq.status, purchaseDate: eq.purchaseDate ? eq.purchaseDate.slice(0,10) : "",
      purchasePrice: eq.purchasePrice ?? 0, currency: eq.currency, warrantyUntil: eq.warrantyUntil ? eq.warrantyUntil.slice(0,10) : "",
      notes: eq.notes ?? "",
    });
    setDrawer(eq);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, purchaseDate: form.purchaseDate || undefined, warrantyUntil: form.warrantyUntil || undefined };
    if (typeof drawer === "string") {
      await fetch("/api/modules/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (drawer !== null) {
      await fetch("/api/modules/equipment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, ...payload }) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function deleteEquipment(id: string) {
    if (!confirm("Silmek istiyor musunuz?")) return;
    await fetch("/api/modules/equipment", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const isWarrantyExpiring = (eq: EquipmentItem) => {
    if (!eq.warrantyUntil) return false;
    const exp = new Date(eq.warrantyUntil);
    const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };
  const isWarrantyExpired = (eq: EquipmentItem) => eq.warrantyUntil && new Date(eq.warrantyUntil) < today;

  const expiringCount = equipment.filter(isWarrantyExpiring).length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-wrench text-white text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">Ekipman Yönetimi</h1>
            <p className="text-xs text-slate-400">Marka, model, durum ve garanti takibi</p>
          </div>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Ekipman
        </button>
      </div>

      {expiringCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <i className="pi pi-exclamation-triangle text-amber-500" />
          <strong>{expiringCount}</strong> ekipmanın garantisi 30 gün içinde dolacak
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ekipman adı veya kod ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        <select value={statusF} onChange={(e) => { setStatusF(e.target.value); setPage(1); void load({ pg:1, st: e.target.value }); }}
          className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
          <option value="">Tüm Durumlar</option>
          {EQUIP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Kod</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Ekipman</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Marka / Model</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Konum</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Garanti Bitiş</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden lg:table-cell">Bakım</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {equipment.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-wrench text-4xl block mb-2 opacity-30" />
                  {search || statusF ? "Filtreye uyan ekipman yok" : "Henüz ekipman eklenmedi"}
                </td></tr>
              ) : equipment.map((eq) => {
                const st      = getEquipStatus(eq.status);
                const expiring = isWarrantyExpiring(eq);
                const expired  = isWarrantyExpired(eq);
                return (
                  <tr key={eq.id}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(eq); }}
                    className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                    <td className="py-3 px-5 font-mono text-xs font-semibold text-foreground">{eq.code}</td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground">{eq.name}</p>
                      {eq.serialNo && <p className="text-xs text-slate-400 font-mono">S/N: {eq.serialNo}</p>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{[eq.brand, eq.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden lg:table-cell">{eq.location ?? "—"}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>
                        <i className={`pi ${st.icon} text-xs`} />{st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      {eq.warrantyUntil ? (
                        <span className={`text-xs font-medium ${expired ? "text-red-500" : expiring ? "text-amber-600" : "text-slate-500"}`}>
                          {expired && <i className="pi pi-times-circle text-xs mr-1" />}
                          {expiring && <i className="pi pi-exclamation-triangle text-xs mr-1" />}
                          {new Date(eq.warrantyUntil).toLocaleDateString("tr-TR")}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 hidden lg:table-cell">{eq._count?.maintenanceRecords ?? 0}</td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(eq)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i className="pi pi-pencil text-xs" /></button>
                        <button onClick={() => deleteEquipment(eq.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} ekipman</span>
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
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Ekipman" : "Ekipmanı Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Kod *</label>
                  <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="EKP-001" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Ad *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Marka</label>
                  <input value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                  <input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Seri No</label>
                  <input value={form.serialNo} onChange={(e) => setForm((p) => ({ ...p, serialNo: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Konum</label>
                  <input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {EQUIP_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Satın Alma Fiyatı</label>
                  <input type="number" min="0" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Satın Alma Tarihi</label>
                  <input type="date" value={form.purchaseDate} onChange={(e) => setForm((p) => ({ ...p, purchaseDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Garanti Bitiş</label>
                  <input type="date" value={form.warrantyUntil} onChange={(e) => setForm((p) => ({ ...p, warrantyUntil: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
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
