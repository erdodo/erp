"use client";

import { useState, useEffect, useCallback } from "react";
import { FIELD_TYPES, getFieldType, type FieldService } from "@/lib/ops-types";
import { TASK_PRIORITIES, getTaskPriority } from "@/lib/project-types";

const EMPTY = { title: "", type: "repair", description: "", priority: "medium", scheduledAt: "", customerId: "", employeeId: "", vehicleId: "" };
const SERVICE_STATUSES = [
  { id: "pending",     label: "Bekliyor",    bg: "bg-slate-100 text-slate-600 border border-slate-200"    },
  { id: "in_progress", label: "Devam Ediyor", bg: "bg-blue-100 text-blue-700 border border-blue-200"      },
  { id: "completed",   label: "Tamamlandı",  bg: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  { id: "cancelled",   label: "İptal Edildi", bg: "bg-red-100 text-red-700 border border-red-200"        },
];

export default function FieldServicesPage() {
  const [services, setServices] = useState<FieldService[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; brand: string | null; model: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [statusF,  setStatusF]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async (opts?: { pg?: number; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const st = opts?.st ?? statusF;
    try {
      const r = await fetch(`/api/modules/field-services?page=${p}&status=${st}`);
      if (r.ok) {
        const d = await r.json() as {
          services: FieldService[];
          total: number;
          pages: number;
          employees: { id: string; name: string }[];
          vehicles: { id: string; plate: string; brand: string | null; model: string | null }[];
          customers: { id: string; name: string }[];
        };
        setServices(d.services ?? []);
        setTotal(d.total ?? 0);
        setPages(d.pages ?? 1);
        if (d.employees) setEmployees(d.employees);
        if (d.vehicles) setVehicles(d.vehicles);
        if (d.customers) setCustomers(d.customers);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/modules/field-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          scheduledAt: form.scheduledAt || undefined,
          customerId: form.customerId || undefined,
          employeeId: form.employeeId || undefined,
          vehicleId: form.vehicleId || undefined,
        })
      });
      setModal(false);
      setForm(EMPTY);
      await load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function changeStatus(id: string, status: string) {
    try {
      await fetch("/api/modules/field-services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm animate-pulse" style={{ background: "var(--color-primary, #0891b2)" }}>
            <i className="pi pi-map-marker text-base" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-xl leading-tight">Saha Hizmetleri (Servis)</h1>
            <p className="text-xs text-slate-400">Kurulum, teknik bakım, tamir, denetim ve saha satış faaliyetlerinin takibi</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-95 active:scale-[0.99] transition shadow-sm"
          style={{ background: "var(--color-primary, #0891b2)" }}
        >
          <i className="pi pi-plus text-xs" /> Yeni Servis Talebi
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tüm Talepler" }, ...SERVICE_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setStatusF(opt.value); setPage(1); void load({ pg: 1, st: opt.value }); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
              statusF === opt.value
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm"
                : "border-border text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid List Table */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 z-10 flex items-center justify-center">
              <i className="pi pi-spin pi-spinner text-3xl text-primary" style={{ color: "var(--color-primary, #0891b2)" }} />
            </div>
          )}
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold">
                <th className="py-3.5 px-5">Servis / Talep Detayı</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Hizmet Türü</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Görevli & Araç</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Öncelik</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Planlanan Zaman</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <i className="pi pi-map-marker text-5xl block mb-3 opacity-20" />
                    Kayıtlı saha servis talebi bulunamadı.
                  </td>
                </tr>
              ) : (
                services.map((s) => {
                  const ft = getFieldType(s.type);
                  const pr = getTaskPriority(s.priority);
                  const ss = SERVICE_STATUSES.find((x) => x.id === s.status) ?? SERVICE_STATUSES[0];
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-sm">{s.title}</p>
                          {s.description && <p className="text-xs text-slate-400 max-w-sm line-clamp-1">{s.description}</p>}
                          {s.customer && (
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              🏢 Müşteri: {s.customer.name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${ft.color}15`, color: ft.color }}>
                          <i className={`pi ${ft.icon} text-[10px]`} />
                          {ft.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell text-xs">
                        <div className="flex flex-col gap-1">
                          {s.employee ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded-md w-fit">
                              👤 {s.employee.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">👤 Atanmamış</span>
                          )}
                          {s.vehicle ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 px-2 py-0.5 rounded-md w-fit font-mono text-[11px]">
                              🚘 {s.vehicle.plate}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">🚘 Araç Yok</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${pr.bg}`}>
                          {pr.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={s.status}
                          onChange={(e) => changeStatus(s.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border-0 cursor-pointer focus:outline-none ${ss.bg}`}
                        >
                          {SERVICE_STATUSES.map((x) => (
                            <option key={x.id} value={x.id}>{x.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 hidden lg:table-cell">
                        {s.scheduledAt ? (
                          <div className="space-y-0.5 font-medium">
                            <p className="text-slate-700 dark:text-slate-300">
                              {new Date(s.scheduledAt).toLocaleDateString("tr-TR")}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(s.scheduledAt).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border text-xs text-slate-500 font-semibold">
          <span>Toplam {total} hizmet talebi</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2.5 py-1 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30 transition"><i className="pi pi-chevron-left text-[10px]" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2.5 py-1 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30 transition"><i className="pi pi-chevron-right text-[10px]" /></button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-border animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Yeni Servis Talebi Oluştur</h2>
              <button onClick={() => setModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition">
                <i className="pi pi-times text-xs" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Başlık *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="ör. Klima Arıza Tamiri veya Mağaza Satış Ziyareti"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Hizmet Türü</label>
                  <div className="relative">
                    <select
                      value={form.type}
                      onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Öncelik</label>
                  <div className="relative">
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Görevli Personel</label>
                  <div className="relative">
                    <select
                      value={form.employeeId}
                      onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="">— Personel Atayın —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <i className="pi pi-user absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Servis Aracı</label>
                  <div className="relative">
                    <select
                      value={form.vehicleId}
                      onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="">— Araç Atayın —</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>{v.plate} {v.brand ? `(${v.brand})` : ""}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">İlişkili Müşteri</label>
                  <div className="relative">
                    <select
                      value={form.customerId}
                      onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="">— Müşteri Seçin —</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <i className="pi pi-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Planlanan Tarih & Saat</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Açıklama / İş Detayı</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Yapılacak saha hizmetinin veya ziyaretin detayları..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-end gap-3">
              <button
                onClick={() => setModal(false)}
                className="px-4.5 py-2.5 rounded-xl border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
              >
                İptal
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title}
                className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition shadow-sm"
                style={{ background: "var(--color-primary, #0891b2)" }}
              >
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <i className="pi pi-spin pi-spinner" /> Kaydediliyor
                  </span>
                ) : (
                  "Talebi Oluştur"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
