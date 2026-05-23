"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProductionLine } from "@/lib/production-types";

export default function ProductionLinesPage() {
  const [lines,    setLines]   = useState<ProductionLine[]>([]);
  const [loading,  setLoading] = useState(false);
  const [showForm, setShowForm]= useState(false);
  const [editId,   setEditId]  = useState<string | null>(null);
  const [form,     setForm]    = useState({ name: "", description: "" });
  const [saving,   setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/modules/production/lines");
    const d = await r.json() as { lines: ProductionLine[] };
    setLines(d.lines); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    if (editId) {
      await fetch("/api/modules/production/lines", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...form }),
      });
    } else {
      await fetch("/api/modules/production/lines", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    }
    setForm({ name: "", description: "" }); setEditId(null); setShowForm(false); setSaving(false);
    await load();
  }

  async function toggleActive(line: ProductionLine) {
    await fetch("/api/modules/production/lines", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: line.id, isActive: !line.isActive }),
    });
    await load();
  }

  async function deleteLine(id: string) {
    if (!confirm("Bu hattı silmek istiyor musunuz?")) return;
    await fetch("/api/modules/production/lines", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    await load();
  }

  function startEdit(line: ProductionLine) {
    setEditId(line.id); setForm({ name: line.name, description: line.description ?? "" }); setShowForm(true);
  }

  return (
    <div className="pb-8 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{lines.length} hat tanımlı</p>
        <button onClick={() => { setEditId(null); setForm({ name: "", description: "" }); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Hat
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">{editId ? "Hattı Düzenle" : "Yeni Hat"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hat Adı *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Örn: Hat-1, Montaj Hattı A"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Kısa açıklama"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
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
        ) : lines.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <i className="pi pi-sliders-h text-4xl block mb-2 opacity-30" />Henüz hat eklenmedi
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Hat Adı</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Açıklama</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden md:table-cell">Sipariş</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                  <td className="py-3 px-5 font-medium text-foreground">{line.name}</td>
                  <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{line.description ?? "—"}</td>
                  <td className="py-3 px-4 text-right text-slate-500 hidden md:table-cell">{line._count?.orders ?? 0}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => toggleActive(line)}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition ${line.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                      {line.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(line)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition">
                        <i className="pi pi-pencil text-xs" />
                      </button>
                      <button onClick={() => deleteLine(line.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition">
                        <i className="pi pi-trash text-xs" />
                      </button>
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
