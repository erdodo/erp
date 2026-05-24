"use client";

import { useState, useEffect, useCallback } from "react";
import { MAINT_TYPES, getMaintType, type MaintenanceRecord, type MaintenanceSchedule, type EquipmentItem } from "@/lib/quality-types";

const EMPTY = { type: "preventive", description: "", scheduleId: "", equipmentId: "", technician: "", cost: 0, currency: "TRY", duration: 0, completedAt: "" };

export default function MaintenanceRecordsPage() {
  const [records,    setRecords]    = useState<MaintenanceRecord[]>([]);
  const [schedules,  setSchedules]  = useState<MaintenanceSchedule[]>([]);
  const [equipment,  setEquipment]  = useState<EquipmentItem[]>([]);
  const [employees,  setEmployees]  = useState<{ id: string; name: string }[]>([]);
  const [total,      setTotal]      = useState(0);
  const [pages,      setPages]      = useState(1);
  const [page,       setPage]       = useState(1);
  const [totalCost,  setTotalCost]  = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [modal,      setModal]      = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async (pg?: number) => {
    setLoading(true);
    const p = pg ?? page;
    const [rr, sr, er] = await Promise.all([
      fetch(`/api/modules/maintenance/records?page=${p}`),
      fetch("/api/modules/maintenance/schedules?limit=200"),
      fetch("/api/modules/equipment?limit=200"),
    ]);
    const rd = await rr.json() as { records: MaintenanceRecord[]; total: number; pages: number; totalCost: number; employees?: { id: string; name: string }[] };
    const sd = await sr.json() as { schedules: MaintenanceSchedule[] };
    const ed = await er.json() as { equipment: EquipmentItem[] };
    setRecords(rd.records); setTotal(rd.total); setPages(rd.pages); setTotalCost(rd.totalCost);
    setSchedules(sd.schedules); setEquipment(ed.equipment);
    if (rd.employees) setEmployees(rd.employees);
    setLoading(false);
  }, [page]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/maintenance/records", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, scheduleId: form.scheduleId || undefined, equipmentId: form.equipmentId || undefined, completedAt: form.completedAt || undefined }),
    });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  return (
    <div className="pb-8 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Toplam Kayıt", value: String(total), icon: "pi-history",     color: "#6366f1" },
          { label: "Toplam Maliyet", value: `${totalCost.toLocaleString("tr-TR")} TRY`, icon: "pi-money-bill", color: "#f59e0b" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: `${kpi.color}20` }}>
              <i className={`pi ${kpi.icon} text-lg`} style={{ color: kpi.color }} />
            </div>
            <div><p className="text-xl font-bold text-foreground">{kpi.value}</p><p className="text-xs text-slate-400">{kpi.label}</p></div>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 flex items-center justify-center">
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-plus text-xs" /> Bakım Kaydı
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Açıklama</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Tip</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Ekipman</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Teknisyen</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden sm:table-cell">Süre (sa)</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Maliyet</th>
                <th className="py-3 px-4 font-medium text-slate-500 hidden md:table-cell">Tamamlandı</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <i className="pi pi-history text-4xl block mb-2 opacity-30" />Henüz bakım kaydı yok
                </td></tr>
              ) : records.map((r) => {
                const mt = getMaintType(r.type);
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5">
                      <p className="font-medium text-foreground line-clamp-1">{r.description}</p>
                      {r.schedule && <p className="text-xs text-slate-400">{r.schedule.name}</p>}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${mt.bg}`}>
                        <i className={`pi ${mt.icon} text-xs`} />{mt.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{r.equipment?.name ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden lg:table-cell">{r.technician ?? "—"}</td>
                    <td className="py-3 px-4 text-right text-slate-500 hidden sm:table-cell">{r.duration ?? "—"}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">
                      {r.cost ? `${r.cost.toLocaleString("tr-TR")} ${r.currency}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden md:table-cell">{new Date(r.completedAt).toLocaleDateString("tr-TR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} kayıt</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load(page-1); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load(page+1); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Bakım Kaydı Ekle</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama *</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tip</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {MAINT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
                  <select value={form.scheduleId} onChange={(e) => setForm((p) => ({ ...p, scheduleId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Ekipman</label>
                  <select value={form.equipmentId} onChange={(e) => setForm((p) => ({ ...p, equipmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Teknisyen</label>
                  <div className="relative">
                    <select
                      value={form.technician}
                      onChange={(e) => setForm((p) => ({ ...p, technician: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer appearance-none focus:outline-none"
                    >
                      <option value="">— Teknisyen Seçin —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Maliyet (TRY)</label>
                  <input type="number" min="0" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Süre (saat)</label>
                  <input type="number" min="0" step="0.5" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Tamamlanma Tarihi</label>
                  <input type="date" value={form.completedAt} onChange={(e) => setForm((p) => ({ ...p, completedAt: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.description} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
