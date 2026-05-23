"use client";

import { useState, useEffect, useCallback } from "react";
import { MAINT_TYPES, getMaintType, type MaintenanceSchedule, type EquipmentItem } from "@/lib/quality-types";

const EMPTY = { name: "", type: "preventive", equipmentId: "", frequency: "", nextDate: "", lastDate: "", estimatedCost: 0, currency: "TRY", notes: "" };

export default function MaintenancePage() {
  const [schedules,  setSchedules]  = useState<MaintenanceSchedule[]>([]);
  const [equipment,  setEquipment]  = useState<EquipmentItem[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [typeF,      setTypeF]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [drawer,     setDrawer]     = useState<"new" | MaintenanceSchedule | null>(null);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const today = new Date();
  const soon  = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const load = useCallback(async (opts?: { pg?: number; t?: string }) => {
    setLoading(true);
    const p = opts?.pg ?? page;
    const t = opts?.t  ?? typeF;
    const params = new URLSearchParams({ page: String(p), type: t });
    const [sr, er] = await Promise.all([
      fetch(`/api/modules/maintenance/schedules?${params}`),
      fetch("/api/modules/equipment?limit=200"),
    ]);
    const sd = await sr.json() as { schedules: MaintenanceSchedule[]; total: number; pages: number };
    const ed = await er.json() as { equipment: EquipmentItem[] };
    setSchedules(sd.schedules); setTotal(sd.total); setPages(sd.pages); setEquipment(ed.equipment);
    setLoading(false);
  }, [page, typeF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(s: MaintenanceSchedule) {
    setForm({ name: s.name, type: s.type, equipmentId: s.equipmentId ?? "", frequency: s.frequency ?? "", nextDate: s.nextDate ? s.nextDate.slice(0,10) : "", lastDate: s.lastDate ? s.lastDate.slice(0,10) : "", estimatedCost: s.estimatedCost ?? 0, currency: s.currency, notes: s.notes ?? "" });
    setDrawer(s);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, equipmentId: form.equipmentId || undefined, nextDate: form.nextDate || undefined, lastDate: form.lastDate || undefined };
    if (typeof drawer === "string") {
      await fetch("/api/modules/maintenance/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (drawer !== null) {
      await fetch("/api/modules/maintenance/schedules", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, ...payload }) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Bu bakım planını silmek istiyor musunuz?")) return;
    await fetch("/api/modules/maintenance/schedules", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const isDue   = (s: MaintenanceSchedule) => s.nextDate && new Date(s.nextDate) <= today;
  const isSoon  = (s: MaintenanceSchedule) => s.nextDate && new Date(s.nextDate) > today && new Date(s.nextDate) <= soon;
  const dueCount = schedules.filter(isDue).length;

  return (
    <div className="pb-8 space-y-4">
      {dueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <i className="pi pi-exclamation-circle text-red-500" />
          <strong>{dueCount}</strong> bakım planının tarihi geçti — acil müdahale gerekiyor
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1">
          <select value={typeF} onChange={(e) => { setTypeF(e.target.value); setPage(1); void load({ pg:1, t: e.target.value }); }}
            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
            <option value="">Tüm Tipler</option>
            {MAINT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Plan
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Plan</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Tip</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Ekipman</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Frekans</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Sonraki Bakım</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden lg:table-cell">Kayıt</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <i className="pi pi-calendar text-4xl block mb-2 opacity-30" />
                  {typeF ? "Filtreye uyan plan yok" : "Henüz bakım planı eklenmedi"}
                </td></tr>
              ) : schedules.map((s) => {
                const mt  = getMaintType(s.type);
                const due  = isDue(s);
                const soon_ = isSoon(s);
                return (
                  <tr key={s.id}
                    onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(s); }}
                    className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer ${due ? "bg-red-50/30 dark:bg-red-900/10" : soon_ ? "bg-amber-50/30" : ""}`}>
                    <td className="py-3 px-5">
                      <p className="font-medium text-foreground">{s.name}</p>
                      {s.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{s.notes}</p>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${mt.bg}`}>
                        <i className={`pi ${mt.icon} text-xs`} />{mt.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{equipment.find((e) => e.id === s.equipmentId)?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{s.frequency ?? "—"}</td>
                    <td className="py-3 px-4">
                      {s.nextDate ? (
                        <span className={`flex items-center gap-1.5 text-sm font-medium ${due ? "text-red-600" : soon_ ? "text-amber-600" : "text-foreground"}`}>
                          {due && <i className="pi pi-exclamation-circle text-xs" />}
                          {soon_ && <i className="pi pi-clock text-xs" />}
                          {new Date(s.nextDate).toLocaleDateString("tr-TR")}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 hidden lg:table-cell">{s._count?.records ?? 0}</td>
                    <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i className="pi pi-pencil text-xs" /></button>
                        <button onClick={() => deleteSchedule(s.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} plan</span>
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
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Bakım Planı" : "Planı Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Plan Adı *</label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tip</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {MAINT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Ekipman</label>
                  <select value={form.equipmentId} onChange={(e) => setForm((p) => ({ ...p, equipmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Frekans</label>
                  <input value={form.frequency} onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} placeholder="Aylık, 6 ayda bir…" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tahmini Maliyet</label>
                  <input type="number" min="0" value={form.estimatedCost} onChange={(e) => setForm((p) => ({ ...p, estimatedCost: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Son Bakım</label>
                  <input type="date" value={form.lastDate} onChange={(e) => setForm((p) => ({ ...p, lastDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Sonraki Bakım</label>
                  <input type="date" value={form.nextDate} onChange={(e) => setForm((p) => ({ ...p, nextDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
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
