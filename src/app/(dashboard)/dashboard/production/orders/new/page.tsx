"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PRODUCTION_STATUSES } from "@/lib/production-types";
import type { ProductionLine, ProductionMethod } from "@/lib/production-types";
import QuickAddSelect from "@/components/ui/QuickAddSelect";

export default function NewProductionOrderPage() {
  const router = useRouter();
  const [lines,   setLines]   = useState<ProductionLine[]>([]);
  const [methods, setMethods] = useState<ProductionMethod[]>([]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    productName: "", quantity: 1, unit: "adet",
    lineId: "", methodId: "", status: "planned",
    plannedStart: "", plannedEnd: "", notes: "",
  });

  const load = useCallback(async () => {
    const [lr, mr] = await Promise.all([
      fetch("/api/modules/production/lines"),
      fetch("/api/modules/production/methods?status=active&limit=100"),
    ]);
    const ld = await lr.json() as { lines: ProductionLine[] };
    const md = await mr.json() as { methods: ProductionMethod[] };
    setLines(ld.lines); setMethods(md.methods);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function set(field: string, value: string | number) { setForm((p) => ({ ...p, [field]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productName) { setError("Ürün adı zorunludur."); return; }
    setSaving(true); setError("");
    const r = await fetch("/api/modules/production/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lineId: form.lineId || undefined, methodId: form.methodId || undefined }),
    });
    if (r.ok) { const d = await r.json() as { id: string }; router.push(`/dashboard/production/orders/${d.id}`); }
    else { setError("Kaydedilemedi."); setSaving(false); }
  }

  return (
    <div className="max-w-2xl pb-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h2 className="font-semibold text-foreground mb-5">Üretim Emri Bilgileri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Ürün Adı *</label>
              <input value={form.productName} onChange={(e) => set("productName", e.target.value)} required
                placeholder="Üretilecek ürün"
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Miktar *</label>
              <input type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} required
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Birim</label>
              <input value={form.unit} onChange={(e) => set("unit", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <QuickAddSelect
              label="Üretim Hattı"
              value={form.lineId}
              onChange={(v) => set("lineId", v)}
              options={lines.map((l) => ({ value: l.id, label: l.name }))}
              dialogTitle="Üretim Hattı"
              apiEndpoint="/api/modules/production/lines"
              addPageUrl="/dashboard/production/lines"
              fields={[
                { key: "name", label: "Hat Adı", required: true, placeholder: "ör. A Hattı" },
                { key: "description", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı" },
              ]}
              onCreated={(item) => {
                const line = item as { id: string; name: string };
                setLines((prev) => [...prev, line as unknown as ProductionLine]);
                set("lineId", line.id);
              }}
            />
            <QuickAddSelect
              label="Üretim Metodu"
              value={form.methodId}
              onChange={(v) => set("methodId", v)}
              options={methods.map((m) => ({ value: m.id, label: `${m.name} v${m.version}` }))}
              dialogTitle="Üretim Metodu"
              apiEndpoint="/api/modules/production/methods"
              addPageUrl="/dashboard/production/methods"
              fields={[
                { key: "name", label: "Metod Adı", required: true, placeholder: "ör. Standart Montaj" },
                { key: "version", label: "Versiyon", placeholder: "1.0", defaultValue: "1.0" },
                { key: "description", label: "Açıklama", type: "textarea", placeholder: "İsteğe bağlı" },
              ]}
              onCreated={(item) => {
                const method = item as { id: string; name: string; version: string };
                setMethods((prev) => [...prev, method as unknown as ProductionMethod]);
                set("methodId", method.id);
              }}
            />
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç Durumu</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                {PRODUCTION_STATUSES.filter((s) => ["planned","in_progress"].includes(s.id)).map((s) =>
                  <option key={s.id} value={s.id}>{s.label}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Planlanan Başlangıç</label>
              <input type="datetime-local" value={form.plannedStart} onChange={(e) => set("plannedStart", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Planlanan Bitiş</label>
              <input type="datetime-local" value={form.plannedEnd} onChange={(e) => set("plannedEnd", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Notlar</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <i className="pi pi-exclamation-triangle" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-slate-50 transition">İptal</button>
          <button type="submit" disabled={saving || !form.productName} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition hover:opacity-90" style={{ background: "var(--color-primary)" }}>
            {saving ? <><i className="pi pi-spin pi-spinner mr-2" />Kaydediliyor…</> : "Üretim Emri Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
