"use client";

import { useState, useEffect, useCallback } from "react";
import { FIELD_TYPES, getFieldType, type FieldService } from "@/lib/ops-types";
import { TASK_PRIORITIES, getTaskPriority } from "@/lib/project-types";

const EMPTY = { title: "", type: "repair", description: "", priority: "medium", scheduledAt: "" };
const SERVICE_STATUSES = [
  { id: "pending",     label: "Bekliyor",    bg: "bg-slate-100 text-slate-600"    },
  { id: "in_progress", label: "Devam",       bg: "bg-blue-100 text-blue-700"      },
  { id: "completed",   label: "Tamamlandı",  bg: "bg-emerald-100 text-emerald-700" },
  { id: "cancelled",   label: "İptal",       bg: "bg-red-100 text-red-700"        },
];

export default function FieldServicesPage() {
  const [services, setServices] = useState<FieldService[]>([]);
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
    const r = await fetch(`/api/modules/field-services?page=${p}&status=${st}`);
    const d = await r.json() as { services: FieldService[]; total: number; pages: number };
    setServices(d.services); setTotal(d.total); setPages(d.pages); setLoading(false);
  }, [page, statusF]);

  useEffect(() => { void load(); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setSaving(true);
    await fetch("/api/modules/field-services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, scheduledAt: form.scheduledAt||undefined }) });
    setSaving(false); setModal(false); setForm(EMPTY); await load();
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/modules/field-services", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await load();
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--color-primary)" }}><i className="pi pi-map-marker text-white text-sm" /></div>
          <div><h1 className="font-bold text-foreground text-lg">Saha Hizmetleri</h1><p className="text-xs text-slate-400">Servis, kurulum, bakım ve denetim</p></div>
        </div>
        <button onClick={() => { setForm(EMPTY); setModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>
          <i className="pi pi-plus text-xs" /> Yeni Servis
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: "", label: "Tümü" }, ...SERVICE_STATUSES.map((s) => ({ value: s.id, label: s.label }))].map((opt) => (
          <button key={opt.value} onClick={() => { setStatusF(opt.value); setPage(1); void load({ pg:1, st: opt.value }); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${statusF === opt.value ? "" : "border-border text-slate-500"}`}
            style={statusF === opt.value ? { borderColor: "var(--color-primary)", color: "var(--color-primary)", border: "1px solid" } : {}}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto relative">
          {loading && <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center"><i className="pi pi-spin pi-spinner text-2xl" style={{ color: "var(--color-primary)" }} /></div>}
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-slate-50 dark:bg-slate-800/50">
              <th className="py-3 px-5 text-left font-medium text-slate-500">Servis</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden sm:table-cell">Tür</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden md:table-cell">Müşteri</th>
              <th className="py-3 px-4 font-medium text-slate-500">Öncelik</th>
              <th className="py-3 px-4 font-medium text-slate-500">Durum</th>
              <th className="py-3 px-4 text-left font-medium text-slate-500 hidden lg:table-cell">Planlanan</th>
            </tr></thead>
            <tbody>
              {services.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-slate-400"><i className="pi pi-map-marker text-4xl block mb-2 opacity-30" />Kayıt yok</td></tr>
              : services.map((s) => {
                const ft = getFieldType(s.type);
                const pr = getTaskPriority(s.priority);
                const ss = SERVICE_STATUSES.find((x) => x.id === s.status) ?? SERVICE_STATUSES[0];
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5"><p className="font-medium text-foreground">{s.title}</p>{s.description && <p className="text-xs text-slate-400 truncate max-w-xs">{s.description}</p>}</td>
                    <td className="py-3 px-4 hidden sm:table-cell"><span className="flex items-center gap-1.5 text-sm" style={{ color: ft.color }}><i className={`pi ${ft.icon} text-xs`} />{ft.label}</span></td>
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{s.customer?.name ?? "—"}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.bg}`}>{pr.label}</span></td>
                    <td className="py-3 px-4">
                      <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value)} className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${ss.bg}`}>
                        {SERVICE_STATUSES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell">{s.scheduledAt ? new Date(s.scheduledAt).toLocaleDateString("tr-TR") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-slate-500">
          <span>{total} kayıt</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(page-1); void load({ pg: page-1 }); }} disabled={page<=1} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-left text-xs" /></button>
            <span className="px-3">{page} / {pages||1}</span>
            <button onClick={() => { setPage(page+1); void load({ pg: page+1 }); }} disabled={page>=pages} className="px-2 py-1 rounded hover:bg-slate-100 disabled:opacity-30"><i className="pi pi-chevron-right text-xs" /></button>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-foreground">Yeni Servis Talebi</h2><button onClick={() => setModal(false)} className="text-slate-400"><i className="pi pi-times" /></button></div>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Başlık *</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Tür</label>
                  <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {FIELD_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select></div>
                <div><label className="block text-xs font-medium text-slate-500 mb-1">Öncelik</label>
                  <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-white dark:bg-slate-900 text-foreground text-sm cursor-pointer">
                    {TASK_PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Planlanan Tarih</label><input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none" /></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label><textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none resize-none" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm">İptal</button>
              <button onClick={save} disabled={saving || !form.title} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-60" style={{ background: "var(--color-primary)" }}>
                {saving ? <i className="pi pi-spin pi-spinner" /> : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
