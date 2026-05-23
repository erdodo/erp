"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { SalesProduct } from "@/lib/sales-types";

interface StockMovement { id: string; type: string; quantity: number; reason: string | null; reference: string | null; createdAt: string }
interface ProductDetail extends SalesProduct { movements: StockMovement[] }

const MOV_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  sale:             { label: "Satış",          color: "#ef4444", icon: "pi-minus-circle" },
  reserve:          { label: "Rezerve",        color: "#f59e0b", icon: "pi-lock" },
  reserve_release:  { label: "Rezerve İptal",  color: "#6366f1", icon: "pi-lock-open" },
  purchase:         { label: "Satın Alma",     color: "#10b981", icon: "pi-plus-circle" },
  adjustment:       { label: "Düzeltme",       color: "#3b82f6", icon: "pi-pencil" },
  return:           { label: "İade",           color: "#f97316", icon: "pi-undo" },
};

export default function ProductDetailPage() {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const [data,      setData]    = useState<ProductDetail | null>(null);
  const [loading,   setLoading] = useState(true);
  const [editMode,  setEditMode] = useState(false);
  const [editForm,  setEditForm] = useState<Partial<SalesProduct>>({});
  const [saving,    setSaving]  = useState(false);
  const [adjForm,   setAdjForm] = useState({ quantity: 0, reason: "", type: "adjustment" });
  const [showAdj,   setShowAdj] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/modules/sales/products/${id}`);
    if (r.ok) {
      const d = await r.json() as ProductDetail;
      setData(d);
      setEditForm({ name: d.name, sku: d.sku ?? "", category: d.category ?? "", unit: d.unit, cost: d.cost ?? 0, currency: d.currency, minQuantity: d.minQuantity });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function saveEdit() {
    setSaving(true);
    await fetch(`/api/modules/sales/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm),
    });
    await load(); setEditMode(false); setSaving(false);
  }

  async function saveAdjustment() {
    if (!adjForm.quantity || !adjForm.reason) return;
    await fetch(`/api/modules/sales/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: (data?.quantity ?? 0) + adjForm.quantity }),
    });
    setShowAdj(false); setAdjForm({ quantity: 0, reason: "", type: "adjustment" });
    await load();
  }

  async function deleteProduct() {
    if (!confirm("Bu ürünü silmek istiyor musunuz?")) return;
    await fetch(`/api/modules/sales/products/${id}`, { method: "DELETE" });
    router.push("/dashboard/sales/products");
  }

  if (loading) return <div className="flex items-center justify-center py-20"><i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} /></div>;
  if (!data)   return <div className="text-center py-20 text-slate-400">Ürün bulunamadı<br /><Link href="/dashboard/sales/products" style={{ color: "var(--color-primary)" }}>← Geri</Link></div>;

  const isLow = data.quantity <= data.minQuantity;

  return (
    <div className="pb-8 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
              {data.sku && <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{data.sku}</span>}
              {isLow && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium flex items-center gap-1"><i className="pi pi-exclamation-triangle text-xs" />Kritik Stok</span>}
            </div>
            {data.category && <p className="text-sm text-slate-400">{data.category}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${editMode ? "border-primary text-primary" : "border-border text-slate-500 hover:bg-slate-50"}`}
              style={editMode ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
              <i className="pi pi-pencil text-xs" /> Düzenle
            </button>
            <button onClick={deleteProduct} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-red-200 text-red-600 hover:bg-red-50 transition">
              <i className="pi pi-trash text-xs" />
            </button>
          </div>
        </div>

        {/* Stock display */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Mevcut Stok",   value: `${data.quantity} ${data.unit}`,                        color: isLow ? "#ef4444" : "#10b981" },
            { label: "Min. Stok",     value: `${data.minQuantity} ${data.unit}`,                    color: "#f59e0b" },
            { label: "Birim Maliyet", value: data.cost != null ? `${data.cost} ${data.currency}` : "—", color: "#6366f1" },
            { label: "Para Birimi",   value: data.currency,                                          color: "#3b82f6" },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl border border-border">
              <p className="text-xs text-slate-400 mb-0.5">{item.label}</p>
              <p className="font-bold" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {editMode && (
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
          <h3 className="font-semibold text-foreground mb-4">Ürünü Düzenle</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(["name","sku","category","unit","cost","minQuantity"] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{f}</label>
                <input type={["cost","minQuantity"].includes(f) ? "number" : "text"} min={0} step={f === "cost" ? "0.01" : "1"}
                  value={String(editForm[f] ?? "")} onChange={(e) => setEditForm((p) => ({ ...p, [f]: ["cost","minQuantity"].includes(f) ? Number(e.target.value) : e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
            <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Stock Adjustment */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Stok Hareketi</h3>
          <button onClick={() => setShowAdj(!showAdj)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-dashed border-border text-slate-500 hover:bg-slate-50 transition">
            <i className="pi pi-plus text-xs" /> Stok Düzelt
          </button>
        </div>

        {showAdj && (
          <div className="mb-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Miktar (+ giriş / - çıkış)</label>
                <input type="number" value={adjForm.quantity} onChange={(e) => setAdjForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Neden *</label>
                <input value={adjForm.reason} onChange={(e) => setAdjForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Örn: Sayım düzeltme"
                  className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdj(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-white transition">İptal</button>
              <button onClick={saveAdjustment} disabled={!adjForm.quantity || !adjForm.reason} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>Kaydet</button>
            </div>
          </div>
        )}

        {data.movements.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Henüz stok hareketi yok</p>
        ) : (
          <div className="space-y-2">
            {data.movements.map((m) => {
              const cfg = MOV_LABELS[m.type] ?? { label: m.type, color: "#94a3b8", icon: "pi-circle" };
              return (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${cfg.color}20` }}>
                    <i className={`pi ${cfg.icon} text-xs`} style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{m.reason ?? cfg.label}</p>
                    {m.reference && <p className="text-xs text-slate-400 font-mono">{m.reference}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-sm ${m.quantity > 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity} {data.unit}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
