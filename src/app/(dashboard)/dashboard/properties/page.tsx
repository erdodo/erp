"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RentalProperty } from "@/lib/ops-types";

const PROP_TYPES = [
  { id: "office", label: "Ofis", icon: "pi-briefcase", color: "#3b82f6" },
  { id: "warehouse", label: "Depo / Antrepo", icon: "pi-box", color: "#0f766e" },
  { id: "retail", label: "Perakende Mağaza", icon: "pi-shop", color: "#ea580c" },
  { id: "factory", label: "Fabrika / Üretim", icon: "pi-cog", color: "#dc2626" },
  { id: "residential", label: "Konut / Daire", icon: "pi-home", color: "#8b5cf6" },
  { id: "land", label: "Arazi / Arsa", icon: "pi-map", color: "#22c55e" },
  { id: "other", label: "Diğer", icon: "pi-info-circle", color: "#64748b" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter States
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, active_lease, vacant

  // Form State
  const [form, setForm] = useState({
    name: "",
    type: "office",
    address: "",
    area: "",
    autoCreateStore: true,
    autoCreateWarehouse: true,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/modules/properties");
      if (r.ok) {
        const data = await r.json();
        setProperties(data.properties ?? []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      await fetch("/api/modules/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area: form.area ? Number(form.area) : undefined,
        }),
      });
      setShowModal(false);
      setForm({
        name: "",
        type: "office",
        address: "",
        area: "",
        autoCreateStore: true,
        autoCreateWarehouse: true,
      });
      await load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function toggle(id: string, isActive: boolean) {
    try {
      await fetch("/api/modules/properties", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu mülkü ve ilgili kira takibini silmek istediğinizden emin misiniz?")) return;
    try {
      await fetch("/api/modules/properties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  // Filter Logic
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "all" || p.type === typeFilter;

    let matchesStatus = true;
    const hasActiveContracts = !!(p._count && p._count.contracts > 0);
    if (statusFilter === "active_lease") {
      matchesStatus = hasActiveContracts;
    } else if (statusFilter === "vacant") {
      matchesStatus = !hasActiveContracts;
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate KPIs
  const totalCount = properties.length;
  const occupiedCount = properties.filter((p) => p._count && p._count.contracts > 0).length;
  const vacantCount = totalCount - occupiedCount;
  const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  // Total Rent Amount Sum (treating active contracts amounts in TRY equivalent)
  const totalRentAmount = properties.reduce((acc, p) => {
    if (p.contracts && p.contracts.length > 0) {
      const active = p.contracts.find((c) => c.isActive);
      if (active) acc += active.amount;
    }
    return acc;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="pi pi-building text-primary" style={{ color: "var(--color-primary)" }} /> Mülk & Kira Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Tüm mülklerinizi, sözleşmelerinizi, finansallarınızı ve bağlı modülleri tek bir yerde yönetin</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition shadow-sm"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus text-xs" /> Mülk Ekle
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Toplam Mülk", value: totalCount, icon: "pi-building", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20" },
          { label: "Doluluk Oranı", value: `%${occupancyRate}`, subtext: `${occupiedCount} mülk kirada`, icon: "pi-percentage", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" },
          { label: "Aylık Kira Geliri", value: `₺${totalRentAmount.toLocaleString("tr-TR")}`, subtext: "Aktif sözleşmeler", icon: "pi-wallet", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" },
          { label: "Boş Alanlar", value: vacantCount, subtext: "Yeni sözleşmeye hazır", icon: "pi-info-circle", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20" },
        ].map((kpi, idx) => (
          <div key={idx} className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
              {kpi.subtext && <p className="text-xs text-slate-500">{kpi.subtext}</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${kpi.color}`}>
              <i className={`pi ${kpi.icon} text-lg`} />
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mülk adı, adresi ile arayın..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="w-full sm:w-auto flex gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
            >
              <option value="all">Tüm Tipler</option>
              {PROP_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
          </div>
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active_lease">Kirada / Sözleşmeli</option>
              <option value="vacant">Boş / Sözleşmesiz</option>
            </select>
            <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Properties List/Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <i className="pi pi-spin pi-spinner text-4xl mb-2" style={{ color: "var(--color-primary)" }} />
          <p className="text-sm">Mülkler yükleniyor...</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border bg-white dark:bg-slate-900 rounded-3xl p-8">
          <i className="pi pi-building text-5xl text-slate-300 dark:text-slate-700 mb-4 block" />
          <p className="text-slate-500 font-semibold text-lg">Eşleşen mülk bulunamadı</p>
          <p className="text-slate-400 text-sm mt-1">Arama kriterlerinizi değiştirmeyi veya yeni bir mülk eklemeyi deneyin.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition"
            style={{ background: "var(--color-primary)" }}
          >
            İlk Mülkü Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((p) => {
            const typeConfig = PROP_TYPES.find((t) => t.id === p.type) || PROP_TYPES[PROP_TYPES.length - 1];
            const hasContracts = p._count && p._count.contracts > 0;
            const activeContract = p.contracts && p.contracts.find((c) => c.isActive);

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-border bg-white dark:bg-slate-900 hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Upper Body */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: typeConfig.color }}
                    >
                      <i className={`pi ${typeConfig.icon} text-base`} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        hasContracts ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400"
                      }`}>
                        {hasContracts ? "KİRADA" : "BOŞ"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        p.isActive ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
                      }`}>
                        {p.isActive ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground text-base group-hover:text-primary transition line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <span className="capitalize">{typeConfig.label}</span>
                      {p.area && <span>• {p.area.toLocaleString("tr-TR")} m²</span>}
                    </p>
                  </div>

                  {/* Badges / Integrations */}
                  <div className="flex flex-wrap gap-1.5">
                    {p.storeId && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 px-2 py-0.5 rounded-md font-medium">
                        <i className="pi pi-shop text-[9px]" /> Mağaza Bağlantısı
                      </span>
                    )}
                    {p.warehouseId && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-2 py-0.5 rounded-md font-medium">
                        <i className="pi pi-box text-[9px]" /> Depo Bağlantısı
                      </span>
                    )}
                  </div>

                  {/* Leasing Summary */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 text-xs space-y-1.5">
                    {hasContracts && activeContract ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Kiracı:</span>
                          <span className="text-foreground font-semibold">{activeContract.tenantName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Aylık Kira:</span>
                          <span className="text-foreground font-bold" style={{ color: "var(--color-primary)" }}>
                            {activeContract.amount.toLocaleString("tr-TR")} {activeContract.currency}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-1 text-slate-400 italic">
                        Kira sözleşmesi bulunmuyor
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-3.5 border-t border-border bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/properties/${p.id}`}
                    className="text-xs font-semibold flex items-center gap-1 hover:underline text-primary"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <i className="pi pi-external-link text-xs" /> Mülk Detay & Modüller
                  </Link>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggle(p.id, p.isActive)}
                      title={p.isActive ? "Pasife Al" : "Aktife Al"}
                      className="w-8 h-8 rounded-xl border border-border bg-white dark:bg-slate-950 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-900 transition text-slate-500"
                    >
                      <i className={`pi ${p.isActive ? "pi-eye-slash text-xs" : "pi-eye text-xs"}`} />
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      title="Sil"
                      className="w-8 h-8 rounded-xl border border-red-200 dark:border-red-950 bg-white dark:bg-slate-950 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/20 transition text-red-500"
                    >
                      <i className="pi pi-trash text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Property Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Yeni Mülk Tanımla</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
              >
                <i className="pi pi-times text-xs" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Mülk Adı *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="ör. Kadıköy Perakende Mağazası veya Maslak Depo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Tür *</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      {PROP_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Alan (m²)</label>
                  <input
                    type="number"
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    placeholder="ör. 185"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Adres</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Mülkün tam adresi..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Conditional Provisioning Checkboxes */}
              {form.type === "retail" && (
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 dark:border-orange-950/20 dark:bg-orange-950/10 p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoCreateStore"
                    checked={form.autoCreateStore}
                    onChange={(e) => setForm((f) => ({ ...f, autoCreateStore: e.target.checked }))}
                    className="mt-1 w-4.5 h-4.5 text-orange-600 rounded-sm cursor-pointer accent-orange-600 focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="autoCreateStore" className="text-xs font-bold text-orange-950 dark:text-orange-400 cursor-pointer">
                      Satış & Personel için Mağaza Modülü Bağla
                    </label>
                    <p className="text-[11px] text-orange-700 dark:text-orange-500">
                      Bu seçenek işaretlendiğinde, mülkle ilişkili yeni bir perakende mağazası otomatik oluşturulur; böylece satış işlemleri ve personel atamaları bu mülk detayında görüntülenebilir.
                    </p>
                  </div>
                </div>
              )}

              {form.type === "warehouse" && (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/50 dark:border-teal-950/20 dark:bg-teal-950/10 p-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoCreateWarehouse"
                    checked={form.autoCreateWarehouse}
                    onChange={(e) => setForm((f) => ({ ...f, autoCreateWarehouse: e.target.checked }))}
                    className="mt-1 w-4.5 h-4.5 text-teal-600 rounded-sm cursor-pointer accent-teal-600 focus:ring-0"
                  />
                  <div className="space-y-0.5">
                    <label htmlFor="autoCreateWarehouse" className="text-xs font-bold text-teal-950 dark:text-teal-400 cursor-pointer">
                      Stok & Envanter için Depo Modülü Bağla
                    </label>
                    <p className="text-[11px] text-teal-700 dark:text-teal-500">
                      Bu seçenek işaretlendiğinde, mülkle ilişkili yeni bir stok deposu otomatik oluşturulur; böylece deponun güncel stok durumları ve hareketleri bu mülk detayında görüntülenebilir.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4.5 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
              >
                İptal
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition shadow-sm"
                style={{ background: "var(--color-primary)" }}
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <i className="pi pi-spin pi-spinner" /> Kaydediliyor
                  </span>
                ) : (
                  "Mülkü Oluştur"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
