"use client";

import { useState, useEffect, useCallback } from "react";
import { VEHICLE_STATUSES, getVehicleStatus, type Vehicle } from "@/lib/ops-types";

const EMPTY = { plate: "", brand: "", model: "", year: new Date().getFullYear(), fuelType: "gasoline", insuranceExpiry: "", inspectionExpiry: "", notes: "" };
const FUELS = ["gasoline","diesel","lpg","electric","hybrid"];
const FUEL_LABELS: Record<string,string> = { gasoline:"Benzin", diesel:"Dizel", lpg:"LPG", electric:"Elektrik", hybrid:"Hibrit" };

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [drawer,   setDrawer]   = useState<"new" | Vehicle | null>(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const today = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/fleet");
    const d = await r.json() as { vehicles: Vehicle[] };
    setVehicles(d.vehicles); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(v: Vehicle) {
    setForm({ plate: v.plate, brand: v.brand ?? "", model: v.model ?? "", year: v.year ?? new Date().getFullYear(), fuelType: v.fuelType, insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0,10) : "", inspectionExpiry: v.inspectionExpiry ? v.inspectionExpiry.slice(0,10) : "", notes: v.notes ?? "" });
    setDrawer(v);
  }

  async function save() {
    setSaving(true);
    const payload = { ...form, year: form.year||undefined, insuranceExpiry: form.insuranceExpiry||undefined, inspectionExpiry: form.inspectionExpiry||undefined };
    if (typeof drawer === "string") {
      await fetch("/api/modules/fleet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (drawer !== null) {
      await fetch("/api/modules/fleet", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, ...payload }) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function del(id: string) {
    if (!confirm("Aracı silmek istiyor musunuz?")) return;
    await fetch("/api/modules/fleet", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const isExpiring = (dateStr: string | null) => { if (!dateStr) return false; const d = new Date(dateStr); return (d.getTime() - today.getTime()) / 86400000 <= 30 && d >= today; };
  const isExpired  = (dateStr: string | null) => { if (!dateStr) return false; return new Date(dateStr) < today; };
  const expiringCount = vehicles.filter((v) => isExpiring(v.insuranceExpiry) || isExpiring(v.inspectionExpiry) || isExpired(v.insuranceExpiry) || isExpired(v.inspectionExpiry)).length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-car text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">Filo Yönetimi</h1><p className="text-xs text-slate-400">Araçlar, yakıt, sigorta ve muayene</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Araç
        </button>
      </div>

      {expiringCount > 0 && <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"><i className="pi pi-exclamation-triangle text-amber-500" /><strong>{expiringCount}</strong> araçta sigorta/muayene uyarısı</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? <div className="col-span-3 flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
        : vehicles.length === 0 ? <div className="col-span-3 py-16 text-center text-slate-400"><i className="pi pi-car text-5xl block mb-3 opacity-20" />Henüz araç yok</div>
        : vehicles.map((v) => {
          const st = getVehicleStatus(v.status);
          const insWarn = isExpired(v.insuranceExpiry) || isExpiring(v.insuranceExpiry);
          const muaWarn = isExpired(v.inspectionExpiry) || isExpiring(v.inspectionExpiry);
          return (
            <div key={v.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 hover:shadow-md transition cursor-pointer"
              onClick={(e) => { if ((e.target as HTMLElement).closest("button,select")) return; openEdit(v); }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div><p className="font-bold text-foreground font-mono">{v.plate}</p><p className="text-xs text-slate-400">{[v.brand,v.model,v.year].filter(Boolean).join(" ")}</p></div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg}`}>{st.label}</span>
                  <button onClick={(e) => { e.stopPropagation(); del(v.id); }} className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500"><i className="pi pi-trash text-xs" /></button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Yakıt</span><span className="font-medium">{FUEL_LABELS[v.fuelType] ?? v.fuelType}</span>
                </div>
                <div className={`flex items-center justify-between text-xs ${insWarn ? "text-red-500 font-medium" : ""}`}>
                  <span className={insWarn ? "text-red-500" : "text-slate-400"}>Sigorta</span>
                  <span>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString("tr-TR") : "—"}</span>
                </div>
                <div className={`flex items-center justify-between text-xs ${muaWarn ? "text-red-500 font-medium" : ""}`}>
                  <span className={muaWarn ? "text-red-500" : "text-slate-400"}>Muayene</span>
                  <span>{v.inspectionExpiry ? new Date(v.inspectionExpiry).toLocaleDateString("tr-TR") : "—"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Araç" : "Aracı Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Plaka *</label>
                  <input value={form.plate} onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" placeholder="34 AB 1234" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Marka</label>
                  <input value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
                  <input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Yıl</label>
                  <input type="number" min="1990" max="2030" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Yakıt</label>
                  <select value={form.fuelType} onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {FUELS.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Sigorta Bitiş</label>
                  <input type="date" value={form.insuranceExpiry} onChange={(e) => setForm((p) => ({ ...p, insuranceExpiry: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Muayene Bitiş</label>
                  <input type="date" value={form.inspectionExpiry} onChange={(e) => setForm((p) => ({ ...p, inspectionExpiry: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              {typeof drawer !== "string" && (
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Durum</label>
                  <select value={drawer.status} onChange={(e) => fetch("/api/modules/fleet",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:drawer.id,status:e.target.value})}).then(()=>load())}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {VEHICLE_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select></div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
                <button onClick={save} disabled={saving || !form.plate} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                  {saving ? <i className="pi pi-spin pi-spinner" /> : typeof drawer === "string" ? "Ekle" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
