"use client";

import { useState, useEffect, useCallback } from "react";
import { VEHICLE_STATUSES, getVehicleStatus, type Vehicle, type Expense, type FuelRecord } from "@/lib/ops-types";

const EMPTY = {
  plate: "",
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  fuelType: "gasoline",
  insuranceExpiry: "",
  inspectionExpiry: "",
  notes: "",
  driverId: "",
};

const FUELS = ["gasoline", "diesel", "lpg", "electric", "hybrid"];
const FUEL_LABELS: Record<string, string> = {
  gasoline: "Benzin",
  diesel: "Dizel",
  lpg: "LPG",
  electric: "Elektrik",
  hybrid: "Hibrit",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<"new" | Vehicle | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  // Tab State inside Drawer
  const [activeTab, setActiveTab] = useState<"general" | "fuel" | "expenses" | "addExpense">("general");

  // Dynamic Vehicle Details (Fuel & Expenses)
  const [details, setDetails] = useState<{ fuelRecords: FuelRecord[]; expenses: Expense[] }>({
    fuelRecords: [],
    expenses: [],
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    type: "fuel" as "fuel" | "maintenance" | "inspection" | "other",
    amount: "",
    currency: "TRY",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    liters: "",
    station: "",
    odometer: "",
  });
  const [savingExpense, setSavingExpense] = useState(false);

  const today = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/modules/fleet");
      if (r.ok) {
        const d = await r.json() as { vehicles: Vehicle[]; employees?: { id: string; name: string }[] };
        setVehicles(d.vehicles);
        if (d.employees) setEmployees(d.employees);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const loadDetails = useCallback(async (vId: string) => {
    setLoadingDetails(true);
    try {
      const r = await fetch(`/api/modules/fleet/expense?vehicleId=${vId}`);
      if (r.ok) {
        const d = await r.json() as { fuelRecords: FuelRecord[]; expenses: Expense[] };
        setDetails(d);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingDetails(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Load details dynamically when editing a vehicle
  useEffect(() => {
    if (drawer && typeof drawer !== "string") {
      void loadDetails(drawer.id);
      setActiveTab("general");
    }
  }, [drawer, loadDetails]);

  function openEdit(v: Vehicle) {
    setForm({
      plate: v.plate,
      brand: v.brand ?? "",
      model: v.model ?? "",
      year: v.year ?? new Date().getFullYear(),
      fuelType: v.fuelType,
      insuranceExpiry: v.insuranceExpiry ? v.insuranceExpiry.slice(0, 10) : "",
      inspectionExpiry: v.inspectionExpiry ? v.inspectionExpiry.slice(0, 10) : "",
      notes: v.notes ?? "",
      driverId: v.driverId ?? "",
    });
    setDrawer(v);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      year: form.year || undefined,
      insuranceExpiry: form.insuranceExpiry || undefined,
      inspectionExpiry: form.inspectionExpiry || undefined,
      driverId: form.driverId || null,
    };
    try {
      if (typeof drawer === "string") {
        await fetch("/api/modules/fleet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (drawer !== null) {
        await fetch("/api/modules/fleet", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: drawer.id, ...payload }),
        });
      }
      setDrawer(null);
      await load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function saveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!drawer || typeof drawer === "string") return;
    if (!expenseForm.amount || !expenseForm.date) return;

    setSavingExpense(true);
    try {
      const payload = {
        vehicleId: drawer.id,
        type: expenseForm.type,
        amount: Number(expenseForm.amount),
        currency: expenseForm.currency,
        date: expenseForm.date,
        notes: expenseForm.notes || undefined,
        liters: expenseForm.liters ? Number(expenseForm.liters) : undefined,
        station: expenseForm.station || undefined,
        odometer: expenseForm.odometer ? Number(expenseForm.odometer) : undefined,
      };

      const r = await fetch("/api/modules/fleet/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        // Reset expense form
        setExpenseForm({
          type: "fuel",
          amount: "",
          currency: "TRY",
          date: new Date().toISOString().slice(0, 10),
          notes: "",
          liters: "",
          station: "",
          odometer: "",
        });
        // Switch tab to history
        setActiveTab(expenseForm.type === "fuel" ? "fuel" : "expenses");
        // Reload details and list
        await loadDetails(drawer.id);
        await load();
      }
    } catch (err) {
      console.error(err);
    }
    setSavingExpense(false);
  }

  async function del(id: string) {
    if (!confirm("Aracı silmek istiyor musunuz?")) return;
    try {
      await fetch("/api/modules/fleet", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  const isExpiring = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return (d.getTime() - today.getTime()) / 86400000 <= 30 && d >= today;
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < today;
  };

  const expiringCount = vehicles.filter(
    (v) =>
      isExpiring(v.insuranceExpiry) ||
      isExpiring(v.inspectionExpiry) ||
      isExpired(v.insuranceExpiry) ||
      isExpired(v.inspectionExpiry)
  ).length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
            style={{ background: "var(--color-primary)" }}
          >
            <i className="pi pi-car text-sm" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg">Filo Yönetimi</h1>
            <p className="text-xs text-slate-400">Araçlar, yakıt kayıtları, sürücüler ve masraf takibi</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY);
            setDrawer("new");
            setActiveTab("general");
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}
        >
          <i className="pi pi-plus text-xs" /> Yeni Araç
        </button>
      </div>

      {/* Warnings Banner */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <i className="pi pi-exclamation-triangle text-amber-500 animate-pulse" />
          <span>
            <strong>{expiringCount}</strong> araçta sigorta veya muayene bitiş uyarısı mevcut!
          </span>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <i className="pi pi-spin pi-spinner text-3xl" style={{ color: "var(--color-primary)" }} />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 border border-border border-dashed rounded-2xl">
            <i className="pi pi-car text-5xl block mb-3 opacity-20" />
            Henüz kayıtlı araç bulunmuyor. Yeni Araç butonuyla başlayın.
          </div>
        ) : (
          vehicles.map((v) => {
            const st = getVehicleStatus(v.status);
            const insWarn = isExpired(v.insuranceExpiry) || isExpiring(v.insuranceExpiry);
            const muaWarn = isExpired(v.inspectionExpiry) || isExpiring(v.inspectionExpiry);

            return (
              <div
                key={v.id}
                className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button,select")) return;
                  openEdit(v);
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground font-mono text-base">{v.plate}</p>
                      <p className="text-xs text-slate-400">
                        {[v.brand, v.model, v.year].filter(Boolean).join(" ")}
                      </p>
                      {v.driver && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 px-2 py-0.5 rounded-md">
                          <i className="pi pi-user text-[9px]" /> {v.driver.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.bg}`}>{st.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void del(v.id);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-red-500 transition"
                      >
                        <i className="pi pi-trash text-xs" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Yakıt Türü</span>
                      <span className="font-semibold text-foreground">{FUEL_LABELS[v.fuelType] ?? v.fuelType}</span>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${insWarn ? "text-red-500 font-bold" : ""}`}>
                      <span className={insWarn ? "text-red-500" : "text-slate-400 font-medium"}>Sigorta Bitiş</span>
                      <span>{v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString("tr-TR") : "—"}</span>
                    </div>
                    <div className={`flex items-center justify-between text-xs ${muaWarn ? "text-red-500 font-bold" : ""}`}>
                      <span className={muaWarn ? "text-red-500" : "text-slate-400 font-medium"}>Muayene Bitiş</span>
                      <span>{v.inspectionExpiry ? new Date(v.inspectionExpiry).toLocaleDateString("tr-TR") : "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Card footer indicator */}
                <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>{v._count?.fuelRecords ?? 0} yakıt kaydı</span>
                  <span>{v._count?.expenses ?? 0} masraf</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Advanced Drawer Panel */}
      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div
            className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="space-y-0.5">
                <h2 className="font-bold text-foreground text-base">
                  {typeof drawer === "string" ? "Yeni Araç Ekle" : `Araç Detayları — ${drawer.plate}`}
                </h2>
                {typeof drawer !== "string" && (
                  <p className="text-xs text-slate-400">{drawer.brand} {drawer.model}</p>
                )}
              </div>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground">
                <i className="pi pi-times" />
              </button>
            </div>

            {/* Drawer Tabs (only for existing vehicles) */}
            {typeof drawer !== "string" && (
              <div className="flex border-b border-border bg-slate-50/50 dark:bg-slate-950/20 px-2 shrink-0">
                {[
                  { id: "general", label: "Genel Bilgiler", icon: "pi-info-circle" },
                  { id: "fuel", label: "Yakıt Geçmişi", icon: "pi-tablet" },
                  { id: "expenses", label: "Giderler & Muayene", icon: "pi-wallet" },
                  { id: "addExpense", label: "Yeni Gider Ekle", icon: "pi-plus-circle" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold border-b-2 transition whitespace-nowrap ${
                      activeTab === t.id
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-foreground"
                    }`}
                    style={activeTab === t.id ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}
                  >
                    <i className={`pi ${t.icon} text-[10px]`} /> {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: General Info */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Plaka *</label>
                      <input
                        value={form.plate}
                        onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono font-bold"
                        placeholder="ör. 34 AB 1234"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Marka</label>
                      <input
                        value={form.brand}
                        onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                        placeholder="ör. Ford"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Model</label>
                      <input
                        value={form.model}
                        onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                        placeholder="ör. Transit"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Yıl</label>
                      <input
                        type="number"
                        min="1990"
                        max="2030"
                        value={form.year}
                        onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none text-right"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Yakıt Türü</label>
                      <div className="relative">
                        <select
                          value={form.fuelType}
                          onChange={(e) => setForm((p) => ({ ...p, fuelType: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                        >
                          {FUELS.map((f) => (
                            <option key={f} value={f}>{FUEL_LABELS[f]}</option>
                          ))}
                        </select>
                        <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                      </div>
                    </div>

                    {/* Driver Assignment Select */}
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Atanan Sürücü (Çalışan)</label>
                      <div className="relative">
                        <select
                          value={form.driverId}
                          onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                        >
                          <option value="">— Sürücü Ata (Seçilmemiş) —</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                        <i className="pi pi-user absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Sigorta Bitiş</label>
                      <input
                        type="date"
                        value={form.insuranceExpiry}
                        onChange={(e) => setForm((p) => ({ ...p, insuranceExpiry: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Muayene Bitiş</label>
                      <input
                        type="date"
                        value={form.inspectionExpiry}
                        onChange={(e) => setForm((p) => ({ ...p, inspectionExpiry: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {typeof drawer !== "string" && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Araç Durumu</label>
                      <div className="relative">
                        <select
                          value={drawer.status}
                          onChange={(e) =>
                            fetch("/api/modules/fleet", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: drawer.id, status: e.target.value }),
                            }).then(() => void load())
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm cursor-pointer appearance-none"
                        >
                          {VEHICLE_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Notlar</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none resize-none"
                      placeholder="Araç hakkında genel notlar..."
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Fuel History */}
              {activeTab === "fuel" && typeof drawer !== "string" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <i className="pi pi-tablet" /> Yakıt Dolum Geçmişi
                  </h3>
                  {loadingDetails ? (
                    <div className="text-center py-10"><i className="pi pi-spin pi-spinner text-xl text-primary" /></div>
                  ) : details.fuelRecords.length === 0 ? (
                    <p className="text-center py-10 text-xs text-slate-400">Yakıt kaydı bulunmuyor. "Yeni Gider Ekle" sekmesinden yakıt harcaması girin.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-border text-slate-500 font-bold">
                            <th className="p-3">Tarih</th>
                            <th className="p-3 text-right">Litre</th>
                            <th className="p-3 text-right">Km (Odo)</th>
                            <th className="p-3">İstasyon</th>
                            <th className="p-3 text-right">Tutar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {details.fuelRecords.map((fr) => (
                            <tr key={fr.id} className="hover:bg-slate-50/50">
                              <td className="p-3 text-slate-500">{new Date(fr.filledAt).toLocaleDateString("tr-TR")}</td>
                              <td className="p-3 text-right font-medium">{fr.liters} L</td>
                              <td className="p-3 text-right font-mono text-slate-400">{fr.odometer ? `${fr.odometer.toLocaleString("tr-TR")} km` : "—"}</td>
                              <td className="p-3 text-slate-600 line-clamp-1">{fr.station || "—"}</td>
                              <td className="p-3 text-right font-extrabold text-foreground">{fr.cost.toLocaleString("tr-TR")} {fr.currency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Expenses History */}
              {activeTab === "expenses" && typeof drawer !== "string" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                    <i className="pi pi-wallet" /> Muayene, Bakım ve Diğer Masraflar
                  </h3>
                  {loadingDetails ? (
                    <div className="text-center py-10"><i className="pi pi-spin pi-spinner text-xl text-primary" /></div>
                  ) : details.expenses.length === 0 ? (
                    <p className="text-center py-10 text-xs text-slate-400">Diğer masraf kaydı bulunmuyor. "Yeni Gider Ekle" sekmesinden bakım/muayene gideri girin.</p>
                  ) : (
                    <div className="space-y-3">
                      {details.expenses.map((exp) => (
                        <div key={exp.id} className="rounded-xl border border-border p-3.5 bg-slate-50/40 dark:bg-slate-900/30 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground text-xs">{exp.title}</p>
                            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                              <span>Vade: {new Date(exp.expenseDate).toLocaleDateString("tr-TR")}</span>
                              <span>•</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${STATUS_COLORS[exp.status] ?? "bg-slate-100"}`}>
                                {exp.status === "approved" ? "ONAYLANDI" : exp.status === "pending" ? "ONAY BEKLİYOR" : "REDDEDİLDİ"}
                              </span>
                            </p>
                            {exp.notes && <p className="text-[10px] text-slate-500 italic mt-1">"{exp.notes}"</p>}
                          </div>
                          <span className="text-sm font-extrabold text-foreground shrink-0">{exp.amount.toLocaleString("tr-TR")} {exp.currency}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Record Expense */}
              {activeTab === "addExpense" && typeof drawer !== "string" && (
                <form onSubmit={saveExpense} className="space-y-4">
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-950/20 dark:bg-indigo-950/10 p-3.5 text-xs text-indigo-700 dark:text-indigo-400 flex items-start gap-2">
                    <i className="pi pi-info-circle mt-0.5 shrink-0" />
                    <span>Buraya girdiğiniz tüm masraflar otomatik olarak <b>Finans - Gider</b> modülü ile uyumlu çalışır ve veritabanında onaylanmış resmi gider kalemi olarak kaydedilir.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Harcama Türü *</label>
                      <div className="relative">
                        <select
                          value={expenseForm.type}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, type: e.target.value as any }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                        >
                          <option value="fuel">Benzin / Yakıt Alımı</option>
                          <option value="maintenance">Araç Bakım / Onarım</option>
                          <option value="inspection">Araç Muayene Ücreti</option>
                          <option value="other">Diğer Masraf</option>
                        </select>
                        <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Tutar *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none text-right"
                        placeholder="ör. 2450"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Döviz</label>
                      <div className="relative">
                        <select
                          value={expenseForm.currency}
                          onChange={(e) => setExpenseForm((f) => ({ ...f, currency: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                        >
                          {["TRY", "USD", "EUR"].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Harcama Tarihi *</label>
                      <input
                        type="date"
                        required
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                      />
                    </div>

                    {/* Conditional Fuel Fields */}
                    {expenseForm.type === "fuel" && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Yakıt Miktarı (Litre)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={expenseForm.liters}
                            onChange={(e) => setExpenseForm((f) => ({ ...f, liters: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none text-right"
                            placeholder="ör. 45.2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Kilometre (Km)</label>
                          <input
                            type="number"
                            value={expenseForm.odometer}
                            onChange={(e) => setExpenseForm((f) => ({ ...f, odometer: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none text-right"
                            placeholder="ör. 124500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">İstasyon Adı</label>
                          <input
                            value={expenseForm.station}
                            onChange={(e) => setExpenseForm((f) => ({ ...f, station: e.target.value }))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none"
                            placeholder="ör. Shell Beşiktaş"
                          />
                        </div>
                      </>
                    )}

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Açıklama / Notlar</label>
                      <textarea
                        value={expenseForm.notes}
                        onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-foreground text-sm focus:outline-none resize-none"
                        placeholder="Harcamaya dair ekstra notlar..."
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingExpense || !expenseForm.amount || !expenseForm.date}
                      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.99] transition shadow-sm"
                      style={{ background: "var(--color-primary)" }}
                    >
                      {savingExpense ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <i className="pi pi-spin pi-spinner" /> Kaydediliyor...
                        </span>
                      ) : (
                        "Gideri Masraf Olarak Kaydet"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Drawer Footer (for general fields) */}
            {activeTab === "general" && (
              <div className="px-5 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawer(null)}
                  className="flex-1 sm:flex-none px-4.5 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || !form.plate}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-95 transition"
                  style={{ background: "var(--color-primary)" }}
                >
                  {saving ? (
                    <i className="pi pi-spin pi-spinner" />
                  ) : typeof drawer === "string" ? (
                    "Aracı Ekle"
                  ) : (
                    "Değişiklikleri Kaydet"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
