"use client";

import { useState, useEffect, useCallback } from "react";
import type { QualityStandard } from "@/lib/quality-types";

export default function StandardsPage() {
  const [standards, setStandards] = useState<QualityStandard[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ name: "", description: "", maxPpm: 1000 });
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/quality/standards");
    const d = await r.json() as { standards: QualityStandard[] };
    setStandards(d.standards); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    if (editId) {
      await fetch("/api/modules/quality/standards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...form }) });
    } else {
      await fetch("/api/modules/quality/standards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setSaving(false); setShowForm(false); setEditId(null); setForm({ name: "", description: "", maxPpm: 1000 }); await load();
  }

  async function deleteStd(id: string) {
    if (!confirm("Bu standardı silmek istiyor musunuz?")) return;
    await fetch("/api/modules/quality/standards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  function startEdit(s: QualityStandard) { setEditId(s.id); setForm({ name: s.name, description: s.description ?? "", maxPpm: s.maxPpm }); setShowForm(true); }

  const ppmColor = (ppm: number) => ppm < 500 ? "#10b981" : ppm < 2000 ? "#f59e0b" : "#ef4444";

  return (
    <div className="pb-8 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{standards.length} standart</p>
        <button onClick={() => { setEditId(null); setForm({ name: "", description: "", maxPpm: 1000 }); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Standart
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">{editId ? "Standardı Düzenle" : "Yeni Kalite Standardı"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Standart Adı *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="ISO 9001, IATF 16949…"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Maks. PPM</label>
              <input type="number" min="0" value={form.maxPpm} onChange={(e) => setForm((p) => ({ ...p, maxPpm: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
            <div className="sm:col-span-3"><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : editId ? "Güncelle" : "Ekle"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>
        ) : standards.length === 0 ? (
          <div className="py-16 text-center text-slate-400"><i className="pi pi-list-check text-4xl block mb-2 opacity-30" />Henüz standart eklenmedi</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Standart</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Açıklama</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500">Maks. PPM</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {standards.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-5 font-medium text-foreground">{s.name}</td>
                  <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{s.description ?? "—"}</td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: ppmColor(s.maxPpm) }}>{s.maxPpm.toLocaleString("tr-TR")}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => { void fetch("/api/modules/quality/standards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, isActive: !s.isActive }) }).then(() => load()); }}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${s.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(s)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i className="pi pi-pencil text-xs" /></button>
                      <button onClick={() => deleteStd(s.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
