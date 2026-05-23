"use client";

import { useState, useEffect, useCallback } from "react";

interface IoTDevice {
  id: string; deviceId: string; name: string; type: string; location: string | null;
  isOnline: boolean; isActive: boolean; lastSeenAt: string | null; createdAt: string;
  _count?: { readings: number };
}

const DEVICE_TYPES = ["counter","sensor","camera","gps","thermostat","other"];

export default function IoTPage() {
  const [devices,  setDevices]  = useState<IoTDevice[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState({ name: "", type: "counter", location: "" });
  const [saving,   setSaving]   = useState(false);
  const [newKey,   setNewKey]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/iot");
    const d = await r.json() as { devices: IoTDevice[] };
    setDevices(d.devices); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    const r = await fetch("/api/modules/iot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json() as { deviceId: string };
    setSaving(false); setModal(false); setNewKey(d.deviceId); setForm({ name:"", type:"counter", location:"" }); await load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/modules/iot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    await load();
  }

  async function del(id: string) {
    if (!confirm("Cihazı silmek istiyor musunuz?")) return;
    await fetch("/api/modules/iot", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  const onlineCount = devices.filter((d) => d.isOnline).length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-wifi text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">IoT Cihazları</h1><p className="text-xs text-slate-400">{onlineCount}/{devices.length} cihaz çevrimiçi</p></div>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Cihaz Ekle
        </button>
      </div>

      {newKey && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <i className="pi pi-check-circle text-emerald-500 mt-0.5" />
          <div><p className="font-medium">Cihaz oluşturuldu! Device ID: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">{newKey}</code></p></div>
          <button onClick={() => setNewKey(null)} className="ml-auto text-emerald-400 hover:text-emerald-700"><i className="pi pi-times text-xs" /></button>
        </div>
      )}

      {loading ? <div className="flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>
      : devices.length === 0 ? <div className="py-16 text-center text-slate-400"><i className="pi pi-wifi text-5xl block mb-3 opacity-20" />IoT cihazı yok</div>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${d.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                    <p className="font-semibold text-foreground">{d.name}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{d.type} · {d.deviceId}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggle(d.id, d.isActive)} className={`px-2 py-1 rounded-lg text-xs font-medium ${d.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{d.isActive ? "Aktif" : "Pasif"}</button>
                  <button onClick={() => del(d.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 rounded"><i className="pi pi-trash text-xs" /></button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                {d.location && <div className="flex items-center gap-1.5"><i className="pi pi-map-marker text-xs" />{d.location}</div>}
                <div className="flex items-center justify-between">
                  <span><i className="pi pi-database mr-1" />{d._count?.readings ?? 0} okuma</span>
                  {d.lastSeenAt && <span>Son: {new Date(d.lastSeenAt).toLocaleString("tr-TR")}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">Yeni IoT Cihazı</h2><button onClick={() => setModal(false)} className="text-slate-400"><i className="pi pi-times" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Cihaz Adı *</label><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Tür</label>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Konum</label><input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
