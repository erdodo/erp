"use client";

import { useState, useEffect, useCallback } from "react";
import { LEAVE_TYPES, LEAVE_STATUSES, getLeaveType, getLeaveStatus, type LeaveRequest, type Employee } from "@/lib/hr-types";

const EMPTY = { employeeId: "", leaveType: "annual", startDate: "", endDate: "", days: 1, reason: "" };

export default function LeavePage() {
  const [requests,  setRequests]  = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total,     setTotal]     = useState(0);
  const [pages,     setPages]     = useState(1);
  const [page,      setPage]      = useState(1);
  const [statusF,   setStatusF]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async (opts?: { pg?: number; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const st = opts?.st ?? statusF;
    const [rr, er] = await Promise.all([
      fetch(`/api/modules/hr/leave?page=${p}&status=${st}`),
      fetch("/api/modules/hr/employees?limit=200"),
    ]);
    const rd = await rr.json() as { requests: LeaveRequest[]; total: number; pages: number };
    const ed = await er.json() as { employees: Employee[] };
    setRequests(rd.requests); setTotal(rd.total); setPages(rd.pages); setEmployees(ed.employees);
    setLoading(false);
  }, [page, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/hr/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/hr/leave", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-calendar text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">İzin Yönetimi</h1>
            <p className="text-xs text-slate-400">Talep, onay ve bakiye takibi</p></div>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> İzin Talebi
        </button>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <i className="pi pi-clock text-amber-500" /><strong>{pendingCount}</strong> bekleyen izin talebi onay bekliyor
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tümü" }, ...LEAVE_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
          <button key={opt.value} onClick={() => { setStatusF(opt.value); setPage(1); void load({ pg:1, st: opt.value }); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${statusF === opt.value ? "border-primary text-primary" : "border-border text-slate-500 hover:border-slate-400"}`}
            style={statusF === opt.value ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" } : {}}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
                <th className="py-3 px-5 text-left font-medium text-slate-500">Çalışan</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500">İzin Türü</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Tarih Aralığı</th>
                <th className="py-3 px-4 text-right font-medium text-slate-500 hidden sm:table-cell">Gün</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-slate-400">
                  <i className="pi pi-calendar text-4xl block mb-2 opacity-30" />Henüz izin talebi yok
                </td></tr>
              ) : requests.map((r) => {
                const lt = getLeaveType(r.leaveType);
                const ls = getLeaveStatus(r.status);
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5">
                      <p className="font-medium text-foreground">{r.employee?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.employee?.employeeNo}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: lt.color }}>
                        <i className={`pi ${lt.icon} text-xs`} />{lt.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                      {new Date(r.startDate).toLocaleDateString("tr-TR")} — {new Date(r.endDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-foreground hidden sm:table-cell">{r.days}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ls.bg}`}>
                        <i className={`pi ${ls.icon} text-xs`} />{ls.label}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {r.status === "pending" && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => changeStatus(r.id, "approved")} className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs hover:bg-emerald-200 transition">Onayla</button>
                          <button onClick={() => changeStatus(r.id, "rejected")} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs hover:bg-red-200 transition">Reddet</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} talep</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Yeni İzin Talebi</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Çalışan *</label>
                <select value={form.employeeId} onChange={(e) => setForm((p) => ({ ...p, employeeId: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                  <option value="">— Seçin —</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">İzin Türü</label>
                  <select value={form.leaveType} onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {LEAVE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Gün Sayısı</label>
                  <input type="number" min="1" value={form.days} onChange={(e) => setForm((p) => ({ ...p, days: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlangıç *</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Bitiş *</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Neden</label>
                <textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-50 transition">İptal</button>
              <button onClick={save} disabled={saving || !form.employeeId || !form.startDate || !form.endDate} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
