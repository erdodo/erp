"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Employee, Department } from "@/lib/hr-types";

const EMPTY = { employeeNo: "", name: "", email: "", phone: "", departmentId: "", storeId: "", position: "", salary: 0, currency: "TRY", hireDate: "" };

export default function EmployeesPage() {
  const [employees,   setEmployees]   = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stores,      setStores]      = useState<{ id: string; name: string }[]>([]);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [deptF,       setDeptF]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [drawer,      setDrawer]      = useState<"new" | Employee | null>(null);
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (opts?: { pg?: number; s?: string; d?: string }) => {
    setLoading(true);
    const p = opts?.pg ?? page; const q = opts?.s ?? search; const d = opts?.d ?? deptF;
    const params = new URLSearchParams({ page: String(p), search: q, departmentId: d });
    const r = await fetch(`/api/modules/hr/employees?${params}`);
    const data = await r.json() as { employees: Employee[]; total: number; pages: number; departments: Department[]; stores?: { id: string; name: string }[] };
    setEmployees(data.employees); setTotal(data.total); setPages(data.pages);
    if (data.departments.length) setDepartments(data.departments);
    if (data.stores) setStores(data.stores);
    setLoading(false);
  }, [page, search, deptF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => { setPage(1); void load({ pg:1, s: search }); }, 300); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    function h(e: KeyboardEvent) { if ((e.target as HTMLElement).matches("input,textarea,select")) return; if (e.key === "Escape") setDrawer(null); }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  function openEdit(emp: Employee) {
    setForm({
      employeeNo: emp.employeeNo,
      name: emp.name,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      departmentId: emp.departmentId ?? "",
      storeId: emp.storeId ?? "",
      position: emp.position ?? "",
      salary: emp.salary ?? 0,
      currency: emp.currency,
      hireDate: emp.hireDate ? emp.hireDate.slice(0, 10) : "",
    });
    setDrawer(emp);
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      email: form.email || undefined,
      phone: form.phone || undefined,
      departmentId: form.departmentId || undefined,
      storeId: form.storeId || undefined,
      position: form.position || undefined,
      hireDate: form.hireDate || undefined,
    };
    if (typeof drawer === "string") {
      await fetch("/api/modules/hr/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else if (drawer !== null) {
      await fetch("/api/modules/hr/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, ...payload }) });
    }
    setSaving(false); setDrawer(null); await load();
  }

  async function deleteEmp(id: string) {
    if (!confirm("Çalışanı silmek istiyor musunuz?")) return;
    await fetch("/api/modules/hr/employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-id-card text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">Çalışanlar</h1>
            <p className="text-xs text-slate-400">Sicil, departman, pozisyon yönetimi</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setDrawer("new"); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Çalışan
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, sicil, pozisyon ara…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm focus:outline-none" />
        </div>
        {departments.length > 0 && (
          <select value={deptF} onChange={(e) => { setDeptF(e.target.value); setPage(1); void load({ pg:1, d: e.target.value }); }}
            className="px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-sm cursor-pointer text-foreground focus:outline-none">
            <option value="">Tüm Departmanlar</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Sicil</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">Ad Soyad</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Departman</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Çalıştığı Konum</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Pozisyon</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">İşe Giriş</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <i className="pi pi-id-card text-4xl block mb-2 opacity-30" />
                  {search || deptF ? "Filtreye uyan çalışan yok" : "Henüz çalışan eklenmedi"}
                </td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.id}
                  onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; openEdit(emp); }}
                  className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer">
                  <td className="py-3 px-5 font-mono text-xs font-semibold text-foreground">{emp.employeeNo}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-foreground">{emp.name}</p>
                    {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                    {emp.vehicles && emp.vehicles.length > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 px-2 py-0.5 rounded-md font-medium">
                        <i className="pi pi-car text-[9px]" /> {emp.vehicles[0].plate}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{emp.department?.name ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{emp.store?.name ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">{emp.position ?? "—"}</td>
                  <td className="py-3 px-4 text-slate-400 hidden lg:table-cell">{emp.hireDate ? new Date(emp.hireDate).toLocaleDateString("tr-TR") : "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{emp.isActive ? "Aktif" : "Pasif"}</span>
                  </td>
                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(emp)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition"><i className="pi pi-pencil text-xs" /></button>
                      <button onClick={() => deleteEmp(emp.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition"><i className="pi pi-trash text-xs" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} çalışan</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-40 flex justify-end" onClick={() => setDrawer(null)}>
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900">
              <h2 className="font-semibold text-foreground">{typeof drawer === "string" ? "Yeni Çalışan" : "Çalışanı Düzenle"}</h2>
              <button onClick={() => setDrawer(null)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Sicil No *</label>
                  <input value={form.employeeNo} onChange={(e) => setForm((p) => ({ ...p, employeeNo: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none font-mono" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad *</label>
                  <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">E-posta</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Departman</label>
                  <select value={form.departmentId} onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Çalıştığı Mülk / Konum</label>
                  <select value={form.storeId} onChange={(e) => setForm((p) => ({ ...p, storeId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    <option value="">— Seçin —</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Pozisyon</label>
                  <input value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Maaş</label>
                  <input type="number" min="0" value={form.salary} onChange={(e) => setForm((p) => ({ ...p, salary: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">İşe Giriş</label>
                  <input type="date" value={form.hireDate} onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              {typeof drawer !== "string" && (
                <div className="flex items-center gap-2">
                  <button onClick={() => fetch("/api/modules/hr/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: drawer.id, isActive: !drawer.isActive }) }).then(() => { setDrawer(null); void load(); })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${drawer.isActive ? "border-red-200 text-red-600 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>
                    {drawer.isActive ? "Pasife Al" : "Aktife Al"}
                  </button>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDrawer(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
                <button onClick={save} disabled={saving || !form.employeeNo || !form.name} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60 hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
                  {saving ? <i className="pi pi-spin pi-spinner" /> : typeof drawer === "string" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
