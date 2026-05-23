"use client";

import { useState, useEffect } from "react";

interface VirtualSaleChannel {
  id: string;
  name: string;
  platform: string | null;
  url: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { orders: number };
}

const PLATFORM_ICONS: Record<string, string> = {
  shopify: "pi-shopping-bag", woocommerce: "pi-box", hepsiburada: "pi-tag",
  trendyol: "pi-tag", n11: "pi-tag", amazon: "pi-tag", etsy: "pi-tag",
};

export default function VirtualSalesPage() {
  const [channels, setChannels] = useState<VirtualSaleChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "", url: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/modules/virtual-sales");
    const data = await r.json();
    setChannels(data.channels ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/modules/virtual-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", platform: "", url: "" });
    setSaving(false);
    void load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/modules/virtual-sales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Bu satış kanalını silmek istediğinizden emin misiniz?")) return;
    await fetch("/api/modules/virtual-sales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void load();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-globe" style={{ color: "var(--color-primary)" }} /> Sanal Satış Kanalları
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">E-ticaret ve online satış kanallarını yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Kanal Ekle
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400"><i className="pi pi-spin pi-spinner text-3xl" /></div>
      ) : channels.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <i className="pi pi-globe text-4xl text-slate-300 mb-3 block" />
          <p className="text-slate-500 font-medium">Henüz satış kanalı yok</p>
          <p className="text-slate-400 text-sm">Shopify, Trendyol, N11 gibi kanallarınızı ekleyin</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl text-white text-sm" style={{ background: "var(--color-primary)" }}>
            Kanal Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((ch) => (
            <div key={ch.id} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--color-primary)" }}>
                  <i className={`pi ${PLATFORM_ICONS[ch.platform?.toLowerCase() ?? ""] ?? "pi-globe"}`} />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ch.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {ch.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{ch.name}</p>
                {ch.platform && <p className="text-xs text-slate-400 mt-0.5 capitalize">{ch.platform}</p>}
                {ch.url && (
                  <a href={ch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5">
                    {ch.url}
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-slate-400">{ch._count.orders} sipariş</span>
                <div className="flex gap-1">
                  <button onClick={() => toggle(ch.id, ch.isActive)} title={ch.isActive ? "Pasif yap" : "Aktif yap"}
                    className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-slate-100 transition text-slate-500 text-xs">
                    <i className={`pi ${ch.isActive ? "pi-eye-slash" : "pi-eye"}`} />
                  </button>
                  <button onClick={() => remove(ch.id)} title="Sil"
                    className="w-7 h-7 rounded-lg border border-red-200 flex items-center justify-center hover:bg-red-50 transition text-red-500 text-xs">
                    <i className="pi pi-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Yeni Satış Kanalı</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Kanal Adı *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ör. Trendyol Mağazası" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Platform</label>
                <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                  <option value="">Seçin...</option>
                  {["shopify", "woocommerce", "trendyol", "hepsiburada", "n11", "amazon", "etsy", "diğer"].map((p) => (
                    <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">URL</label>
                <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
