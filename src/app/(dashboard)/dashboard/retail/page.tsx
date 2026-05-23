"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RetailStore {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { transactions: number };
}

export default function RetailPage() {
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/modules/retail");
    const data = await r.json();
    setStores(data.stores ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    await fetch("/api/modules/retail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", address: "", phone: "" });
    setSaving(false);
    void load();
  }

  async function toggle(id: string, isActive: boolean) {
    await fetch("/api/modules/retail", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Bu mağazayı silmek istediğinizden emin misiniz?")) return;
    await fetch("/api/modules/retail", {
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
            <i className="pi pi-shop" style={{ color: "var(--color-primary)" }} /> Mağaza Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Perakende mağazalarınızı yönetin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus text-xs" /> Yeni Mağaza
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400"><i className="pi pi-spin pi-spinner text-3xl" /></div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <i className="pi pi-shop text-4xl text-slate-300 mb-3 block" />
          <p className="text-slate-500 font-medium">Henüz mağaza yok</p>
          <p className="text-slate-400 text-sm">İlk mağazanızı ekleyin</p>
          <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 rounded-xl text-white text-sm" style={{ background: "var(--color-primary)" }}>
            Mağaza Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-white dark:bg-slate-900 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--color-primary)" }}>
                  <i className="pi pi-shop" />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                  {s.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{s.name}</p>
                {s.address && <p className="text-xs text-slate-400 mt-0.5"><i className="pi pi-map-marker mr-1" />{s.address}</p>}
                {s.phone && <p className="text-xs text-slate-400"><i className="pi pi-phone mr-1" />{s.phone}</p>}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Link href={`/dashboard/retail/${s.id}`}
                  className="text-xs font-medium flex items-center gap-1 hover:underline"
                  style={{ color: "var(--color-primary)" }}>
                  <i className="pi pi-arrow-right text-xs" /> Detay ({s._count.transactions} işlem)
                </Link>
                <div className="flex gap-1">
                  <button onClick={() => toggle(s.id, s.isActive)} title={s.isActive ? "Pasif yap" : "Aktif yap"}
                    className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-slate-100 transition text-slate-500 text-xs">
                    <i className={`pi ${s.isActive ? "pi-eye-slash" : "pi-eye"}`} />
                  </button>
                  <button onClick={() => remove(s.id)} title="Sil"
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
            <h2 className="text-lg font-bold text-foreground">Yeni Mağaza</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Mağaza Adı *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ör. Kadıköy Mağazası" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2" style={{ "--tw-ring-color": "var(--color-primary)" } as React.CSSProperties} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Adres</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="ör. Kadıköy, İstanbul" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Telefon</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="ör. 0212 000 00 00" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.name} className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50 transition" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
