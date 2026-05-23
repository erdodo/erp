"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceRoute } from "@/lib/ops-types";

const STATUSES = [
  { id: "planned",   label: "Planlandı",   bg: "bg-slate-100 text-slate-600"     },
  { id: "active",    label: "Aktif",        bg: "bg-blue-100 text-blue-700"       },
  { id: "completed", label: "Tamamlandı",  bg: "bg-emerald-100 text-emerald-700" },
  { id: "cancelled", label: "İptal",        bg: "bg-red-100 text-red-700"        },
];

export default function ServiceRoutesPage() {
  const [routes,   setRoutes]   = useState<ServiceRoute[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; brand: string | null; model: string | null }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ name: "", vehicleId: "", stops: "", notes: "" });
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/service-routes");
    const d = await r.json() as { routes: ServiceRoute[]; vehicles: { id: string; plate: string; brand: string | null; model: string | null }[] };
    setRoutes(d.routes); setVehicles(d.vehicles); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/service-routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, vehicleId: form.vehicleId||undefined }) });
    setSaving(false); setModal(false); setForm({ name:"", vehicleId:"", stops:"", notes:"" }); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/service-routes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-map text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">Servis Güzergahları</h1><p className="text-xs text-slate-400">Güzergah, araç ve durak yönetimi</p></div>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Güzergah
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
              <th className="py-3 px-5 text-left font-medium text-slate-500">Güzergah</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Araç</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Duraklar</th>
              <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Oluşturma</th>
            </tr></thead>
            <tbody>
              {routes.length === 0 ? <tr><td colSpan={5} className="py-16 text-center text-slate-400"><i className="pi pi-map text-4xl block mb-2 opacity-30" />Güzergah yok</td></tr>
              : routes.map((r) => {
                const ss = STATUSES.find((s) => s.id === r.status) ?? STATUSES[0];
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5"><p className="font-medium text-foreground">{r.name}</p>{r.notes && <p className="text-xs text-slate-400 truncate max-w-xs">{r.notes}</p>}</td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{r.vehicle?.plate ?? "—"}</td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{r.stops ? r.stops.split(",").length + " durak" : "—"}</td>
                    <td className="py-3 px-4">
                      <select value={r.status} onChange={(e) => changeStatus(r.id, e.target.value)} className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${ss.bg}`}>
                        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">Yeni Güzergah</h2><button onClick={() => setModal(false)} className="text-slate-400"><i className="pi pi-times" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Ad *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Araç</label>
                <select value={form.vehicleId} onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  <option value="">— Seçin —</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} {v.brand ? `(${v.brand})` : ""}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Duraklar (virgülle ayır)</label><input value={form.stops} onChange={(e) => setForm((p) => ({ ...p, stops: e.target.value }))} placeholder="Durak 1, Durak 2, Durak 3" className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label><textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
