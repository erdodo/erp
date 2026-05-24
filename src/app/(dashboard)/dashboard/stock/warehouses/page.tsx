"use client";

import { useState, useEffect, useCallback } from "react";
import type { Warehouse } from "@/lib/inventory-types";

const INITIAL_FORM = {
  name: "",
  location: "",
  propertyId: "",
  autoCreateProperty: false,
  propertyOwnershipType: "owned_by_us"
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [properties, setProperties] = useState<{ id: string; name: string; warehouseId: string | null }[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [form,       setForm]       = useState(INITIAL_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/modules/stock/warehouses");
      if (r.ok) {
        const d = await r.json() as { warehouses: Warehouse[]; properties?: { id: string; name: string; warehouseId: string | null }[] };
        setWarehouses(d.warehouses ?? []);
        if (d.properties) setProperties(d.properties);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editId) {
        await fetch("/api/modules/stock/warehouses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editId,
            name: form.name,
            location: form.location,
            propertyId: form.propertyId || null,
          }),
        });
      } else {
        await fetch("/api/modules/stock/warehouses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            location: form.location,
            propertyId: form.propertyId || undefined,
            autoCreateProperty: form.autoCreateProperty,
            propertyOwnershipType: form.propertyOwnershipType,
          }),
        });
      }
      setSaving(false);
      setShowForm(false);
      setEditId(null);
      setForm(INITIAL_FORM);
      await load();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }

  async function toggleActive(w: Warehouse) {
    try {
      await fetch("/api/modules/stock/warehouses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: w.id, isActive: !w.isActive }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteWarehouse(id: string) {
    if (!confirm("Bu depoyu silmek istiyor musunuz?")) return;
    try {
      await fetch("/api/modules/stock/warehouses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  function startEdit(w: Warehouse) {
    setEditId(w.id);
    const assocProp = w.rentals && w.rentals[0];
    setForm({
      name: w.name,
      location: w.location ?? "",
      propertyId: assocProp ? assocProp.id : "",
      autoCreateProperty: false,
      propertyOwnershipType: "owned_by_us",
    });
    setShowForm(true);
  }

  // Filter properties eligible to be linked (either unlinked or already linked to current edited warehouse)
  const eligibleProperties = properties.filter(
    (p) => !p.warehouseId || p.warehouseId === editId
  );

  return (
    <div className="pb-8 space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm text-slate-500 font-semibold">{warehouses.length} aktif depo envanter noktası</p>
          <p className="text-xs text-slate-400">Depolarınız mülk listenizle eş zamanlı olarak senkronize edilir</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(INITIAL_FORM); setShowForm(!showForm); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition shadow-sm"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus text-xs" /> Yeni Depo Ekle
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-slate-900 p-5 space-y-4 animate-in fade-in-50 duration-150">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <i className="pi pi-plus-circle text-primary" style={{ color: "var(--color-primary)" }} />
            {editId ? "Depo Bilgilerini Düzenle" : "Yeni Depo & Mülk Ekle"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Depo Adı *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Örn: Ana Depo, B Blok veya Maslak Lojistik"
                className="w-full px-3.5 py-2 rounded-xl border border-border text-foreground text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Konum / Adres</label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="Kat, oda veya tam açık adres"
                className="w-full px-3.5 py-2 rounded-xl border border-border text-foreground text-sm focus:outline-none"
              />
            </div>

            {/* Property Linking Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Mülk & Kira Modülü İlişkisi</label>
              <div className="relative">
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm((p) => ({ ...p, propertyId: e.target.value, autoCreateProperty: false }))}
                  disabled={form.autoCreateProperty}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer appearance-none disabled:opacity-50"
                >
                  <option value="">— Mevcut Bir Mülk Seçin (Opsiyonel) —</option>
                  {eligibleProperties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <i className="pi pi-building absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
              </div>
            </div>

            {/* Automatic Property Provisioning */}
            {!editId && !form.propertyId && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50/40 dark:border-teal-950/20 dark:bg-teal-950/10 p-4 flex flex-col gap-3 col-span-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoCreateProperty"
                    checked={form.autoCreateProperty}
                    onChange={(e) => setForm((f) => ({ ...f, autoCreateProperty: e.target.checked }))}
                    className="mt-1 w-4.5 h-4.5 text-teal-600 rounded-sm cursor-pointer accent-teal-600 focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="autoCreateProperty" className="text-xs font-bold text-teal-950 dark:text-teal-400 cursor-pointer">
                      Aynı İsimle Mülk & Kira Paneline de Ekle (Senkronize Mülkiyet)
                    </label>
                    <p className="text-[11px] text-teal-700 dark:text-teal-500">
                      Bu seçenek işaretlendiğinde, bu depo için Mülk modülünde de otomatik bir kayıt oluşturulur. Finans, kiralama, kira ödemeleri ve kontrat takibi tek noktadan yapılabilir.
                    </p>
                  </div>
                </div>

                {form.autoCreateProperty && (
                  <div className="pl-7 space-y-1.5 animate-in slide-in-from-top-1 duration-100">
                    <label className="block text-[10px] font-bold text-teal-900 uppercase tracking-wider">Mülkiyet / Kullanım Durumu *</label>
                    <div className="relative max-w-sm">
                      <select
                        value={form.propertyOwnershipType}
                        onChange={(e) => setForm((f) => ({ ...f, propertyOwnershipType: e.target.value }))}
                        className="w-full px-3 py-1.5 rounded-lg border border-teal-200 bg-white text-teal-950 text-xs cursor-pointer focus:outline-none"
                      >
                        <option value="owned_by_us">Kendi Kullanımımızda (Öz Mülk)</option>
                        <option value="rented_from_landlord">Kiraladığımız Mülk (Biz Kiracıyız)</option>
                        <option value="leased_to_tenant">Kiraya Verdiğimiz Mülk (Biz Kiralayanız)</option>
                      </select>
                      <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 text-xs pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2.5 justify-end border-t border-border pt-4">
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4.5 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-50 text-sm font-semibold transition">İptal</button>
            <button onClick={save} disabled={saving || !form.name} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition shadow-sm" style={{ background: "var(--color-primary)" }}>
              {saving ? <i className="pi pi-spin pi-spinner" /> : editId ? "Güncelle" : "Depoyu Ekle"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16"><i className="pi pi-spin pi-spinner text-3xl text-primary" style={{ color: "var(--color-primary)" }} /></div>
        ) : warehouses.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <i className="pi pi-building text-5xl block mb-3 opacity-20" />
            Henüz envanter deposu eklenmedi.
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                <th className="py-3.5 px-5">Depo ve Mülk Senkronizasyonu</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Konum</th>
                <th className="py-3.5 px-4 text-right font-medium hidden md:table-cell">Toplam Ürün</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 text-right pr-5">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {warehouses.map((w) => {
                const assocProp = w.rentals && w.rentals[0];
                return (
                  <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-sm">{w.name}</p>
                        {assocProp ? (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            assocProp.ownershipType === "owned_by_us"
                              ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                              : assocProp.ownershipType === "rented_from_landlord"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30"
                          }`}>
                            🏢 Mülk: {assocProp.name} ({
                              assocProp.ownershipType === "owned_by_us" ? "Öz Mülk" :
                              assocProp.ownershipType === "rented_from_landlord" ? "Kiraladığımız" : "Kirada"
                            })
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold block">🏢 Bağımsız envanter deposu</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 font-medium hidden sm:table-cell">{w.location ?? "—"}</td>
                    <td className="py-4 px-4 text-right font-bold text-slate-700 dark:text-slate-300 hidden md:table-cell">{w._count?.stockItems ?? 0}</td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => toggleActive(w)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition border border-transparent ${
                          w.isActive
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {w.isActive ? "Aktif" : "Pasif"}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => startEdit(w)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition" title="Düzenle"><i className="pi pi-pencil text-xs" /></button>
                        <button onClick={() => deleteWarehouse(w.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition" title="Sil"><i className="pi pi-trash text-xs" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
