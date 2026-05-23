"use client";

import { useState, useEffect } from "react";

interface RentalProperty {
  id: string;
  name: string;
  type: string;
  address: string | null;
  area: number | null;
  isActive: boolean;
  createdAt: string;
  _count: { contracts: number };
}

const TYPE_LABELS: Record<string, string> = {
  office: "Ofis", warehouse: "Depo", store: "Mağaza", apartment: "Daire", land: "Arazi", other: "Diğer",
};

interface SimpleStore { id: string; name: string }

export default function RentalPage() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<SimpleStore[]>([]);
  const [form, setForm] = useState({ name: "", type: "office", address: "", area: "", storeId: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/modules/rental");
    const data = await r.json();
    setProperties(data.properties ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    fetch("/api/modules/retail").then((r) => r.ok ? r.json() : { stores: [] }).then((d: { stores: SimpleStore[] }) => setStores(d.stores ?? []));
  }, []);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/modules/rental", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, area: form.area ? Number(form.area) : undefined, storeId: form.storeId || undefined }),
    });
    setShowModal(false);
    setForm({ name: "", type: "office", address: "", area: "", storeId: "" });
    setSaving(false);
    void load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/modules/rental", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Bu mülkü silmek istediğinizden emin misiniz?")) return;
    await fetch("/api/modules/rental", {
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
            <i className="pi pi-home" style={{ color: "var(--color-primary)" }} /> Kira Yönetimi (Mülkler)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Kiralık mülklerinizi ve sözleşmelerinizi yönetin</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Mülk
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400"><i className="pi pi-spin pi-spinner text-3xl" /></div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <i className="pi pi-home text-4xl text-slate-300 mb-3 block" />
          <p className="text-slate-500 font-medium">Henüz mülk yok</p>
          <p className="text-slate-400 text-sm">Kiralık mülklerinizi ekleyin ve sözleşmelerini takip edin</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl text-white text-sm" style={{ background: "var(--color-primary)" }}>
            Mülk Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--color-primary)" }}>
                  <i className="pi pi-home" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{TYPE_LABELS[p.type] ?? p.type}</p>
                {p.address && <p className="text-xs text-slate-400 mt-0.5"><i className="pi pi-map-marker mr-1" />{p.address}</p>}
                {p.area && <p className="text-xs text-slate-400">{p.area.toLocaleString("tr-TR")} m²</p>}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-slate-400">{p._count.contracts} sözleşme</span>
                <div className="flex gap-1">
                  <button onClick={() => toggle(p.id, p.isActive)} title={p.isActive ? "Pasif yap" : "Aktif yap"}
                    className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-slate-100 transition text-slate-500 text-xs">
                    <i className={`pi ${p.isActive ? "pi-eye-slash" : "pi-eye"}`} />
                  </button>
                  <button onClick={() => remove(p.id)} title="Sil"
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
            <h2 className="text-lg font-bold text-foreground">Yeni Mülk</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Mülk Adı *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ör. Merkez Ofis" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Tür</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Alan (m²)</label>
                  <input type="number" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    placeholder="ör. 250" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Adres</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="ör. Levent, İstanbul" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
              {stores.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">İlgili Mağaza</label>
                  <select value={form.storeId} onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none">
                    <option value="">Mağaza seçin (isteğe bağlı)</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
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
