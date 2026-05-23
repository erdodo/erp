"use client";

import { useState, useEffect, useCallback } from "react";
import { PROCESS_STATUSES, TASK_PRIORITIES, getProcessStatus, getTaskPriority, type ProcessFlow } from "@/lib/project-types";

const EMPTY = { title: "", description: "", fromDept: "", toDept: "", priority: "medium", slaHours: 0, dueAt: "" };

export default function ProcessTrackingPage() {
  const [flows,   setFlows]   = useState<ProcessFlow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [statusF, setStatusF] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async (opts?: { pg?: number; st?: string }) => {
    setLoading(true);
    const p  = opts?.pg ?? page;
    const st = opts?.st ?? statusF;
    const r = await fetch(`/api/modules/process-tracking?page=${p}&status=${st}`);
    const d = await r.json() as { flows: ProcessFlow[]; total: number; pages: number };
    setFlows(d.flows); setTotal(d.total); setPages(d.pages); setLoading(false);
  }, [page, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/process-tracking", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, slaHours: form.slaHours||undefined, dueAt: form.dueAt||undefined }) });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/process-tracking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  const overdueCount = flows.filter((f) => f.dueAt && new Date(f.dueAt) < new Date() && f.status !== "completed" && f.status !== "cancelled").length;

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
            <i className="pi pi-sitemap text-white text-sm" />
          </div>
          <div><h1 className="font-bold text-foreground text-lg leading-tight">Süreç Takibi</h1>
            <p className="text-xs text-slate-400">Departmanlar arası süreç yönetimi</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
          style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Süreç
        </button>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <i className="pi pi-exclamation-circle text-red-500" /><strong>{overdueCount}</strong> sürecin SLA süresi aşıldı
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tümü" }, ...PROCESS_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
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
                <th className="py-3 px-5 text-left font-medium text-slate-500">Başlık</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Kaynak → Hedef</th>
                <th className="py-3 px-4 font-medium text-slate-500">Öncelik</th>
                <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">SLA</th>
                <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Termin</th>
                <th className="py-3 px-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {flows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400">
                  <i className="pi pi-sitemap text-4xl block mb-2 opacity-30" />Süreç kaydı yok
                </td></tr>
              ) : flows.map((f) => {
                const ps = getProcessStatus(f.status);
                const pr = getTaskPriority(f.priority);
                const isOverdue = f.dueAt && new Date(f.dueAt) < new Date() && f.status !== "completed" && f.status !== "cancelled";
                return (
                  <tr key={f.id} className={`border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition ${isOverdue ? "bg-red-50/30" : ""}`}>
                    <td className="py-3 px-5">
                      <p className="font-medium text-foreground">{f.title}</p>
                      {f._count?.comments !== undefined && f._count.comments > 0 && <p className="text-xs text-slate-400">{f._count.comments} yorum</p>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell">
                      {f.fromDept && f.toDept ? `${f.fromDept} → ${f.toDept}` : f.fromDept ?? f.toDept ?? "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.bg}`}>{pr.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <select value={f.status} onChange={(e) => changeStatus(f.id, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${ps.bg}`}>
                        {PROCESS_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{f.slaHours ? `${f.slaHours}s` : "—"}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {f.dueAt ? <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-slate-500"}`}>{new Date(f.dueAt).toLocaleDateString("tr-TR")}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3 px-2" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} süreç</span>
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
              <h2 className="font-semibold text-foreground">Yeni Süreç Akışı</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-foreground"><i className="pi pi-times" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Kaynak Dept.</label>
                  <input value={form.fromDept} onChange={(e) => setForm((p) => ({ ...p, fromDept: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Hedef Dept.</label>
                  <input value={form.toDept} onChange={(e) => setForm((p) => ({ ...p, toDept: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Öncelik</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">SLA (saat)</label>
                  <input type="number" min="0" value={form.slaHours} onChange={(e) => setForm((p) => ({ ...p, slaHours: Number(e.target.value) }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none text-right" /></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Termin</label>
                  <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.title} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Başlat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
